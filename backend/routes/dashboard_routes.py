from fastapi import APIRouter, HTTPException, Depends
from models import Dashboard, DashboardCreate, DashboardWidget, DashboardWidgetCreate
from auth import get_current_user
from typing import List
from database import get_db

router = APIRouter(prefix="/dashboards", tags=["dashboards"])
db = get_db()


@router.post("", response_model=Dashboard)
async def create_dashboard(
    dashboard_data: DashboardCreate,
    current_user: dict = Depends(get_current_user)
):
    dashboard = Dashboard(**dashboard_data.dict())
    await db.dashboards.insert_one(dashboard.dict())
    return dashboard


@router.get("/workspace/{workspace_id}", response_model=List[Dashboard])
async def get_workspace_dashboards(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    dashboards = await db.dashboards.find({"workspace_id": workspace_id}).to_list(1000)
    return [Dashboard(**dash) for dash in dashboards]


@router.get("/{dashboard_id}", response_model=Dashboard)
async def get_dashboard(
    dashboard_id: str,
    current_user: dict = Depends(get_current_user)
):
    dashboard = await db.dashboards.find_one({"id": dashboard_id})
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return Dashboard(**dashboard)


@router.post("/{dashboard_id}/widgets", response_model=DashboardWidget)
async def add_widget(
    dashboard_id: str,
    widget_data: DashboardWidgetCreate,
    current_user: dict = Depends(get_current_user)
):
    dashboard = await db.dashboards.find_one({"id": dashboard_id})
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    widget = DashboardWidget(**widget_data.dict())
    
    await db.dashboards.update_one(
        {"id": dashboard_id},
        {"$push": {"widgets": widget.dict()}}
    )
    
    return widget


@router.delete("/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: str,
    current_user: dict = Depends(get_current_user)
):
    dashboard = await db.dashboards.find_one({"id": dashboard_id})
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    await db.dashboards.delete_one({"id": dashboard_id})
    return {"message": "Dashboard deleted successfully"}


@router.delete("/{dashboard_id}/widgets/{widget_id}")
async def delete_widget(
    dashboard_id: str,
    widget_id: str,
    current_user: dict = Depends(get_current_user)
):
    dashboard = await db.dashboards.find_one({"id": dashboard_id})
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    await db.dashboards.update_one(
        {"id": dashboard_id},
        {"$pull": {"widgets": {"id": widget_id}}}
    )
    return {"message": "Widget deleted successfully"}
