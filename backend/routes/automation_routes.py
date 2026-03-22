from fastapi import APIRouter, HTTPException, Depends
from models import Automation, AutomationCreate
from auth import get_current_user
from typing import List
from database import get_db

router = APIRouter(prefix="/automations", tags=["automations"])
db = get_db()


@router.post("", response_model=Automation)
async def create_automation(
    automation_data: AutomationCreate,
    current_user: dict = Depends(get_current_user)
):
    automation = Automation(**automation_data.dict())
    await db.automations.insert_one(automation.dict())
    return automation


@router.get("/board/{board_id}", response_model=List[Automation])
async def get_board_automations(
    board_id: str,
    current_user: dict = Depends(get_current_user)
):
    automations = await db.automations.find({"board_id": board_id}).to_list(1000)
    return [Automation(**auto) for auto in automations]


@router.put("/{automation_id}/toggle")
async def toggle_automation(
    automation_id: str,
    current_user: dict = Depends(get_current_user)
):
    automation = await db.automations.find_one({"id": automation_id})
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    
    new_enabled = not automation["enabled"]
    await db.automations.update_one(
        {"id": automation_id},
        {"$set": {"enabled": new_enabled}}
    )
    
    return {"enabled": new_enabled}


@router.delete("/{automation_id}")
async def delete_automation(
    automation_id: str,
    current_user: dict = Depends(get_current_user)
):
    automation = await db.automations.find_one({"id": automation_id})
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    
    await db.automations.delete_one({"id": automation_id})
    return {"message": "Automation deleted successfully"}
