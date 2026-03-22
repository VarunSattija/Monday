from fastapi import APIRouter, HTTPException, Depends
from models import Group, GroupCreate
from auth import get_current_user
from typing import List
from database import get_db

router = APIRouter(prefix="/groups", tags=["groups"])
db = get_db()


@router.post("", response_model=Group)
async def create_group(
    group_data: GroupCreate,
    current_user: dict = Depends(get_current_user)
):
    # Get the count of existing groups for this board to set position
    count = await db.groups.count_documents({"board_id": group_data.board_id})
    
    group = Group(
        **group_data.dict(),
        position=count
    )
    await db.groups.insert_one(group.dict())
    return group


@router.get("/board/{board_id}", response_model=List[Group])
async def get_board_groups(
    board_id: str,
    current_user: dict = Depends(get_current_user)
):
    groups = await db.groups.find({"board_id": board_id}).sort("position", 1).to_list(1000)
    return [Group(**group) for group in groups]


@router.put("/{group_id}", response_model=Group)
async def update_group(
    group_id: str,
    group_data: GroupCreate,
    current_user: dict = Depends(get_current_user)
):
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    await db.groups.update_one(
        {"id": group_id},
        {"$set": group_data.dict()}
    )
    
    updated_group = await db.groups.find_one({"id": group_id})
    return Group(**updated_group)


@router.delete("/{group_id}")
async def delete_group(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Delete the group and all items in it
    await db.groups.delete_one({"id": group_id})
    await db.items.delete_many({"group_id": group_id})
    
    return {"message": "Group deleted successfully"}
