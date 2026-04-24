from fastapi import APIRouter, HTTPException, Depends, Body
from models import Board, BoardCreate, BoardColumn, ColumnType, ColumnOption, Group, Item
from auth import get_current_user
from typing import List, Optional
from datetime import datetime
from database import get_db

router = APIRouter(prefix="/boards", tags=["boards"])
db = get_db()
import uuid


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
    board_data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    allowed_fields = {"name", "description", "folder_id", "chart_configs", "columns"}
    update_dict = {k: v for k, v in board_data.items() if k in allowed_fields}
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.boards.update_one(
        {"id": board_id},
        {"$set": update_dict}
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
    after_column_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    if after_column_id:
        # Insert after the specified column
        columns = board.get("columns", [])
        insert_idx = len(columns)
        for i, col in enumerate(columns):
            if col["id"] == after_column_id:
                insert_idx = i + 1
                break
        columns.insert(insert_idx, column.dict())
        await db.boards.update_one(
            {"id": board_id},
            {"$set": {"columns": columns}}
        )
    else:
        await db.boards.update_one(
            {"id": board_id},
            {"$push": {"columns": column.dict()}}
        )
    
    return {"message": "Column added successfully"}


@router.put("/{board_id}/columns/{column_id}")
async def update_column(
    board_id: str,
    column_id: str,
    title: str = None,
    column_type: str = None,
    body: Optional[dict] = Body(None),
    current_user: dict = Depends(get_current_user)
):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    columns = board.get("columns", [])
    updated = False
    for col in columns:
        if col["id"] == column_id:
            if title is not None:
                col["title"] = title
            if column_type is not None:
                col["type"] = column_type
                # Reset options for new type
                if column_type == "status":
                    col["options"] = [
                        {"id": "1", "label": "Working on it", "color": "#fdab3d"},
                        {"id": "2", "label": "Done", "color": "#00c875"},
                        {"id": "3", "label": "Stuck", "color": "#e2445c"},
                        {"id": "4", "label": "", "color": "#c4c4c4"}
                    ]
                elif column_type == "priority":
                    col["options"] = [
                        {"id": "1", "label": "Critical", "color": "#333333"},
                        {"id": "2", "label": "High", "color": "#401694"},
                        {"id": "3", "label": "Medium", "color": "#5559df"},
                        {"id": "4", "label": "Low", "color": "#579bfc"},
                        {"id": "5", "label": "", "color": "#c4c4c4"}
                    ]
                else:
                    col["options"] = []
            if body and "options" in body:
                col["options"] = body["options"]
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Column not found")
    
    await db.boards.update_one(
        {"id": board_id},
        {"$set": {"columns": columns, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Column updated successfully"}


@router.delete("/{board_id}/columns/{column_id}")
async def delete_column(
    board_id: str,
    column_id: str,
    current_user: dict = Depends(get_current_user)
):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    columns = [col for col in board.get("columns", []) if col["id"] != column_id]
    
    await db.boards.update_one(
        {"id": board_id},
        {"$set": {"columns": columns, "updated_at": datetime.utcnow()}}
    )
    
    # Remove column values from all items
    await db.items.update_many(
        {"board_id": board_id},
        {"$unset": {f"column_values.{column_id}": ""}}
    )
    
    return {"message": "Column deleted successfully"}


@router.post("/{board_id}/columns/{column_id}/duplicate")
async def duplicate_column(
    board_id: str,
    column_id: str,
    current_user: dict = Depends(get_current_user)
):
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    columns = board.get("columns", [])
    source_col = None
    source_idx = 0
    for i, col in enumerate(columns):
        if col["id"] == column_id:
            source_col = col
            source_idx = i
            break
    
    if not source_col:
        raise HTTPException(status_code=404, detail="Column not found")
    
    import uuid as _uuid
    new_col = BoardColumn(
        title=f"{source_col['title']} (Copy)",
        type=source_col["type"],
        width=source_col.get("width", 150),
        options=[ColumnOption(**opt) for opt in source_col.get("options", [])]
    )
    columns.insert(source_idx + 1, new_col.dict())
    
    await db.boards.update_one(
        {"id": board_id},
        {"$set": {"columns": columns, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Column duplicated successfully"}


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
    
    # Find user by email
    invited_user = await db.users.find_one({"email": email})
    if invited_user:
        # Add to board member_ids directly
        if invited_user["id"] not in board.get("member_ids", []):
            await db.boards.update_one(
                {"id": board_id},
                {"$push": {"member_ids": invited_user["id"]}}
            )
    
    # Also store the invitation for tracking
    invitation = {
        "id": str(uuid.uuid4()),
        "board_id": board_id,
        "email": email,
        "role": role,
        "invited_by": current_user["id"],
        "invited_at": datetime.utcnow(),
        "status": "accepted" if invited_user else "pending"
    }
    await db.board_invitations.insert_one(invitation)
    
    return {"message": "Invitation sent successfully", "invitation": invitation}


@router.get("/shared/me")
async def get_shared_boards(
    current_user: dict = Depends(get_current_user)
):
    """Get boards shared with the current user (not owned by them)."""
    boards = await db.boards.find({
        "member_ids": current_user["id"],
        "owner_id": {"$ne": current_user["id"]}
    }).to_list(1000)
    return [Board(**board) for board in boards]


@router.post("/{board_id}/share")
async def share_board_with_team(
    board_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Share a board with all team members."""
    board = await db.boards.find_one({"id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    # Get the Acuity team
    team = await db.teams.find_one({"name": "Acuity-Professional"})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Add all active team members to the board
    active_members = [m["user_id"] for m in team.get("members", []) if m.get("status") == "active"]
    existing_members = set(board.get("member_ids", []))
    new_members = [uid for uid in active_members if uid not in existing_members]
    
    if new_members:
        await db.boards.update_one(
            {"id": board_id},
            {"$push": {"member_ids": {"$each": new_members}}}
        )
    
    return {"message": f"Board shared with {len(new_members)} team members", "added": len(new_members)}


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



@router.post("/{board_id}/favorite")
async def toggle_favorite(
    board_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Toggle board as favorite for the current user."""
    existing = await db.favorites.find_one({"user_id": current_user["id"], "board_id": board_id})
    if existing:
        await db.favorites.delete_one({"user_id": current_user["id"], "board_id": board_id})
        return {"favorited": False}
    else:
        await db.favorites.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "board_id": board_id,
            "created_at": datetime.utcnow(),
        })
        return {"favorited": True}


@router.get("/favorites/me")
async def get_my_favorites(
    current_user: dict = Depends(get_current_user)
):
    """Get current user's favorite boards."""
    favs = await db.favorites.find({"user_id": current_user["id"]}).to_list(100)
    board_ids = [f["board_id"] for f in favs]
    if not board_ids:
        return []
    boards = await db.boards.find({"id": {"$in": board_ids}}).to_list(100)
    return [Board(**b) for b in boards]


@router.post("/bulk-copy")
async def bulk_copy_items_to_board(
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Copy selected items to another board."""
    item_ids = body.get("item_ids", [])
    target_board_id = body.get("target_board_id")
    target_group_id = body.get("target_group_id")

    if not item_ids or not target_board_id:
        raise HTTPException(status_code=400, detail="item_ids and target_board_id required")

    target_board = await db.boards.find_one({"id": target_board_id})
    if not target_board:
        raise HTTPException(status_code=404, detail="Target board not found")

    # If no target group specified, use the first group or create one
    if not target_group_id:
        first_group = await db.groups.find_one({"board_id": target_board_id})
        if first_group:
            target_group_id = first_group["id"]
        else:
            new_group = Group(board_id=target_board_id, title="Copied Items", color="#579bfc")
            await db.groups.insert_one(new_group.dict())
            target_group_id = new_group.id

    items = await db.items.find({"id": {"$in": item_ids}}).to_list(len(item_ids))
    copied = 0
    for item in items:
        new_item = Item(
            board_id=target_board_id,
            group_id=target_group_id,
            name=item["name"],
            column_values=item.get("column_values", {}),
            created_by=current_user["id"],
        )
        await db.items.insert_one(new_item.dict())
        copied += 1

    return {"message": f"Copied {copied} items", "copied": copied}


@router.post("/bulk-move-board")
async def bulk_move_items_to_board(
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Move selected items to another board (removes from source)."""
    item_ids = body.get("item_ids", [])
    target_board_id = body.get("target_board_id")
    target_group_id = body.get("target_group_id")

    if not item_ids or not target_board_id:
        raise HTTPException(status_code=400, detail="item_ids and target_board_id required")

    target_board = await db.boards.find_one({"id": target_board_id})
    if not target_board:
        raise HTTPException(status_code=404, detail="Target board not found")

    if not target_group_id:
        first_group = await db.groups.find_one({"board_id": target_board_id})
        if first_group:
            target_group_id = first_group["id"]
        else:
            new_group = Group(board_id=target_board_id, title="Moved Items", color="#579bfc")
            await db.groups.insert_one(new_group.dict())
            target_group_id = new_group.id

    result = await db.items.update_many(
        {"id": {"$in": item_ids}},
        {"$set": {"board_id": target_board_id, "group_id": target_group_id, "updated_at": datetime.utcnow()}}
    )
    return {"message": f"Moved {result.modified_count} items", "moved": result.modified_count}
