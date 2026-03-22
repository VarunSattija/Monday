from fastapi import APIRouter, HTTPException, Depends
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
