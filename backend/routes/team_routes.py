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
    
    # Any authenticated team member can remove others
    is_member = any(
        member["user_id"] == current_user["id"]
        for member in team.get("members", [])
    )
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Must be a team member to manage members")
    
    # Cannot remove yourself
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    
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
    
    # Any team member can change roles
    is_member = any(
        member["user_id"] == current_user["id"]
        for member in team.get("members", [])
    )
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Must be a team member")
    
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
    
    # Any authenticated user can invite others to the team
    
    # Check if email is already in team
    active_member = None
    removed_member = None
    for member in team.get("members", []):
        if member.get("email") == invite_data.email:
            if member.get("status") in ("active", "invited"):
                active_member = member
            elif member.get("status") == "removed":
                removed_member = member
    
    if active_member:
        raise HTTPException(status_code=400, detail="User already in team")
    
    if removed_member:
        # Re-invite removed member: reset status to invited
        await db.teams.update_one(
            {"id": team_id, "members.user_id": removed_member["user_id"]},
            {"$set": {"members.$.status": "invited", "members.$.role": invite_data.role}}
        )
    else:
        # Add new member
        existing_user = await db.users.find_one({"email": invite_data.email})
        
        if existing_user:
            new_member = TeamMember(
                user_id=existing_user["id"],
                name=existing_user.get("name", "Unknown"),
                email=invite_data.email,
                role=invite_data.role,
                status="active"
            )
        else:
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
    
    # Send email + in-app notification
    from routes.notification_routes import create_notification
    from routes.email_helper import send_email, build_invite_email
    import os

    inviter_name = current_user.get("name", "Someone")
    team_name = team.get("name", "a team")

    # Look up the user to send notification if they exist
    invite_target = await db.users.find_one({"email": invite_data.email})
    if invite_target:
        await create_notification(
            user_id=invite_target["id"],
            type="team_invite",
            title="Team invitation",
            message=f'{inviter_name} added you to team "{team_name}"',
            actor_id=current_user["id"],
            actor_name=inviter_name,
        )

    app_url = os.environ.get("APP_URL", "https://acuity-team-hub.preview.emergentagent.com")
    team_slug = team_name.replace(" ", "").replace("-", "")
    subject, html = build_invite_email(inviter_name, team_name, f"{app_url}/join/{team_slug}")
    await send_email(invite_data.email, subject, html)

    return {"message": f"Invitation sent to {invite_data.email}"}



@router.get("/join-info/{team_slug}")
async def get_join_info(team_slug: str):
    """Public endpoint - returns basic team info for the join page."""
    import re
    # Normalize slug: remove non-alphanumeric, lowercase
    normalized = re.sub(r'[^a-z0-9]', '', team_slug.lower())
    
    # Find team by normalized name match
    teams = await db.teams.find({}).to_list(100)
    team = None
    for t in teams:
        t_normalized = re.sub(r'[^a-z0-9]', '', t["name"].lower())
        if t_normalized == normalized:
            team = t
            break
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    active_count = sum(1 for m in team.get("members", []) if m.get("status") == "active")
    return {
        "name": team["name"],
        "id": team["id"],
        "description": team.get("description", ""),
        "member_count": active_count
    }


@router.post("/join/{team_slug}")
async def join_team_via_link(
    team_slug: str,
    current_user: dict = Depends(get_current_user)
):
    """Authenticated endpoint - adds the current user to the team."""
    import re
    normalized = re.sub(r'[^a-z0-9]', '', team_slug.lower())
    
    teams = await db.teams.find({}).to_list(100)
    team = None
    for t in teams:
        t_normalized = re.sub(r'[^a-z0-9]', '', t["name"].lower())
        if t_normalized == normalized:
            team = t
            break
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if already a member
    is_member = any(
        m["user_id"] == current_user["id"] and m.get("status") == "active"
        for m in team.get("members", [])
    )
    if is_member:
        raise HTTPException(status_code=400, detail="Already a member of this team")
    
    # Check if there's a pending invite for this email
    was_invited = any(
        m.get("email") == current_user["email"] and m.get("status") == "invited"
        for m in team.get("members", [])
    )
    
    if was_invited:
        await db.teams.update_one(
            {"id": team["id"], "members.email": current_user["email"], "members.status": "invited"},
            {"$set": {
                "members.$.status": "active",
                "members.$.user_id": current_user["id"],
                "members.$.name": current_user.get("name", ""),
                "members.$.avatar": current_user.get("avatar", ""),
                "members.$.joined_at": datetime.utcnow()
            }}
        )
    else:
        new_member = TeamMember(
            user_id=current_user["id"],
            name=current_user.get("name", "Unknown"),
            email=current_user["email"],
            role="member",
            status="active"
        )
        await db.teams.update_one(
            {"id": team["id"]},
            {"$push": {"members": new_member.dict()}}
        )
    
    return {"message": f"Successfully joined {team['name']}"}
