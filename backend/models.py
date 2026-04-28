from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class UserRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class ColumnType(str, Enum):
    TEXT = "text"
    STATUS = "status"
    PERSON = "person"
    DATE = "date"
    TIMELINE = "timeline"
    NUMBERS = "numbers"
    PRIORITY = "priority"
    TAGS = "tags"
    FILES = "files"
    CHECKBOX = "checkbox"
    LINK = "link"
    FORMULA = "formula"


class ViewType(str, Enum):
    TABLE = "table"
    KANBAN = "kanban"
    TIMELINE = "timeline"
    CALENDAR = "calendar"
    CHART = "chart"


class AutomationTrigger(str, Enum):
    STATUS_CHANGE = "status_change"
    DATE_ARRIVES = "date_arrives"
    ITEM_CREATED = "item_created"
    PERSON_ASSIGNED = "person_assigned"


class AutomationAction(str, Enum):
    SEND_NOTIFICATION = "send_notification"
    CHANGE_STATUS = "change_status"
    ASSIGN_PERSON = "assign_person"
    CREATE_ITEM = "create_item"
    MOVE_TO_GROUP = "move_to_group"


# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    avatar: Optional[str] = None
    role: UserRole = UserRole.MEMBER
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserInDB(User):
    hashed_password: str


# Workspace Models
class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None


class Workspace(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    owner_id: str
    member_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Board Models
class ColumnOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    color: str


class BoardColumn(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    type: ColumnType
    width: int = 150
    options: List[ColumnOption] = []  # For status, priority, tags
    settings: Dict[str, Any] = {}  # For numbers: {unit, decimals, direction}, formula: {expression}


class BoardCreate(BaseModel):
    name: str
    workspace_id: str
    description: Optional[str] = None


class Board(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    workspace_id: str
    description: Optional[str] = None
    folder_id: Optional[str] = None
    columns: List[BoardColumn] = []
    chart_configs: List[Dict[str, Any]] = []
    owner_id: str
    member_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Folder Models
class FolderCreate(BaseModel):
    name: str
    workspace_id: str

class Folder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    workspace_id: str
    owner_id: str
    color: str = "#6366f1"
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Item Models
class ItemCreate(BaseModel):
    board_id: str
    group_id: Optional[str] = None
    name: str
    column_values: Dict[str, Any] = {}
    position: Optional[int] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    column_values: Optional[Dict[str, Any]] = None
    group_id: Optional[str] = None
    position: Optional[int] = None


class Item(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    board_id: str
    group_id: Optional[str] = None
    name: str
    column_values: Dict[str, Any] = {}
    position: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str


# Group Models
class GroupCreate(BaseModel):
    board_id: str
    title: str
    color: str = "#0086c0"


class Group(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    board_id: str
    title: str
    color: str = "#0086c0"
    position: int = 0
    collapsed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Update/Comment Models
class UpdateCreate(BaseModel):
    item_id: str
    content: str


class Update(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    content: str
    user_id: str
    user_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


# View Models
class ViewCreate(BaseModel):
    board_id: str
    name: str
    type: ViewType
    settings: Dict[str, Any] = {}


class View(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    board_id: str
    name: str
    type: ViewType
    settings: Dict[str, Any] = {}
    is_default: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Automation Models
class AutomationCreate(BaseModel):
    board_id: str
    name: str
    trigger: AutomationTrigger
    trigger_config: Dict[str, Any]
    action: AutomationAction
    action_config: Dict[str, Any]


class Automation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    board_id: str
    name: str
    trigger: AutomationTrigger
    trigger_config: Dict[str, Any]
    action: AutomationAction
    action_config: Dict[str, Any]
    enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Dashboard Models
class DashboardWidgetCreate(BaseModel):
    dashboard_id: str
    type: str
    title: str
    board_ids: List[str]
    settings: Dict[str, Any] = {}


class DashboardWidget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dashboard_id: str
    type: str  # chart, numbers, timeline, battery
    title: str
    board_ids: List[str]
    settings: Dict[str, Any] = {}
    position: Dict[str, int] = {"x": 0, "y": 0, "w": 4, "h": 3}


class DashboardCreate(BaseModel):
    workspace_id: str
    name: str


class Dashboard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    name: str
    widgets: List[DashboardWidget] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
