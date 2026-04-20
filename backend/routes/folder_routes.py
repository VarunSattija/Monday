from fastapi import APIRouter, HTTPException, Depends
from models import Folder, FolderCreate
from auth import get_current_user
from database import get_db
from typing import List

router = APIRouter(prefix="/folders", tags=["folders"])
db = get_db()


@router.post("", response_model=Folder)
async def create_folder(
    folder_data: FolderCreate,
    current_user: dict = Depends(get_current_user)
):
    folder = Folder(
        name=folder_data.name,
        workspace_id=folder_data.workspace_id,
        owner_id=current_user["id"]
    )
    await db.folders.insert_one(folder.dict())
    return folder


@router.get("/workspace/{workspace_id}", response_model=List[Folder])
async def get_workspace_folders(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    folders = await db.folders.find(
        {"workspace_id": workspace_id}, {"_id": 0}
    ).to_list(1000)
    return [Folder(**f) for f in folders]


@router.put("/{folder_id}")
async def update_folder(
    folder_id: str,
    name: str,
    current_user: dict = Depends(get_current_user)
):
    result = await db.folders.update_one(
        {"id": folder_id},
        {"$set": {"name": name}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"message": "Folder renamed"}


@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: str,
    current_user: dict = Depends(get_current_user)
):
    await db.folders.delete_one({"id": folder_id})
    # Unset folder_id on boards in this folder
    await db.boards.update_many(
        {"folder_id": folder_id},
        {"$set": {"folder_id": None}}
    )
    return {"message": "Folder deleted"}


@router.put("/boards/{board_id}/move")
async def move_board_to_folder(
    board_id: str,
    folder_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    await db.boards.update_one(
        {"id": board_id},
        {"$set": {"folder_id": folder_id}}
    )
    return {"message": "Board moved"}
