from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# Import route modules
from routes import auth_routes, workspace_routes, board_routes, item_routes
from routes import group_routes, update_routes, automation_routes, dashboard_routes
from routes import activity_routes, permission_routes, ai_agent_routes, team_routes
from routes import folder_routes, import_routes, export_routes
from routes import ws_routes
from routes import notification_routes
from routes import view_routes


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check
@api_router.get("/")
async def root():
    return {"message": "Acuity Work Management API"}

# Include all route modules
api_router.include_router(auth_routes.router)
api_router.include_router(workspace_routes.router)
api_router.include_router(board_routes.router)
api_router.include_router(item_routes.router)
api_router.include_router(group_routes.router)
api_router.include_router(update_routes.router)
api_router.include_router(automation_routes.router)
api_router.include_router(dashboard_routes.router)
api_router.include_router(activity_routes.router)
api_router.include_router(permission_routes.router)
api_router.include_router(ai_agent_routes.router)
api_router.include_router(team_routes.router)
api_router.include_router(folder_routes.router)
api_router.include_router(import_routes.router)
api_router.include_router(export_routes.router)
api_router.include_router(notification_routes.router)
api_router.include_router(view_routes.router)

# WebSocket routes (mounted at /api/ws/... via api_router)
api_router.include_router(ws_routes.router)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()