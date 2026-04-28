"""
Iteration 12 backend tests:
- GET /api/boards/{id}/members/list returns real member records
- POST /api/automations (status_change -> move_to_group)
- PUT /api/items/{id} triggers automation when status changes to target value
- Activity logging for create/delete/bulk-move items
- GET /api/activity/board/{id} surfaces created/deleted/renamed/updated/moved/bulk_moved
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

USER1 = {"email": "testuser@acuity.com", "password": "TestPass123!"}
USER2 = {"email": "user2@acuity.com", "password": "TestPass123!"}
PIPELINE_BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def token1():
    r = requests.post(f"{API}/auth/login", json=USER1, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers1(token1):
    return {"Authorization": f"Bearer {token1}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def board(headers1):
    r = requests.get(f"{API}/boards/{PIPELINE_BOARD_ID}", headers=headers1, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def status_column(board):
    for col in board.get("columns", []):
        if col.get("type") == "status":
            return col
    pytest.skip("No status column on pipeline board")


@pytest.fixture(scope="module")
def groups(headers1):
    r = requests.get(f"{API}/groups/board/{PIPELINE_BOARD_ID}", headers=headers1, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Members list ----------
class TestMembersList:
    def test_members_list_returns_real_users(self, headers1):
        r = requests.get(f"{API}/boards/{PIPELINE_BOARD_ID}/members/list", headers=headers1, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        for m in data:
            assert "id" in m and "name" in m and "email" in m
        emails = {m["email"] for m in data}
        assert USER1["email"] in emails


# ---------- Automation create + engine ----------
@pytest.fixture(scope="module")
def target_group_nfa(groups):
    for g in groups:
        if g.get("title", "").upper() == "NFA":
            return g
    pytest.skip("NFA group not found")


@pytest.fixture(scope="module")
def pipeline_group(groups):
    for g in groups:
        if g.get("title", "").lower() == "pipeline":
            return g
    # fallback: first group
    return groups[0] if groups else None


@pytest.fixture(scope="module")
def status_option_value(status_column):
    """Get an option value we'll use as automation trigger target."""
    options = status_column.get("options") or status_column.get("labels") or []
    # options could be a list of strings or dicts
    if isinstance(options, list) and options:
        first = options[0]
        if isinstance(first, dict):
            return first.get("label") or first.get("value") or first.get("name")
        return first
    return "NFA"


