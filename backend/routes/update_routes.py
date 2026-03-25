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
    # Get user info
    user = await db.users.find_one({"id": current_user["id"]})
    
    update = Update(
        **update_data.dict(),
        user_id=current_user["id"],
        user_name=user.get("name", "Unknown")
    )
    await db.updates.insert_one(update.dict())
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
