"""Automation execution engine. Called from item_routes when column values change."""
from database import get_db
from routes.activity_helper import log_activity
from datetime import datetime

db = get_db()


async def run_automations_for_item(item_id: str, board_id: str, old_column_values: dict, new_column_values: dict, user_id: str, user_name: str):
    """Check and execute automations when column values change."""
    automations = await db.automations.find({"board_id": board_id, "enabled": True}).to_list(100)

    for auto in automations:
        trigger = auto.get("trigger")
        trigger_config = auto.get("trigger_config", {})
        action = auto.get("action")
        action_config = auto.get("action_config", {})

        if trigger == "status_change":
            column_id = trigger_config.get("column_id")
            target_value = trigger_config.get("value")

            if not column_id or not target_value:
                continue

            old_val = old_column_values.get(column_id)
            new_val = new_column_values.get(column_id)

            # Check if the status actually changed to the target value
            if new_val != old_val and str(new_val) == str(target_value):
                await execute_action(auto, item_id, board_id, action, action_config, user_id, user_name)


async def execute_action(automation: dict, item_id: str, board_id: str, action: str, action_config: dict, user_id: str, user_name: str):
    """Execute an automation action."""
    if action == "move_to_group":
        target_group_id = action_config.get("group_id")
        if not target_group_id:
            return

        item = await db.items.find_one({"id": item_id})
        if not item:
            return

        old_group_id = item.get("group_id")
        await db.items.update_one(
            {"id": item_id},
            {"$set": {"group_id": target_group_id, "updated_at": datetime.utcnow()}}
        )

        # Log the automation action
        target_group = await db.groups.find_one({"id": target_group_id})
        group_name = target_group.get("title", "Unknown") if target_group else "Unknown"
        await log_activity(
            board_id=board_id,
            user_id="system",
            user_name="Automation",
            action="moved",
            item_name=item.get("name", ""),
            column_name="Group",
            old_value=old_group_id or "",
            new_value=group_name,
            item_id=item_id,
        )

    elif action == "change_status":
        column_id = action_config.get("column_id")
        value = action_config.get("value")
        if column_id and value:
            await db.items.update_one(
                {"id": item_id},
                {"$set": {f"column_values.{column_id}": value, "updated_at": datetime.utcnow()}}
            )

    elif action == "send_notification":
        from routes.notification_routes import create_notification
        item = await db.items.find_one({"id": item_id})
        board = await db.boards.find_one({"id": board_id})
        item_name = item.get("name", "an item") if item else "an item"
        auto_name = automation.get("name", "Automation")
        for mid in (board or {}).get("member_ids", []):
            await create_notification(
                user_id=mid,
                type="automation",
                title="Automation triggered",
                message=f'"{auto_name}" triggered on "{item_name}"',
                board_id=board_id,
                item_id=item_id,
                actor_id="system",
                actor_name="Automation",
            )
