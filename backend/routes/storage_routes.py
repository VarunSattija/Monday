"""Key-value storage API for the Acuity SDK.
Equivalent to monday.storage. Scoped per user (or per workspace if API key is workspace-scoped).
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Body
from routes.api_key_routes import resolve_api_key

router = APIRouter(prefix="/v1/storage", tags=["sdk-storage"])

# Defer DB import to avoid circular
def _db():
    from database import get_db
    return get_db()


def _scope(current: dict) -> dict:
    """Compute scope filter — workspace-scoped key uses workspace_id, otherwise user_id."""
    api_meta = current.get("_api_key", {})
    if api_meta.get("scope") == "workspace" and api_meta.get("workspace_id"):
        return {"scope": "workspace", "workspace_id": api_meta["workspace_id"]}
    return {"scope": "user", "user_id": current["id"]}


@router.get("/{key}")
async def get_value(key: str, current_user: dict = Depends(resolve_api_key)):
    db = _db()
    doc = await db.app_storage.find_one({"key": key, **_scope(current_user)})
    if not doc:
        return {"key": key, "value": None}
    return {"key": key, "value": doc.get("value"), "updated_at": doc.get("updated_at")}


@router.put("/{key}")
async def put_value(
    key: str,
    body: dict = Body(...),
    current_user: dict = Depends(resolve_api_key),
):
    """Body: {"value": <any-json>}. Value can be string, number, dict, list."""
    if "value" not in body:
        raise HTTPException(status_code=400, detail="'value' is required")
    db = _db()
    scope = _scope(current_user)
    await db.app_storage.update_one(
        {"key": key, **scope},
        {
            "$set": {
                "key": key,
                "value": body["value"],
                "updated_at": datetime.utcnow(),
                **scope,
            }
        },
        upsert=True,
    )
    return {"key": key, "value": body["value"], "ok": True}


@router.delete("/{key}")
async def delete_value(key: str, current_user: dict = Depends(resolve_api_key)):
    db = _db()
    await db.app_storage.delete_one({"key": key, **_scope(current_user)})
    return {"key": key, "deleted": True}


@router.get("")
async def list_keys(current_user: dict = Depends(resolve_api_key)):
    db = _db()
    docs = await db.app_storage.find(_scope(current_user)).to_list(500)
    return [
        {"key": d["key"], "updated_at": d.get("updated_at")}
        for d in docs
    ]
