from fastapi import APIRouter, HTTPException, Depends
from models import Workspace, WorkspaceCreate
from auth import get_current_user
from typing import List
from database import get_db

router = APIRouter(prefix="/workspaces", tags=["workspaces"])
db = get_db()


@router.post("", response_model=Workspace)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    current_user: dict = Depends(get_current_user)
):
    workspace = Workspace(
        **workspace_data.dict(),
        owner_id=current_user["id"],
        member_ids=[current_user["id"]]
    )
    await db.workspaces.insert_one(workspace.dict())
    return workspace


@router.get("", response_model=List[Workspace])
async def get_workspaces(current_user: dict = Depends(get_current_user)):
    workspaces = await db.workspaces.find({
        "$or": [
            {"owner_id": current_user["id"]},
            {"member_ids": current_user["id"]}
        ]
    }).to_list(1000)
    return [Workspace(**ws) for ws in workspaces]


@router.get("/{workspace_id}", response_model=Workspace)
async def get_workspace(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return Workspace(**workspace)


@router.put("/{workspace_id}", response_model=Workspace)
async def update_workspace(
    workspace_id: str,
    workspace_data: WorkspaceCreate,
    current_user: dict = Depends(get_current_user)
):
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    await db.workspaces.update_one(
        {"id": workspace_id},
        {"$set": workspace_data.dict()}
    )
    
    updated_workspace = await db.workspaces.find_one({"id": workspace_id})
    return Workspace(**updated_workspace)


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if workspace["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.workspaces.delete_one({"id": workspace_id})
    await db.boards.delete_many({"workspace_id": workspace_id})
    
    return {"message": "Workspace deleted successfully"}
