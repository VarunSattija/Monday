from fastapi import APIRouter, HTTPException, Depends, Body
from auth import get_current_user
from database import get_db
from datetime import datetime
import uuid

router = APIRouter(prefix="/notifications", tags=["notifications"])
db = get_db()


async def create_notification(
    user_id: str,
    type: str,
    title: str,
    message: str,
    board_id: str = "",
    item_id: str = "",
    actor_id: str = "",
    actor_name: str = "",
):
    """Create a notification for a user."""
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": type,
        "title": title,
        "message": message,
        "board_id": board_id,
        "item_id": item_id,
        "actor_id": actor_id,
        "actor_name": actor_name,
        "read": False,
        "created_at": datetime.utcnow(),
    }
    await db.notifications.insert_one(notif)
    return notif


@router.get("/me")
async def get_my_notifications(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    notifs = await db.notifications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return notifs


@router.get("/me/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    count = await db.notifications.count_documents(
        {"user_id": current_user["id"], "read": False}
    )
    return {"count": count}


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}


@router.put("/read-all")
async def mark_all_as_read(
    current_user: dict = Depends(get_current_user)
):
    result = await db.notifications.update_many(
        {"user_id": current_user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": f"Marked {result.modified_count} as read"}
