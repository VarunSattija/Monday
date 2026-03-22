from fastapi import APIRouter, HTTPException, Depends
from models import Board, BoardCreate, BoardColumn, ColumnType, ColumnOption
from auth import get_current_user
from typing import List
from datetime import datetime
from database import get_db

router = APIRouter(prefix="/boards", tags=["boards"])
db = get_db()


def get_default_columns():
    return [
        BoardColumn(
            title="Item",
            type=ColumnType.TEXT,
            width=250
        ),
        BoardColumn(
            title="Status",
            type=ColumnType.STATUS,
            width=150,
            options=[
                ColumnOption(label="Working on it", color="#fdab3d"),
                ColumnOption(label="Done", color="#00c875"),
                ColumnOption(label="Stuck", color="#e2445c"),
                ColumnOption(label="", color="#c4c4c4")
            ]
        ),
        BoardColumn(
            title="Person",
            type=ColumnType.PERSON,
            width=150
        ),
        BoardColumn(
            title="Date",
            type=ColumnType.DATE,
            width=150
        ),
        BoardColumn(
            title="Priority",
            type=ColumnType.PRIORITY,
            width=150,
            options=[
                ColumnOption(label="Critical", color="#333333"),
                ColumnOption(label="High", color="#401694"),
                ColumnOption(label="Medium", color="#5559df"),
                ColumnOption(label="Low", color="#579bfc"),
                ColumnOption(label="", color="#c4c4c4")
            ]
        )
    ]


@router.post("", response_model=Board)
async def create_board(
    board_data: BoardCreate,
    current_user: dict = Depends(get_current_user)
):
    board = Board(
        **board_data.dict(),
        owner_id=current_user["id"],
        member_ids=[current_user["id"]],
        columns=get_default_columns()
    )
    await db.boards.insert_one(board.dict())
    return board


@router.get("/workspace/{workspace_id}", response_model=List[Board])
async def get_workspace_boards(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    boards = await db.boards.find({"workspace_id": workspace_id}).to_list(1000)
    return [Board(**board) for board in boards]


@router.get("/{board_id}", response_model=Board)
async def get_board(
    board_id: str,
    current_user: dict = Depends(get_current_user)
):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return Board(**board)


@router.put("/{board_id}", response_model=Board)
async def update_board(
    board_id: str,
    board_data: BoardCreate,
    current_user: dict = Depends(get_current_user)
):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    await db.boards.update_one(
        {"id": board_id},
        {"$set": {**board_data.dict(), "updated_at": datetime.utcnow()}}
    )
    
    updated_board = await db.boards.find_one({"id": board_id})
    return Board(**updated_board)


@router.delete("/{board_id}")
async def delete_board(
    board_id: str,
    current_user: dict = Depends(get_current_user)
):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    await db.boards.delete_one({"id": board_id})
    await db.items.delete_many({"board_id": board_id})
    await db.groups.delete_many({"board_id": board_id})
    
    return {"message": "Board deleted successfully"}


@router.post("/{board_id}/columns")
async def add_column(
    board_id: str,
    column: BoardColumn,
    current_user: dict = Depends(get_current_user)
):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    await db.boards.update_one(
        {"id": board_id},
        {"$push": {"columns": column.dict()}}
    )
    
    return {"message": "Column added successfully"}
