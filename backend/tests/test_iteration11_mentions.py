"""Iteration 11 - @mentions in comments and mention notifications."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend/.env if not in testing env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                    break
    except Exception:
        pass

PIPELINE_BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"
USER1 = {"email": "testuser@acuity.com", "password": "TestPass123!"}
USER2 = {"email": "user2@acuity.com", "password": "TestPass123!"}


def _login(payload):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=payload, timeout=15)
    assert r.status_code == 200, f"Login failed for {payload['email']}: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in login response: {data}"
    return token, data.get("user", {})


@pytest.fixture(scope="module")
def auth_u1():
    token, user = _login(USER1)
    return {"token": token, "user": user, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="module")
def auth_u2():
    token, user = _login(USER2)
    return {"token": token, "user": user, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="module")
def first_item(auth_u1):
    r = requests.get(f"{BASE_URL}/api/items/board/{PIPELINE_BOARD_ID}", headers=auth_u1["headers"], timeout=15)
    assert r.status_code == 200, f"items fetch failed: {r.status_code} {r.text}"
    items = r.json()
    assert len(items) > 0, "No items found in pipeline board"
    # Prefer "Boniface" if present
    for it in items:
        if (it.get("name") or "").lower().startswith("boniface"):
            return it
    return items[0]


class TestBoardMembersList:
    """GET /api/boards/{board_id}/members/list"""

    def test_members_list_ok(self, auth_u1):
        r = requests.get(
            f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}/members/list",
            headers=auth_u1["headers"],
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        for m in data:
            assert "id" in m and "name" in m and "email" in m
            # ensure no mongo _id leak
            assert "_id" not in m
        # ensure User 2 is included
        emails = [m["email"] for m in data]
        assert USER2["email"] in emails, f"User 2 not in members list: {emails}"

    def test_members_list_unauth(self):
        r = requests.get(
            f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}/members/list", timeout=15
        )
        assert r.status_code in (401, 403)


class TestMentionNotification:
    """POST /api/updates with @mention creates 'mention' notification."""

    def test_mention_creates_mention_notification(self, auth_u1, auth_u2, first_item):
        # Find User 2's name via members/list
        r = requests.get(
            f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}/members/list",
            headers=auth_u1["headers"],
            timeout=15,
        )
        assert r.status_code == 200
        members = r.json()
        u2 = next((m for m in members if m["email"] == USER2["email"]), None)
        assert u2, "User 2 not found"
        u2_name = u2["name"]

        content = f"Hello @{u2_name} please review (TEST_mention)"
        payload = {"item_id": first_item["id"], "content": content}
        r = requests.post(
            f"{BASE_URL}/api/updates",
            json=payload,
            headers=auth_u1["headers"],
            timeout=15,
        )
        assert r.status_code == 200, f"create update failed: {r.status_code} {r.text}"
        update = r.json()
        assert update.get("content") == content
        assert "id" in update

        # Fetch User 2 notifications
        r = requests.get(
            f"{BASE_URL}/api/notifications/me", headers=auth_u2["headers"], timeout=15
        )
        assert r.status_code == 200, f"notif fetch: {r.status_code} {r.text}"
        notifs = r.json()
        # Find most recent mention-type notification matching this actor + item
        mention = None
        for n in notifs:
            if (
                n.get("type") == "mention"
                and n.get("item_id") == first_item["id"]
                and n.get("actor_id") == auth_u1["user"].get("id")
            ):
                mention = n
                break
        assert mention is not None, f"Mention notification not found. Got: {[(n.get('type'), n.get('title')) for n in notifs[:5]]}"
        assert mention.get("title") == "You were mentioned"
        # message includes actor name and item name
        actor_name = auth_u1["user"].get("name") or ""
        item_name = first_item.get("name") or ""
        assert actor_name in (mention.get("message") or "")
        assert item_name in (mention.get("message") or "")
        assert mention.get("board_id") == PIPELINE_BOARD_ID

    def test_no_mention_creates_update_notification(self, auth_u1, auth_u2, first_item):
        content = "Plain comment without tag (TEST_no_mention)"
        payload = {"item_id": first_item["id"], "content": content}
        r = requests.post(
            f"{BASE_URL}/api/updates",
            json=payload,
            headers=auth_u1["headers"],
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"

        # U2 should get an 'update' type notification (since U2 is a board member)
        r = requests.get(
            f"{BASE_URL}/api/notifications/me", headers=auth_u2["headers"], timeout=15
        )
        assert r.status_code == 200
        notifs = r.json()
        # Look for most recent 'update' notif with this actor + item
        found = None
        for n in notifs:
            if (
                n.get("type") == "update"
                and n.get("item_id") == first_item["id"]
                and n.get("actor_id") == auth_u1["user"].get("id")
            ):
                found = n
                break
        assert found is not None, "Expected an 'update' notification for plain comment"
        assert found.get("title") in ("New comment", "New update") or "update" in (
            found.get("title") or ""
        ).lower()

    def test_mention_not_double_notified(self, auth_u1, auth_u2, first_item):
        """When user is @mentioned, they should get only 'mention' (not also 'update') for same update."""
        r = requests.get(
            f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}/members/list",
            headers=auth_u1["headers"],
            timeout=15,
        )
        members = r.json()
        u2 = next((m for m in members if m["email"] == USER2["email"]), None)
        u2_name = u2["name"]

        content = f"Quick ping @{u2_name} (TEST_dedupe_mention)"
        before = requests.get(
            f"{BASE_URL}/api/notifications/me", headers=auth_u2["headers"], timeout=15
        ).json()
        before_ids = {n.get("id") for n in before}

        r = requests.post(
            f"{BASE_URL}/api/updates",
            json={"item_id": first_item["id"], "content": content},
            headers=auth_u1["headers"],
            timeout=15,
        )
        assert r.status_code == 200

        after = requests.get(
            f"{BASE_URL}/api/notifications/me", headers=auth_u2["headers"], timeout=15
        ).json()
        new_notifs = [n for n in after if n.get("id") not in before_ids]
        # Only one new notif expected for this update and it should be 'mention'
        new_for_item = [n for n in new_notifs if n.get("item_id") == first_item["id"]]
        assert len(new_for_item) == 1, f"Expected 1 new notif, got {len(new_for_item)}: {[n.get('type') for n in new_for_item]}"
        assert new_for_item[0].get("type") == "mention"
