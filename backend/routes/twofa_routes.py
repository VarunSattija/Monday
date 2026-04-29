"""Two-Factor Authentication (TOTP) routes."""
import base64
import io
import secrets
import pyotp
import qrcode
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Body
from auth import get_current_user, verify_password, create_access_token
from database import get_db

router = APIRouter(prefix="/auth/2fa", tags=["2fa"])
db = get_db()

ISSUER = "Acuity Professional"
CHALLENGE_EXPIRY_MIN = 5  # 2FA challenge token validity


def _generate_backup_codes(n: int = 10) -> list:
    """Generate n random backup codes (8 chars each)."""
    return [secrets.token_hex(4).upper() for _ in range(n)]


def _qr_data_url(provisioning_uri: str) -> str:
    img = qrcode.make(provisioning_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@router.post("/setup")
async def setup_2fa(current_user: dict = Depends(get_current_user)):
    """Generate a TOTP secret and QR code. User must verify before enabling."""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA already enabled. Disable first to re-setup.")

    secret = pyotp.random_base32()
    provisioning_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user["email"],
        issuer_name=ISSUER,
    )
    # Store as PENDING secret (not yet enabled)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"totp_secret_pending": secret}},
    )
    return {
        "secret": secret,
        "qr_code": _qr_data_url(provisioning_uri),
        "issuer": ISSUER,
        "account": user["email"],
    }


@router.post("/enable")
async def enable_2fa(
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """Verify a TOTP code against the pending secret to enable 2FA."""
    code = (body.get("code") or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")

    user = await db.users.find_one({"id": current_user["id"]})
    pending = user.get("totp_secret_pending")
    if not pending:
        raise HTTPException(status_code=400, detail="Run /setup first to generate a secret")

    if not pyotp.TOTP(pending).verify(code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code. Try again.")

    backup_codes = _generate_backup_codes()
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "totp_secret": pending,
                "totp_enabled": True,
                "totp_backup_codes": backup_codes,
                "totp_enabled_at": datetime.utcnow(),
            },
            "$unset": {"totp_secret_pending": ""},
        },
    )
    return {
        "enabled": True,
        "backup_codes": backup_codes,
        "message": "Two-factor authentication enabled. Save these backup codes — they will not be shown again.",
    }


@router.post("/disable")
async def disable_2fa(
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """Disable 2FA. Requires current password and a valid TOTP code."""
    password = (body.get("password") or "").strip()
    code = (body.get("code") or "").strip()

    user = await db.users.find_one({"id": current_user["id"]})
    if not user.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    if not password or not verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect password")

    secret = user.get("totp_secret")
    backups = user.get("totp_backup_codes", [])
    if not (
        (code and pyotp.TOTP(secret).verify(code, valid_window=1))
        or (code and code.upper() in backups)
    ):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")

    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {"totp_enabled": False},
            "$unset": {
                "totp_secret": "",
                "totp_secret_pending": "",
                "totp_backup_codes": "",
            },
        },
    )
    return {"enabled": False, "message": "Two-factor authentication disabled"}


@router.get("/status")
async def get_2fa_status(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    return {
        "enabled": bool(user.get("totp_enabled")),
        "backup_codes_remaining": len(user.get("totp_backup_codes") or []),
    }


@router.post("/regenerate-backup-codes")
async def regenerate_backup_codes(
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    code = (body.get("code") or "").strip()
    user = await db.users.find_one({"id": current_user["id"]})
    if not user.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    if not code or not pyotp.TOTP(user["totp_secret"]).verify(code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    new_codes = _generate_backup_codes()
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"totp_backup_codes": new_codes}},
    )
    return {"backup_codes": new_codes}


@router.post("/verify-challenge")
async def verify_2fa_challenge(body: dict = Body(...)):
    """Step 2 of login. Body: {challenge_token, code}.
    Returns final access_token + user."""
    from auth import decode_token
    from models import User

    challenge_token = (body.get("challenge_token") or "").strip()
    code = (body.get("code") or "").strip()
    if not challenge_token or not code:
        raise HTTPException(status_code=400, detail="challenge_token and code required")

    payload = decode_token(challenge_token)
    if payload.get("typ") != "2fa_challenge":
        raise HTTPException(status_code=401, detail="Invalid challenge token")

    user = await db.users.find_one({"id": payload.get("sub")})
    if not user or not user.get("totp_enabled"):
        raise HTTPException(status_code=401, detail="Invalid challenge")

    secret = user.get("totp_secret")
    backups = user.get("totp_backup_codes", [])
    valid_totp = pyotp.TOTP(secret).verify(code, valid_window=1)
    valid_backup = code.upper() in backups
    if not (valid_totp or valid_backup):
        raise HTTPException(status_code=401, detail="Invalid 2FA code")

    # If backup code used, consume it
    if valid_backup and not valid_totp:
        backups.remove(code.upper())
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"totp_backup_codes": backups}},
        )

    # Issue real access token
    access_token = create_access_token(data={"sub": user["id"], "email": user["email"]})
    user_pub = User(**{k: v for k, v in user.items() if k not in (
        "_id", "hashed_password", "totp_secret", "totp_secret_pending",
        "totp_backup_codes", "totp_enabled_at"
    )})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_pub.dict(),
        "used_backup_code": valid_backup and not valid_totp,
    }


def make_2fa_challenge_token(user_id: str) -> str:
    """Helper used by /auth/login to issue a short-lived 2FA challenge token."""
    return create_access_token(
        data={"sub": user_id, "typ": "2fa_challenge"},
        expires_delta=timedelta(minutes=CHALLENGE_EXPIRY_MIN),
    )
