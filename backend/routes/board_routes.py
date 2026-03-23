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


@router.post("/{board_id}/duplicate")
async def duplicate_board(
    board_id: str,
    option: str,
    include_subscribers: bool = False,
    current_user: dict = Depends(get_current_user)
):
    # Get original board
    original_board = await db.boards.find_one({"id": board_id})
    if not original_board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    # Create new board with duplicated data
    import uuid
    new_board = Board(
        name=f"{original_board['name']} (Copy)",
        workspace_id=original_board["workspace_id"],
        description=original_board.get("description"),
        owner_id=current_user["id"],
        member_ids=[current_user["id"]] if not include_subscribers else original_board.get("member_ids", []),
        columns=original_board.get("columns", [])
    )
    
    await db.boards.insert_one(new_board.dict())
    
    # If including items, duplicate them
    if option in ["structure_items", "structure_items_updates"]:
        # Get all groups
        groups = await db.groups.find({"board_id": board_id}).to_list(1000)
        group_id_map = {}
        
        # Duplicate groups
        for group in groups:
            old_group_id = group["id"]
            new_group = Group(
                board_id=new_board.id,
                title=group["title"],
                color=group.get("color", "#0086c0"),
                position=group.get("position", 0),
                collapsed=group.get("collapsed", False)
            )
            await db.groups.insert_one(new_group.dict())
            group_id_map[old_group_id] = new_group.id
        
        # Get all items
        items = await db.items.find({"board_id": board_id}).to_list(1000)
        item_id_map = {}
        
        # Duplicate items
        for item in items:
            old_item_id = item["id"]
            new_group_id = group_id_map.get(item.get("group_id")) if item.get("group_id") else None
            
            new_item = Item(
                board_id=new_board.id,
                group_id=new_group_id,
                name=item["name"],
                column_values=item.get("column_values", {}),
                position=item.get("position", 0),
                created_by=current_user["id"]
            )
            await db.items.insert_one(new_item.dict())
            item_id_map[old_item_id] = new_item.id
        
        # If including updates, duplicate them
        if option == "structure_items_updates":
            for old_item_id, new_item_id in item_id_map.items():
                updates = await db.updates.find({"item_id": old_item_id}).to_list(1000)
                for update in updates:
                    from models import Update
                    new_update = Update(
                        item_id=new_item_id,
                        content=update["content"],
                        user_id=update["user_id"],
                        user_name=update["user_name"]
                    )
                    await db.updates.insert_one(new_update.dict())
    
    return {"message": "Board duplicated successfully", "board_id": new_board.id, "board": new_board.dict()}


@router.post("/{board_id}/invite")
async def invite_to_board(
    board_id: str,
    email: str,
    role: str = "member",
    current_user: dict = Depends(get_current_user)
):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    # Check if user is owner or member
    if current_user["id"] not in board.get("member_ids", []) and board["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to invite members")
    
    # In a real application, you would:
    # 1. Create an invitation record
    # 2. Send email to the invited user
    # 3. When they accept, add them to board
    
    # For now, we'll simulate this by adding a pending invitation
    invitation = {
        "id": str(uuid.uuid4()),
        "board_id": board_id,
        "email": email,
        "role": role,
        "invited_by": current_user["id"],
        "invited_at": datetime.utcnow(),
        "status": "pending"
    }
    
    await db.board_invitations.insert_one(invitation)
    
    return {"message": "Invitation sent successfully", "invitation": invitation}


@router.delete("/{board_id}/members/{member_id}")
async def remove_board_member(
    board_id: str,
    member_id: str,
    current_user: dict = Depends(get_current_user)
):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    if board["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only owner can remove members")
    
    # Remove member from board
    await db.boards.update_one(
        {"id": board_id},
        {"$pull": {"member_ids": member_id}}
    )
    
    return {"message": "Member removed successfully"}


@router.put("/{board_id}/members/{member_id}/role")
async def update_member_role(
    board_id: str,
    member_id: str,
    role: str,
    current_user: dict = Depends(get_current_user)
):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    if board["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only owner can change roles")
    
    # Update member role (store in permissions collection)
    await db.permissions.update_one(
        {"board_id": board_id, "user_id": member_id},
        {"$set": {"role": role}},
        upsert=True
    )
    
    # If making them owner, transfer ownership
    if role == "owner":
        await db.boards.update_one(
            {"id": board_id},
            {"$set": {"owner_id": member_id}}
        )
    
    return {"message": "Role updated successfully"}
