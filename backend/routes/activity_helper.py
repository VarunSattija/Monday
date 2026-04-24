"""Activity logging helper. Import and call log_activity from any route."""
from database import get_db
from datetime import datetime
import uuid

db = get_db()


async def log_activity(
    board_id: str,
    user_id: str,
    user_name: str,
    action: str,
    item_name: str = "",
    column_name: str = "",
    old_value: str = "",
    new_value: str = "",
    item_id: str = "",
    previous_state: dict = None,
):
    activity = {
        "id": str(uuid.uuid4()),
        "board_id": board_id,
        "user_id": user_id,
        "user_name": user_name,
        "action": action,
        "item_name": item_name,
        "column_name": column_name,
        "old_value": old_value,
        "new_value": new_value,
        "item_id": item_id,
        "previous_state": previous_state or {},
        "created_at": datetime.utcnow(),
    }
    await db.activities.insert_one(activity)