class TestAutomationCreateAndExecute:
    created_automation_id = None
    created_item_id = None

    def test_create_status_change_move_to_group_automation(self, headers1, status_column, target_group_nfa, status_option_value):
        payload = {
            "board_id": PIPELINE_BOARD_ID,
            "name": f"TEST_auto_{uuid.uuid4().hex[:6]}",
            "trigger": "status_change",
            "trigger_config": {"column_id": status_column["id"], "value": status_option_value},
            "action": "move_to_group",
            "action_config": {"group_id": target_group_nfa["id"]},
        }
        r = requests.post(f"{API}/automations", headers=headers1, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["trigger"] == "status_change"
        assert data["action"] == "move_to_group"
        assert data["trigger_config"]["column_id"] == status_column["id"]
        assert data["action_config"]["group_id"] == target_group_nfa["id"]
        assert data["enabled"] is True
        TestAutomationCreateAndExecute.created_automation_id = data["id"]

    def test_automation_listed_for_board(self, headers1):
        r = requests.get(f"{API}/automations/board/{PIPELINE_BOARD_ID}", headers=headers1, timeout=30)
        assert r.status_code == 200
        ids = [a["id"] for a in r.json()]
        assert TestAutomationCreateAndExecute.created_automation_id in ids

    def test_update_item_status_triggers_move(self, headers1, pipeline_group, status_column, status_option_value, target_group_nfa):
        # Create an item in pipeline group
        item_payload = {
            "board_id": PIPELINE_BOARD_ID,
            "group_id": pipeline_group["id"],
            "name": f"TEST_autoitem_{uuid.uuid4().hex[:6]}",
            "column_values": {},
        }
        r = requests.post(f"{API}/items", headers=headers1, json=item_payload, timeout=30)
        assert r.status_code == 200, r.text
        item = r.json()
        TestAutomationCreateAndExecute.created_item_id = item["id"]
        assert item["group_id"] == pipeline_group["id"]

        # Update its status column to the automation's target value
        update_payload = {
            "column_values": {status_column["id"]: status_option_value},
        }
        r2 = requests.put(f"{API}/items/{item['id']}", headers=headers1, json=update_payload, timeout=30)
        assert r2.status_code == 200, r2.text

        # Wait briefly for engine to run (it awaits in same request, but be safe)
        time.sleep(0.5)

        # Verify item moved to target group
        r3 = requests.get(f"{API}/items/{item['id']}", headers=headers1, timeout=30)
        assert r3.status_code == 200
        moved = r3.json()
        assert moved["group_id"] == target_group_nfa["id"], f"Item did not move. Still in {moved['group_id']}"

    def test_cleanup_automation(self, headers1):
        aid = TestAutomationCreateAndExecute.created_automation_id
        if aid:
            r = requests.delete(f"{API}/automations/{aid}", headers=headers1, timeout=30)
            assert r.status_code in (200, 204)

    def test_cleanup_item(self, headers1):
        iid = TestAutomationCreateAndExecute.created_item_id
        if iid:
            requests.delete(f"{API}/items/{iid}", headers=headers1, timeout=30)


# ---------- Activity logging ----------
class TestActivityLogging:
    def test_create_delete_bulk_move_log_activities(self, headers1, pipeline_group, target_group_nfa):
        # Create item
        name = f"TEST_act_{uuid.uuid4().hex[:6]}"
        r = requests.post(
            f"{API}/items",
            headers=headers1,
            json={"board_id": PIPELINE_BOARD_ID, "group_id": pipeline_group["id"], "name": name, "column_values": {}},
            timeout=30,
        )
        assert r.status_code == 200
        item_id = r.json()["id"]

        # Bulk-move to NFA
        r2 = requests.post(
            f"{API}/items/bulk-move",
            headers=headers1,
            json={"item_ids": [item_id], "target_group_id": target_group_nfa["id"]},
            timeout=30,
        )
        assert r2.status_code == 200
        assert r2.json().get("moved") == 1

        # Delete item
        r3 = requests.delete(f"{API}/items/{item_id}", headers=headers1, timeout=30)
        assert r3.status_code == 200

        time.sleep(0.3)

        # Check activity feed
        r4 = requests.get(f"{API}/activity/board/{PIPELINE_BOARD_ID}?limit=500", headers=headers1, timeout=30)
        assert r4.status_code == 200
        activities = r4.json()
        actions_for_item = [a for a in activities if a.get("item_id") == item_id or a.get("item_name") == name]
        action_set = {a["action"] for a in actions_for_item}
        # bulk_moved may have empty item_id, check separately by item_name pattern
        assert "created" in action_set, f"created missing. actions seen: {action_set}"
        assert "deleted" in action_set, f"deleted missing. actions seen: {action_set}"

        # bulk_moved activity uses item_name like '1 items'
        bulk = [a for a in activities if a.get("action") == "bulk_moved"]
        assert len(bulk) >= 1, "No bulk_moved activity logged"

    def test_activity_contains_automation_move(self, headers1):
        """An Automation-actor 'moved' activity should exist from previous/current runs."""
        r = requests.get(f"{API}/activity/board/{PIPELINE_BOARD_ID}?limit=500", headers=headers1, timeout=30)
        assert r.status_code == 200
        acts = r.json()
        auto_moves = [a for a in acts if a.get("action") == "moved" and a.get("user_name") == "Automation"]
        # Not strictly required to exist if engine never fired, but TestAutomationCreateAndExecute should have produced one
        assert len(auto_moves) >= 1, "No Automation-actor move activity found"
