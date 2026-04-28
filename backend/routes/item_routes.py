from fastapi import APIRouter, HTTPException, Depends, Body
from models import Item, ItemCreate, ItemUpdate
from auth import get_current_user
from typing import List
from datetime import datetime
from database import get_db
from routes.activity_helper import log_activity

router = APIRouter(prefix="/items", tags=["items"])
db = get_db()


@router.post("", response_model=Item)
async def create_item(
    item_data: ItemCreate,
    current_user: dict = Depends(get_current_user)
):
    payload = {k: v for k, v in item_data.dict().items() if v is not None}
    item = Item(
        **payload,
        created_by=current_user["id"]
    )
    await db.items.insert_one(item.dict())

    # Activity log
    await log_activity(
        board_id=item.board_id,
        user_id=current_user["id"],
        user_name=current_user.get("name", ""),
        action="created",
        item_name=item.name,
        column_name="",
        item_id=item.id,
    )

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
    # Log bulk move
    if result.modified_count > 0:
        moved_items = await db.items.find({"id": {"$in": item_ids}}).to_list(len(item_ids))
        board_id = moved_items[0].get("board_id") if moved_items else ""
        target_group = await db.groups.find_one({"id": target_group_id})
        group_name = target_group.get("title", "") if target_group else ""
        if board_id:
            await log_activity(
                board_id=board_id,
                user_id=current_user["id"],
                user_name=current_user.get("name", ""),
                action="bulk_moved",
                item_name=f"{result.modified_count} items",
                column_name="Group",
                new_value=group_name,
                item_id="",
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

    # Log column_values changes for activity
    if "column_values" in update_data and item.get("board_id"):
        board = await db.boards.find_one({"id": item["board_id"]})
        col_map = {}
        if board:
            for col in board.get("columns", []):
                col_map[col["id"]] = col.get("title", col["id"])
        old_cv = item.get("column_values", {})
        new_cv = update_data["column_values"]
        for col_id, new_val in new_cv.items():
            old_val = old_cv.get(col_id)
            old_str = str(old_val) if old_val else ""
            new_str = str(new_val) if new_val else ""
            if old_str != new_str:
                await log_activity(
                    board_id=item["board_id"],
                    user_id=current_user["id"],
                    user_name=current_user.get("name", ""),
                    action="updated",
                    item_name=item.get("name", ""),
                    column_name=col_map.get(col_id, col_id),
                    old_value=old_str,
                    new_value=new_str,
                    item_id=item_id,
                    previous_state={"column_values": old_cv},
                )

    # Log name change
    if "name" in update_data and update_data["name"] != item.get("name") and item.get("board_id"):
        await log_activity(
            board_id=item["board_id"],
            user_id=current_user["id"],
            user_name=current_user.get("name", ""),
            action="renamed",
            item_name=item.get("name", ""),
            column_name="Name",
            old_value=item.get("name", ""),
            new_value=update_data["name"],
            item_id=item_id,
            previous_state={"name": item.get("name", "")},
        )

    await db.items.update_one(
        {"id": item_id},
        {"$set": update_data}
    )

    # Run automations if column_values changed
    if "column_values" in update_data and item.get("board_id"):
        from routes.automation_engine import run_automations_for_item
        await run_automations_for_item(
            item_id=item_id,
            board_id=item["board_id"],
            old_column_values=item.get("column_values", {}),
            new_column_values=update_data["column_values"],
            user_id=current_user["id"],
            user_name=current_user.get("name", ""),
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

    # Activity log
    if item.get("board_id"):
        await log_activity(
            board_id=item["board_id"],
            user_id=current_user["id"],
            user_name=current_user.get("name", ""),
            action="deleted",
            item_name=item.get("name", ""),
            column_name="",
            item_id=item_id,
        )
    
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
