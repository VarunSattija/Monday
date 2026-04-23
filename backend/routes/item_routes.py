from fastapi import APIRouter, HTTPException, Depends, Body
from models import Item, ItemCreate, ItemUpdate
from auth import get_current_user
from typing import List
from datetime import datetime
from database import get_db

router = APIRouter(prefix="/items", tags=["items"])
db = get_db()


@router.post("", response_model=Item)
async def create_item(
    item_data: ItemCreate,
    current_user: dict = Depends(get_current_user)
):
    item = Item(
        **item_data.dict(),
        created_by=current_user["id"]
    )
    await db.items.insert_one(item.dict())
    return item


@router.post("/insert-at")
async def insert_item_at_position(
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Insert an item at a specific position within a group, shifting others down."""
    board_id = body.get("board_id")
    group_id = body.get("group_id")
    position = body.get("position", 0)
    name = body.get("name", "New Item")

    if not board_id or not group_id:
        raise HTTPException(status_code=400, detail="board_id and group_id required")

    # Auth check
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if current_user["id"] not in board.get("member_ids", []) and board.get("owner_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Shift existing items at or after this position
    await db.items.update_many(
        {"board_id": board_id, "group_id": group_id, "position": {"$gte": position}},
        {"$inc": {"position": 1}}
    )

    item = Item(
        board_id=board_id,
        group_id=group_id,
        name=name,
        position=position,
        column_values={},
        created_by=current_user["id"]
    )
    await db.items.insert_one(item.dict())
    return item.dict()


@router.post("/bulk-move")
async def bulk_move_items(
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Move multiple items to a different group."""
    item_ids = body.get("item_ids", [])
    target_group_id = body.get("target_group_id")
    if not item_ids or not target_group_id:
        raise HTTPException(status_code=400, detail="item_ids and target_group_id required")

    result = await db.items.update_many(
        {"id": {"$in": item_ids}},
        {"$set": {"group_id": target_group_id, "updated_at": datetime.utcnow()}}
    )
    return {"message": f"Moved {result.modified_count} items", "moved": result.modified_count}


@router.post("/bulk-delete")
async def bulk_delete_items(
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Delete multiple items at once."""
    item_ids = body.get("item_ids", [])
    if not item_ids:
        raise HTTPException(status_code=400, detail="item_ids required")

    result = await db.items.delete_many({"id": {"$in": item_ids}})
    # Also delete updates
    await db.updates.delete_many({"item_id": {"$in": item_ids}})
    return {"message": f"Deleted {result.deleted_count} items", "deleted": result.deleted_count}


@router.get("/board/{board_id}", response_model=List[Item])
async def get_board_items(
    board_id: str,
    current_user: dict = Depends(get_current_user)
):
    items = await db.items.find({"board_id": board_id}).sort("position", 1).to_list(1000)
    return [Item(**item) for item in items]


@router.get("/{item_id}", response_model=Item)
async def get_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return Item(**item)


@router.put("/{item_id}", response_model=Item)
async def update_item(
    item_id: str,
    item_data: ItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = {k: v for k, v in item_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.items.update_one(
        {"id": item_id},
        {"$set": update_data}
    )
    
    updated_item = await db.items.find_one({"id": item_id})
    return Item(**updated_item)


@router.delete("/{item_id}")
async def delete_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await db.items.delete_one({"id": item_id})
    await db.updates.delete_many({"item_id": item_id})
    
    return {"message": "Item deleted successfully"}


@router.patch("/{item_id}/column")
async def update_item_column(
    item_id: str,
    column_id: str,
    value: dict,
    current_user: dict = Depends(get_current_user)
):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await db.items.update_one(
        {"id": item_id},
        {
            "$set": {
                f"column_values.{column_id}": value,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Column value updated successfully"}
