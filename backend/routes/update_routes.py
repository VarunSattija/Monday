from fastapi import APIRouter, HTTPException, Depends
from models import Update, UpdateCreate
from auth import get_current_user
from typing import List
from database import get_db

router = APIRouter(prefix="/updates", tags=["updates"])
db = get_db()


@router.post("", response_model=Update)
async def create_update(
    update_data: UpdateCreate,
    current_user: dict = Depends(get_current_user)
):
    import re
    from routes.notification_routes import create_notification

    # Get user info
    user = await db.users.find_one({"id": current_user["id"]})
    
    update = Update(
        **update_data.dict(),
        user_id=current_user["id"],
        user_name=user.get("name", "Unknown")
    )
    await db.updates.insert_one(update.dict())

    # Detect @mentions by matching against known board member names
    content_text = update_data.content or ""
    mentioned_user_ids = set()
    if "@" in content_text:
        # Get all board members to match against
        item_for_board = await db.items.find_one({"id": update_data.item_id})
        if item_for_board:
            board_for_mentions = await db.boards.find_one({"id": item_for_board.get("board_id")})
            if board_for_mentions:
                all_member_ids = board_for_mentions.get("member_ids", [])
                if board_for_mentions.get("owner_id"):
                    all_member_ids = list(set(all_member_ids + [board_for_mentions["owner_id"]]))
                all_members = await db.users.find({"id": {"$in": all_member_ids}}).to_list(200)
                # Sort by name length desc so longer names match first
                all_members.sort(key=lambda m: len(m.get("name", "")), reverse=True)
                for member in all_members:
                    mname = member.get("name", "")
                    if mname and f"@{mname}" in content_text:
                        mentioned_user_ids.add(member["id"])

    # Notify about the comment
    item = await db.items.find_one({"id": update_data.item_id})
    if item:
        board = await db.boards.find_one({"id": item.get("board_id")})
        if board:
            user_name = user.get("name", "Someone")
            item_name = item.get("name", "an item")
            notified = set()
            
            # Send @mention notifications first (higher priority)
            for uid in mentioned_user_ids:
                if uid != current_user["id"]:
                    await create_notification(
                        user_id=uid,
                        type="mention",
                        title="You were mentioned",
                        message=f'{user_name} mentioned you in "{item_name}"',
                        board_id=item.get("board_id", ""),
                        item_id=update_data.item_id,
                        actor_id=current_user["id"],
                        actor_name=user_name,
                    )
                    notified.add(uid)

            # Send general update notifications to remaining members
            for member_id in board.get("member_ids", []):
                if member_id != current_user["id"] and member_id not in notified:
                    await create_notification(
                        user_id=member_id,
                        type="update",
                        title="New comment",
                        message=f'{user_name} wrote an update on "{item_name}"',
                        board_id=item.get("board_id", ""),
                        item_id=update_data.item_id,
                        actor_id=current_user["id"],
                        actor_name=user_name,
                    )

    return update


@router.get("/item/{item_id}", response_model=List[Update])
async def get_item_updates(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    updates = await db.updates.find({"item_id": item_id}).sort("created_at", -1).to_list(1000)
    return [Update(**update) for update in updates]


@router.get("/counts/board/{board_id}")
async def get_board_update_counts(
    board_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Get all items for this board
    items = await db.items.find({"board_id": board_id}, {"id": 1, "_id": 0}).to_list(10000)
    item_ids = [item["id"] for item in items]
    
    if not item_ids:
        return {}
    
    # Aggregate comment counts per item
    pipeline = [
        {"$match": {"item_id": {"$in": item_ids}}},
        {"$group": {"_id": "$item_id", "count": {"$sum": 1}}}
    ]
    counts_cursor = db.updates.aggregate(pipeline)
    counts = {}
    async for doc in counts_cursor:
        counts[doc["_id"]] = doc["count"]
    
    return counts


@router.delete("/{update_id}")
async def delete_update(
    update_id: str,
    current_user: dict = Depends(get_current_user)
):
    update = await db.updates.find_one({"id": update_id})
    if not update:
        raise HTTPException(status_code=404, detail="Update not found")
    
    if update["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.updates.delete_one({"id": update_id})
    return {"message": "Update deleted successfully"}
