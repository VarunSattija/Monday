from fastapi import APIRouter, HTTPException, Depends
from models import BaseModel
from auth import get_current_user
from typing import List, Optional
from datetime import datetime
from database import get_db
import uuid

router = APIRouter(prefix="/teams", tags=["teams"])
db = get_db()

class TeamMember(BaseModel):
    user_id: str
    name: str
    email: str
    role: str  # admin, member
    status: str  # active, invited, removed
    joined_at: datetime = None
    avatar: Optional[str] = None

    def __init__(self, **data):
        super().__init__(**data)
        if self.joined_at is None:
            self.joined_at = datetime.utcnow()

class Team(BaseModel):
    id: str = None
    name: str
    description: Optional[str] = None
    members: List[TeamMember] = []
    created_at: datetime = None
    updated_at: datetime = None

    def __init__(self, **data):
        super().__init__(**data)
        if self.id is None:
            self.id = str(uuid.uuid4())
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None

class InviteMemberRequest(BaseModel):
    email: str
    role: str = "member"


@router.get("", response_model=List[Team])
async def get_teams(
    current_user: dict = Depends(get_current_user)
):
    teams = await db.teams.find({"members.user_id": current_user["id"]}).to_list(1000)
    return [Team(**team) for team in teams]


@router.get("/{team_id}", response_model=Team)
async def get_team(
    team_id: str,
    current_user: dict = Depends(get_current_user)
):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return Team(**team)


@router.get("/by-name/{team_name}", response_model=Team)
async def get_team_by_name(
    team_name: str,
    current_user: dict = Depends(get_current_user)
):
    team = await db.teams.find_one({"name": team_name})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return Team(**team)


@router.post("", response_model=Team)
async def create_team(
    team_data: TeamCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check if team already exists
    existing_team = await db.teams.find_one({"name": team_data.name})
    if existing_team:
        raise HTTPException(status_code=400, detail="Team already exists")
    
    # Create team with current user as admin
    team = Team(
        name=team_data.name,
        description=team_data.description,
        members=[
            TeamMember(
                user_id=current_user["id"],
                name=current_user.get("name", "Unknown"),
                email=current_user["email"],
                role="admin",
                status="active"
            )
        ]
    )
    
    await db.teams.insert_one(team.dict())
    return team


@router.post("/{team_id}/members")
async def add_team_member(
    team_id: str,
    user_id: str,
    name: str,
    email: str,
    role: str = "member",
    current_user: dict = Depends(get_current_user)
):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if current user is admin
    is_admin = any(
        member["user_id"] == current_user["id"] and member["role"] == "admin"
        for member in team.get("members", [])
    )
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can add members")
    
    # Check if member already exists
    member_exists = any(
        member["user_id"] == user_id
        for member in team.get("members", [])
    )
    
    if member_exists:
        return {"message": "User already in team"}
    
    # Add new member
    new_member = TeamMember(
        user_id=user_id,
        name=name,
        email=email,
        role=role,
        status="active"
    )
    
    await db.teams.update_one(
        {"id": team_id},
        {"$push": {"members": new_member.dict()}}
    )
    
    return {"message": "Member added successfully"}


@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if current user is admin
    is_admin = any(
        member["user_id"] == current_user["id"] and member["role"] == "admin"
        for member in team.get("members", [])
    )
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can remove members")
    
    # Update member status to removed
    await db.teams.update_one(
        {"id": team_id, "members.user_id": user_id},
        {"$set": {"members.$.status": "removed"}}
    )
    
    return {"message": "Member removed successfully"}


@router.put("/{team_id}/members/{user_id}/role")
async def update_member_role(
    team_id: str,
    user_id: str,
    role: str,
    current_user: dict = Depends(get_current_user)
):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if current user is admin
    is_admin = any(
        member["user_id"] == current_user["id"] and member["role"] == "admin"
        for member in team.get("members", [])
    )
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can change roles")
    
    # Update member role
    await db.teams.update_one(
        {"id": team_id, "members.user_id": user_id},
        {"$set": {"members.$.role": role}}
    )
    
    return {"message": "Role updated successfully"}


@router.post("/{team_id}/invite")
async def invite_member_by_email(
    team_id: str,
    invite_data: InviteMemberRequest,
    current_user: dict = Depends(get_current_user)
):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if current user is a team member
    is_member = any(
        member["user_id"] == current_user["id"]
        for member in team.get("members", [])
    )
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Only team members can invite others")
    
    # Check if email is already in team
    member_exists = any(
        member.get("email") == invite_data.email
        for member in team.get("members", [])
    )
    
    if member_exists:
        raise HTTPException(status_code=400, detail="User already in team")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": invite_data.email})
    
    if existing_user:
        # Add existing user directly
        new_member = TeamMember(
            user_id=existing_user["id"],
            name=existing_user.get("name", "Unknown"),
            email=invite_data.email,
            role=invite_data.role,
            status="active"
        )
    else:
        # Create an invited placeholder
        new_member = TeamMember(
            user_id=str(uuid.uuid4()),
            name=invite_data.email.split("@")[0],
            email=invite_data.email,
            role=invite_data.role,
            status="invited"
        )
    
    await db.teams.update_one(
        {"id": team_id},
        {"$push": {"members": new_member.dict()}}
    )
    
    return {"message": f"Invitation sent to {invite_data.email}", "member": new_member.dict()}
