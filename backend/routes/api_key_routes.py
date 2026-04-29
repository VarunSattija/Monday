import secrets
import hashlib
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from typing import List, Optional
from models import APIKey, APIKeyCreate
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api-keys", tags=["api-keys"])
db = get_db()


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def _generate_key() -> tuple[str, str]:
    """Returns (full_key, prefix). Full key is shown ONCE to the user."""
    raw = secrets.token_urlsafe(32)
    full = f"ak_{raw}"
    prefix = full[:14] + "..."
    return full, prefix


def _serialize_key(doc: dict) -> dict:
    """Strip _id and key_hash from response."""
    if not doc:
        return doc
    return {k: v for k, v in doc.items() if k not in ("_id", "key_hash")}


async def resolve_api_key(authorization: Optional[str] = Header(None)) -> dict:
    """Dependency that authenticates via 'Bearer ak_...' API key header.
    Returns a user dict similar to get_current_user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing API key")
    token = authorization.replace("Bearer ", "").strip()
    if not token.startswith("ak_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    key_hash = _hash_key(token)
    key_doc = await db.api_keys.find_one({"key_hash": key_hash, "revoked": False})
    if not key_doc:
        raise HTTPException(status_code=401, detail="Invalid or revoked API key")

    user = await db.users.find_one({"id": key_doc["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="API key owner not found")

    # Update last_used
    await db.api_keys.update_one(
        {"id": key_doc["id"]},
        {"$set": {"last_used_at": datetime.utcnow()}},
    )
    return {
        "id": user["id"],
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "_api_key": {
            "id": key_doc["id"],
            "scope": key_doc.get("scope", "user"),
            "workspace_id": key_doc.get("workspace_id"),
        },
    }


@router.post("")
async def create_api_key(
    body: APIKeyCreate,
    current_user: dict = Depends(get_current_user),
):
    if body.scope not in ("user", "workspace"):
        raise HTTPException(status_code=400, detail="scope must be 'user' or 'workspace'")
    if body.scope == "workspace":
        if not body.workspace_id:
            raise HTTPException(status_code=400, detail="workspace_id required for workspace-scoped keys")
        ws = await db.workspaces.find_one({"id": body.workspace_id})
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found")
        if ws.get("owner_id") != current_user["id"] and current_user["id"] not in ws.get("member_ids", []):
            raise HTTPException(status_code=403, detail="Not a member of this workspace")

    full_key, prefix = _generate_key()
    api_key = APIKey(
        name=body.name,
        key_prefix=prefix,
        key_hash=_hash_key(full_key),
        user_id=current_user["id"],
        scope=body.scope,
        workspace_id=body.workspace_id,
    )
    await db.api_keys.insert_one(api_key.dict())

    return {
        **_serialize_key(api_key.dict()),
        "key": full_key,  # full key shown ONCE
        "warning": "Store this key securely. It will not be shown again.",
    }


@router.get("")
async def list_api_keys(current_user: dict = Depends(get_current_user)):
    keys = await db.api_keys.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(200)
    return [_serialize_key(k) for k in keys]


@router.delete("/{key_id}")
async def revoke_api_key(key_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.api_keys.update_one(
        {"id": key_id, "user_id": current_user["id"]},
        {"$set": {"revoked": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"message": "API key revoked"}


# ---- Public Developer-API endpoints (authenticated via API key) ----

@router.get("/whoami")
async def whoami(current_user: dict = Depends(resolve_api_key)):
    """Quick test endpoint for users to verify their key works."""
    return {
        "user_id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "scope": current_user.get("_api_key", {}).get("scope"),
        "workspace_id": current_user.get("_api_key", {}).get("workspace_id"),
    }


# ---- Developer Public API: Item Ingestion via API Key ----
# Mounted at /api/v1/* so external scripts get a clean stable path.
public_api = APIRouter(prefix="/v1", tags=["public-api"])


def _check_workspace_scope(current_user: dict, board: dict):
    """If key is workspace-scoped, ensure board belongs to that workspace."""
    api_meta = current_user.get("_api_key", {})
    if api_meta.get("scope") == "workspace":
        if board.get("workspace_id") != api_meta.get("workspace_id"):
            raise HTTPException(
                status_code=403,
                detail="API key is scoped to a different workspace",
            )


@public_api.get("/boards")
async def public_list_boards(current_user: dict = Depends(resolve_api_key)):
    """List boards accessible to the API key holder."""
    user_id = current_user["id"]
    api_meta = current_user.get("_api_key", {})

    query = {
        "$or": [
            {"owner_id": user_id},
            {"member_ids": user_id},
        ]
    }
    if api_meta.get("scope") == "workspace":
        query["workspace_id"] = api_meta.get("workspace_id")

    boards = await db.boards.find(query).to_list(500)
    return [
        {
            "id": b["id"],
            "name": b["name"],
            "workspace_id": b.get("workspace_id"),
            "columns": [
                {"id": c["id"], "title": c["title"], "type": c["type"]}
                for c in b.get("columns", [])
            ],
        }
        for b in boards
    ]


@public_api.get("/boards/{board_id}")
async def public_get_board(board_id: str, current_user: dict = Depends(resolve_api_key)):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    _check_workspace_scope(current_user, board)
    if (
        board.get("owner_id") != current_user["id"]
        and current_user["id"] not in board.get("member_ids", [])
    ):
        raise HTTPException(status_code=403, detail="Not authorized")

    groups = await db.groups.find({"board_id": board_id}).to_list(200)
    return {
        "id": board["id"],
        "name": board["name"],
        "workspace_id": board.get("workspace_id"),
        "columns": [
            {
                "id": c["id"],
                "title": c["title"],
                "type": c["type"],
                "options": c.get("options", []),
            }
            for c in board.get("columns", [])
        ],
        "groups": [{"id": g["id"], "title": g["title"]} for g in groups],
    }


@public_api.post("/boards/{board_id}/items")
async def public_create_item(
    board_id: str,
    body: dict,
    current_user: dict = Depends(resolve_api_key),
):
    """External ingestion endpoint. Body:
    {
      "name": "Item name",
      "group_id": "<optional>",
      "column_values": { "<column_id>": <value>, ... }
    }
    """
    from models import Item
    from routes.activity_helper import log_activity

    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    _check_workspace_scope(current_user, board)
    if (
        board.get("owner_id") != current_user["id"]
        and current_user["id"] not in board.get("member_ids", [])
    ):
        raise HTTPException(status_code=403, detail="Not authorized")

    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="'name' is required")

    group_id = body.get("group_id")
    if not group_id:
        first_group = await db.groups.find_one({"board_id": board_id})
        if first_group:
            group_id = first_group["id"]

    column_values = body.get("column_values", {}) or {}

    item = Item(
        board_id=board_id,
        group_id=group_id,
        name=name,
        column_values=column_values,
        created_by=current_user["id"],
    )
    await db.items.insert_one(item.dict())

    await log_activity(
        board_id=board_id,
        user_id=current_user["id"],
        user_name=f"{current_user.get('name', '')} (API)",
        action="created_via_api",
        item_name=name,
        column_name="",
        item_id=item.id,
    )

    try:
        from routes.automation_engine import run_automations_for_item
        await run_automations_for_item(
            item_id=item.id,
            board_id=board_id,
            old_column_values={},
            new_column_values=column_values,
            user_id=current_user["id"],
            user_name=f"{current_user.get('name', '')} (API)",
        )
    except Exception:
        pass

    return {
        "id": item.id,
        "board_id": board_id,
        "group_id": group_id,
        "name": name,
        "column_values": column_values,
    }

