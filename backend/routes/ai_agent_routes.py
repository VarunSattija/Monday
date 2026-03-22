from fastapi import APIRouter, HTTPException, Depends
from models import BaseModel
from auth import get_current_user
from typing import List, Optional
from datetime import datetime
from database import get_db
import uuid

router = APIRouter(prefix="/ai-agents", tags=["ai-agents"])
db = get_db()

class AIAgent(BaseModel):
    id: str = None
    name: str
    description: Optional[str] = None
    type: str  # data_analyst, task_manager, content_creator, qa_assistant, automation_helper
    board_ids: List[str] = []
    capabilities: List[str] = []
    enabled: bool = True
    owner_id: str = None
    created_at: datetime = None
    last_active: Optional[datetime] = None
    insights_generated: int = 0
    tasks_completed: int = 0

    def __init__(self, **data):
        super().__init__(**data)
        if self.id is None:
            self.id = str(uuid.uuid4())
        if self.created_at is None:
            self.created_at = datetime.utcnow()


class AIAgentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str
    board_ids: List[str] = []
    capabilities: List[str] = []
    enabled: bool = True


@router.post("", response_model=AIAgent)
async def create_ai_agent(
    agent_data: AIAgentCreate,
    current_user: dict = Depends(get_current_user)
):
    agent = AIAgent(
        **agent_data.dict(),
        owner_id=current_user["id"]
    )
    await db.ai_agents.insert_one(agent.dict())
    return agent


@router.get("", response_model=List[AIAgent])
async def get_ai_agents(
    current_user: dict = Depends(get_current_user)
):
    agents = await db.ai_agents.find({"owner_id": current_user["id"]}).to_list(1000)
    return [AIAgent(**agent) for agent in agents]


@router.get("/{agent_id}", response_model=AIAgent)
async def get_ai_agent(
    agent_id: str,
    current_user: dict = Depends(get_current_user)
):
    agent = await db.ai_agents.find_one({"id": agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="AI Agent not found")
    return AIAgent(**agent)


@router.put("/{agent_id}/toggle")
async def toggle_ai_agent(
    agent_id: str,
    current_user: dict = Depends(get_current_user)
):
    agent = await db.ai_agents.find_one({"id": agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="AI Agent not found")
    
    new_enabled = not agent["enabled"]
    await db.ai_agents.update_one(
        {"id": agent_id},
        {"$set": {"enabled": new_enabled, "last_active": datetime.utcnow()}}
    )
    
    return {"enabled": new_enabled}


@router.delete("/{agent_id}")
async def delete_ai_agent(
    agent_id: str,
    current_user: dict = Depends(get_current_user)
):
    agent = await db.ai_agents.find_one({"id": agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="AI Agent not found")
    
    if agent["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.ai_agents.delete_one({"id": agent_id})
    return {"message": "AI Agent deleted successfully"}


@router.post("/{agent_id}/execute")
async def execute_ai_agent(
    agent_id: str,
    prompt: str,
    current_user: dict = Depends(get_current_user)
):
    agent = await db.ai_agents.find_one({"id": agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="AI Agent not found")
    
    if not agent["enabled"]:
        raise HTTPException(status_code=400, detail="AI Agent is disabled")
    
    # Simulate AI agent execution
    response = {
        "agent_id": agent_id,
        "agent_name": agent["name"],
        "agent_type": agent["type"],
        "prompt": prompt,
        "response": f"AI Agent '{agent['name']}' processed your request. This is a simulated response. In production, this would connect to an actual AI service.",
        "actions_taken": [],
        "insights": [],
        "timestamp": datetime.utcnow()
    }
    
    # Update agent statistics
    await db.ai_agents.update_one(
        {"id": agent_id},
        {
            "$set": {"last_active": datetime.utcnow()},
            "$inc": {"tasks_completed": 1}
        }
    )
    
    return response
