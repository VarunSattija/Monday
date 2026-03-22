from fastapi import APIRouter, HTTPException, Depends
from models import BaseModel
from auth import get_current_user
from typing import List
from database import get_db

router = APIRouter(prefix="/permissions", tags=["permissions"])
db = get_db()

class Permission(BaseModel):
    board_id: str
    user_id: str
    role: str  # owner, member, viewer
    can_edit: bool = True
    can_delete: bool = False
    can_invite: bool = False

class ColumnPermission(BaseModel):
    board_id: str
    column_id: str
    user_id: str
    can_view: bool = True
    can_edit: bool = True


@router.get("/board/{board_id}", response_model=List[Permission])
async def get_board_permissions(
    board_id: str,
    current_user: dict = Depends(get_current_user)
):
    permissions = await db.permissions.find({"board_id": board_id}).to_list(1000)
    return [Permission(**perm) for perm in permissions]


@router.post("/board/{board_id}")
async def set_permission(
    board_id: str,
    permission: Permission,
    current_user: dict = Depends(get_current_user)
):
    # Check if user is owner
    board = await db.boards.find_one({"id": board_id})
    if board["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only owner can set permissions")
    
    await db.permissions.update_one(
        {"board_id": board_id, "user_id": permission.user_id},
        {"$set": permission.dict()},
        upsert=True
    )
    
    return {"message": "Permission updated successfully"}


@router.get("/column/{board_id}/{column_id}", response_model=List[ColumnPermission])
async def get_column_permissions(
    board_id: str,
    column_id: str,
    current_user: dict = Depends(get_current_user)
):
    permissions = await db.column_permissions.find({
        "board_id": board_id,
        "column_id": column_id
    }).to_list(1000)
    return [ColumnPermission(**perm) for perm in permissions]


@router.post("/column")
async def set_column_permission(
    permission: ColumnPermission,
    current_user: dict = Depends(get_current_user)
):
    await db.column_permissions.update_one(
        {
            "board_id": permission.board_id,
            "column_id": permission.column_id,
            "user_id": permission.user_id
        },
        {"$set": permission.dict()},
        upsert=True
    )
    
    return {"message": "Column permission updated successfully"}
