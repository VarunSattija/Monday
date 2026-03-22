from fastapi import APIRouter, HTTPException, Depends
from models import BaseModel
from auth import get_current_user
from typing import List, Optional
from datetime import datetime
from database import get_db
import uuid

router = APIRouter(prefix="/activity", tags=["activity"])
db = get_db()

class Activity(BaseModel):
    id: str = None
    board_id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    action: str  # created, updated, deleted, moved, etc.
    details: str
    item_id: Optional[str] = None
    previous_state: Optional[dict] = None
    new_state: Optional[dict] = None
    created_at: datetime = None

    def __init__(self, **data):
        super().__init__(**data)
        if self.id is None:
            self.id = str(uuid.uuid4())
        if self.created_at is None:
            self.created_at = datetime.utcnow()


@router.get("/board/{board_id}", response_model=List[Activity])
async def get_board_activities(
    board_id: str,
    current_user: dict = Depends(get_current_user)
):
    activities = await db.activities.find({"board_id": board_id}).sort("created_at", -1).to_list(1000)
    return [Activity(**activity) for activity in activities]


@router.post("/log")
async def log_activity(
    activity_data: Activity,
    current_user: dict = Depends(get_current_user)
):
    activity = Activity(**activity_data.dict())
    await db.activities.insert_one(activity.dict())
    return {"message": "Activity logged successfully"}


@router.post("/{activity_id}/undo")
async def undo_activity(
    activity_id: str,
    current_user: dict = Depends(get_current_user)
):
    activity = await db.activities.find_one({"id": activity_id})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Revert the change based on previous_state
    if activity.get("previous_state") and activity.get("item_id"):
        await db.items.update_one(
            {"id": activity["item_id"]},
            {"$set": activity["previous_state"]}
        )
    
    # Mark activity as undone
    await db.activities.update_one(
        {"id": activity_id},
        {"$set": {"undone": True, "undone_at": datetime.utcnow()}}
    )
    
    return {"message": "Activity undone successfully"}
