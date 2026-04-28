from fastapi import APIRouter, HTTPException, Depends, Body
from auth import get_current_user
from database import get_db
from datetime import datetime
import uuid

router = APIRouter(prefix="/views", tags=["views"])
db = get_db()


@router.get("/board/{board_id}")
async def get_board_views(
    board_id: str,
    current_user: dict = Depends(get_current_user)
):
    views = await db.board_views.find(
        {"board_id": board_id},
        {"_id": 0}
    ).to_list(50)
    return views


@router.post("")
async def create_view(
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    board_id = body.get("board_id")
    name = body.get("name")
    if not board_id or not name:
        raise HTTPException(status_code=400, detail="board_id and name required")

    view = {
        "id": str(uuid.uuid4()),
        "board_id": board_id,
        "name": name,
        "filters": body.get("filters", {}),
        "sort": body.get("sort", {}),
        "group_by": body.get("group_by", ""),
        "hidden_columns": body.get("hidden_columns", []),
        "created_by": current_user["id"],
        "created_at": datetime.utcnow(),
    }
    await db.board_views.insert_one(view)
    view.pop("_id", None)
    return view


@router.delete("/{view_id}")
async def delete_view(
    view_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = await db.board_views.delete_one({"id": view_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="View not found")
    return {"message": "View deleted"}
