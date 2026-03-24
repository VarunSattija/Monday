from fastapi import APIRouter, HTTPException, status, Depends
from models import UserCreate, UserLogin, User, UserInDB
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])
db = get_db()


@router.post("/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        avatar=f"https://ui-avatars.com/api/?name={user_data.name}&background=F9A825&color=fff"
    )
    
    user_in_db = UserInDB(
        **user.dict(),
        hashed_password=get_password_hash(user_data.password)
    )
    
    await db.users.insert_one(user_in_db.dict())
    
    # Create default workspace for new user
    from models import Workspace
    default_workspace = Workspace(
        name=f"{user_data.name}'s Workspace",
        description="Your main workspace",
        owner_id=user.id,
        member_ids=[user.id]
    )
    await db.workspaces.insert_one(default_workspace.dict())
    
    # Add user to Acuity-Professional team (create if doesn't exist)
    import uuid
    acuity_team = await db.teams.find_one({"name": "Acuity-Professional"})
    
    if not acuity_team:
        # Create the Acuity-Professional team
        from datetime import datetime
        acuity_team = {
            "id": str(uuid.uuid4()),
            "name": "Acuity-Professional",
            "description": "Default team for all Acuity Professional users",
            "members": [
                {
                    "user_id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "role": "admin",  # First user is admin
                    "status": "active",
                    "joined_at": datetime.utcnow(),
                    "avatar": user.avatar
                }
            ],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.teams.insert_one(acuity_team)
    else:
        # Add user to existing team
        member_exists = any(
            member["user_id"] == user.id
            for member in acuity_team.get("members", [])
        )
        
        if not member_exists:
            from datetime import datetime
            new_member = {
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "role": "member",
                "status": "active",
                "joined_at": datetime.utcnow(),
                "avatar": user.avatar
            }
            await db.teams.update_one(
                {"id": acuity_team["id"]},
                {"$push": {"members": new_member}}
            )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.dict()
    }


@router.post("/login")
async def login(credentials: UserLogin):
    # Find user
    user_data = await db.users.find_one({"email": credentials.email})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    user_in_db = UserInDB(**user_data)
    
    # Verify password
    if not verify_password(credentials.password, user_in_db.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user_in_db.id, "email": user_in_db.email}
    )
    
    user = User(**{k: v for k, v in user_in_db.dict().items() if k != 'hashed_password'})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.dict()
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": current_user["id"]})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = User(**{k: v for k, v in user_data.items() if k != 'hashed_password'})
    return user.dict()
