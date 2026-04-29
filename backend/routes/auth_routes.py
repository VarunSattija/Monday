from fastapi import APIRouter, HTTPException, Depends, status
from models import UserCreate, UserLogin, User, UserInDB
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from database import get_db
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])
db = get_db()


@router.post("/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        avatar=f"https://ui-avatars.com/api/?name={user_data.name}&background=F9A825&color=fff"
    )
    
    user_in_db = UserInDB(
        **user.dict(),
        hashed_password=get_password_hash(user_data.password)
    )
    
    await db.users.insert_one(user_in_db.dict())
    
    # Create default workspace for new user
    from models import Workspace
    default_workspace = Workspace(
        name=f"{user_data.name}'s Workspace",
        description="Your main workspace",
        owner_id=user.id,
        member_ids=[user.id]
    )
    await db.workspaces.insert_one(default_workspace.dict())
    
    # Auto-add user to Acuity-Professional team
    import uuid as _uuid
    team = await db.teams.find_one({"name": "Acuity-Professional"})
    if not team:
        team = {
            "id": str(_uuid.uuid4()),
            "name": "Acuity-Professional",
            "description": "Default team for Acuity Professional users",
            "members": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.teams.insert_one(team)
    
    is_first = len(team.get("members", [])) == 0
    
    # Check if this email was previously invited
    was_invited = any(
        m.get("email") == user_data.email and m.get("status") == "invited"
        for m in team.get("members", [])
    )
    
    if was_invited:
        # Update existing invited entry to active
        await db.teams.update_one(
            {"name": "Acuity-Professional", "members.email": user_data.email, "members.status": "invited"},
            {"$set": {
                "members.$.status": "active",
                "members.$.user_id": user.id,
                "members.$.name": user_data.name,
                "members.$.avatar": user.avatar,
                "members.$.joined_at": datetime.utcnow()
            }}
        )
    else:
        # Add new member
        new_member = {
            "user_id": user.id,
            "name": user_data.name,
            "email": user_data.email,
            "role": "admin" if is_first else "member",
            "status": "active",
            "joined_at": datetime.utcnow(),
            "avatar": user.avatar
        }
        await db.teams.update_one(
            {"name": "Acuity-Professional"},
            {"$push": {"members": new_member}}
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.dict()
    }


@router.post("/select-company")
async def select_company(
    company_name: str,
    current_user: dict = Depends(get_current_user)
):
    # Add user to selected company team
    import uuid
    from datetime import datetime
    
    team = await db.teams.find_one({"name": company_name})
    
    if not team:
        # Create the team
        team = {
            "id": str(uuid.uuid4()),
            "name": company_name,
            "description": f"Team for {company_name}",
            "members": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.teams.insert_one(team)
    
    # Get user details
    user_data = await db.users.find_one({"id": current_user["id"]})
    
    # Check if user already in team
    member_exists = any(
        member["user_id"] == current_user["id"]
        for member in team.get("members", [])
    )
    
    if not member_exists:
        new_member = {
            "user_id": current_user["id"],
            "name": user_data.get("name", "Unknown"),
            "email": user_data.get("email"),
            "role": "admin" if len(team.get("members", [])) == 0 else "member",
            "status": "active",
            "joined_at": datetime.utcnow(),
            "avatar": user_data.get("avatar")
        }
        await db.teams.update_one(
            {"id": team["id"] if isinstance(team, dict) else team.get("id")},
            {"$push": {"members": new_member}}
        )
    
    return {"message": "Company selected successfully", "company": company_name}


@router.post("/login")
async def login(credentials: UserLogin):
    # Find user
    user_data = await db.users.find_one({"email": credentials.email})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    user_in_db = UserInDB(**{k: v for k, v in user_data.items() if k in UserInDB.__fields__})
    
    # Verify password
    if not verify_password(credentials.password, user_in_db.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # If 2FA enabled, return a challenge token instead of the access token
    if user_data.get("totp_enabled"):
        from routes.twofa_routes import make_2fa_challenge_token
        challenge = make_2fa_challenge_token(user_in_db.id)
        return {
            "requires_2fa": True,
            "challenge_token": challenge,
        }

    # Create access token
    access_token = create_access_token(
        data={"sub": user_in_db.id, "email": user_in_db.email}
    )
    
    user = User(**{k: v for k, v in user_in_db.dict().items() if k != 'hashed_password'})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.dict()
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": current_user["id"]})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = User(**{k: v for k, v in user_data.items() if k != 'hashed_password'})
    return user.dict()


@router.delete("/users/delete-by-domain")
async def delete_users_by_domain(domain: str):
    # Delete all users with specified email domain
    result = await db.users.delete_many({
        "email": {"$regex": f"@{domain}$", "$options": "i"}
    })
    
    return {
        "message": f"Deleted {result.deleted_count} users with domain @{domain}",
        "count": result.deleted_count
    }


@router.post("/forgot-password")
async def forgot_password(body: dict):
    import uuid as _uuid
    import os
    from routes.email_helper import send_email

    email = body.get("email", "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = await db.users.find_one({"email": email})
    if not user:
        # Don't reveal if email exists — always return success
        return {"message": "If the email exists, a reset link has been sent"}

    # Generate reset token
    token = str(_uuid.uuid4())
    await db.password_resets.insert_one({
        "token": token,
        "user_id": user["id"],
        "email": email,
        "created_at": datetime.utcnow(),
        "used": False,
    })

    app_url = os.environ.get("APP_URL", "https://acuity-team-hub.preview.emergentagent.com")
    reset_url = f"{app_url}/reset-password/{token}"

    subject = "Reset your Acuity Professional password"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Acuity Professional</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">Password Reset</h2>
            <p style="color: #4b5563; line-height: 1.6;">
                We received a request to reset your password. Click the button below to set a new password.
            </p>
            <a href="{reset_url}" style="display: inline-block; background: #f97316; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                Reset Password
            </a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                If you didn't request this, you can safely ignore this email. This link expires in 1 hour.
            </p>
        </div>
    </div>
    """
    await send_email(email, subject, html)

    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(body: dict):
    token = body.get("token", "").strip()
    new_password = body.get("new_password", "").strip()

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new_password required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    reset_doc = await db.password_resets.find_one({"token": token, "used": False})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    # Check token age (1 hour)
    from datetime import timedelta
    if datetime.utcnow() - reset_doc["created_at"] > timedelta(hours=1):
        raise HTTPException(status_code=400, detail="Reset link has expired")

    # Update password
    hashed = get_password_hash(new_password)
    await db.users.update_one(
        {"id": reset_doc["user_id"]},
        {"$set": {"hashed_password": hashed}}
    )

    # Mark token as used
    await db.password_resets.update_one({"token": token}, {"$set": {"used": True}})

    return {"message": "Password reset successfully"}
