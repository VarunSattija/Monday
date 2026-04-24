from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from datetime import datetime
from database import get_db

router = APIRouter(prefix="/activity", tags=["activity"])
db = get_db()


@router.get("/board/{board_id}")
async def get_board_activities(
    board_id: str,
    limit: int = 200,
    current_user: dict = Depends(get_current_user)
):
    activities = await db.activities.find(
        {"board_id": board_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return activities


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
        item = await db.items.find_one({"id": activity["item_id"]})
        if item:
            await db.items.update_one(
                {"id": activity["item_id"]},
                {"$set": activity["previous_state"]}
            )

    await db.activities.update_one(
        {"id": activity_id},
        {"$set": {"undone": True, "undone_at": datetime.utcnow()}}
    )

    return {"message": "Activity undone successfully"}
