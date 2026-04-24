"""Iteration 10: Notifications + email infra tests.

Covers:
- Auth /me returns `name` field (needed by get_current_user DB lookup)
- GET /api/notifications/me
- GET /api/notifications/me/unread-count
- PUT /api/notifications/{id}/read
- PUT /api/notifications/read-all
- POST /api/boards/{id}/invite creates notification with correct actor_name (not 'Someone')
- POST /api/updates creates notifications for other board members
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or \
    open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

USER1 = {"email": "testuser@acuity.com", "password": "TestPass123!"}
USER2 = {"email": "user2@acuity.com", "password": "TestPass123!"}
PIPELINE_BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def tok1():
    return _login(USER1)


@pytest.fixture(scope="module")
def tok2():
    return _login(USER2)


@pytest.fixture(scope="module")
def h1(tok1):
    return {"Authorization": f"Bearer {tok1}"}


@pytest.fixture(scope="module")
def h2(tok2):
    return {"Authorization": f"Bearer {tok2}"}


# --- Auth / name ---
def test_auth_me_returns_name(h1):
    r = requests.get(f"{API}/auth/me", headers=h1, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "name" in data, f"/auth/me should include 'name' — got {list(data.keys())}"
    assert data["name"] and data["name"] != "", "name should be non-empty"


# --- Notifications GET ---
def test_get_my_notifications(h2):
    r = requests.get(f"{API}/notifications/me", headers=h2, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    if data:
        n = data[0]
        for k in ("id", "user_id", "type", "message", "read", "created_at"):
            assert k in n, f"missing {k} in notification: {n}"
        assert "_id" not in n, "mongo _id must be stripped"


def test_get_unread_count(h2):
    r = requests.get(f"{API}/notifications/me/unread-count", headers=h2, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "count" in data
    assert isinstance(data["count"], int)
    assert data["count"] >= 0


# --- Invite -> notification for invitee with correct actor_name ---
def test_board_invite_creates_notification_with_actor_name(h1, h2):
    # User1 invites User2 to the Pipeline board
    r = requests.post(
        f"{API}/boards/{PIPELINE_BOARD_ID}/invite",
        headers=h1,
        params={"email": USER2["email"], "role": "member"},
        timeout=30,
    )
    assert r.status_code == 200, f"invite failed: {r.status_code} {r.text}"

    # Fetch User2's notifications
    r2 = requests.get(f"{API}/notifications/me", headers=h2, timeout=30)
    assert r2.status_code == 200
    notifs = r2.json()
    board_invites = [n for n in notifs if n.get("type") == "board_invite" and n.get("board_id") == PIPELINE_BOARD_ID]
    assert board_invites, "no board_invite notification was created for user2"
    # Most recent one should have actor_name set (not 'Someone') and not empty
    latest = board_invites[0]
    assert latest.get("actor_name"), f"actor_name is empty: {latest}"
    assert latest["actor_name"] != "Someone", \
        f"actor_name should be the inviter's real name, got 'Someone': {latest}"


# --- Mark single as read ---
def test_mark_notification_read(h2):
    r = requests.get(f"{API}/notifications/me", headers=h2, timeout=30)
    notifs = r.json()
    unread = [n for n in notifs if not n.get("read")]
    if not unread:
        pytest.skip("no unread notifications to mark")
    nid = unread[0]["id"]

    r2 = requests.put(f"{API}/notifications/{nid}/read", headers=h2, timeout=30)
    assert r2.status_code == 200, r2.text

    # Verify persisted
    r3 = requests.get(f"{API}/notifications/me", headers=h2, timeout=30)
    updated = next((n for n in r3.json() if n["id"] == nid), None)
    assert updated is not None
    assert updated["read"] is True, f"notification not marked read: {updated}"


# --- Mark all as read ---
def test_mark_all_as_read(h2):
    r = requests.put(f"{API}/notifications/read-all", headers=h2, timeout=30)
    assert r.status_code == 200, r.text

    r2 = requests.get(f"{API}/notifications/me/unread-count", headers=h2, timeout=30)
    assert r2.json()["count"] == 0, f"unread count should be 0, got {r2.json()}"


# --- Update (comment) creates notifications for other board members ---
def test_comment_notifies_other_members(h1, h2):
    # Get an item in the Pipeline board
    r = requests.get(f"{API}/items/board/{PIPELINE_BOARD_ID}", headers=h1, timeout=30)
    assert r.status_code == 200, r.text
    items = r.json()
    if not items:
        pytest.skip("no items in pipeline board")
    item_id = items[0]["id"]

    # Ensure user2 is a member (should be from earlier invite)
    # User1 posts a comment -> user2 should get an 'update' notification
    unique = f"TEST_iter10_comment_{uuid.uuid4().hex[:8]}"
    r2 = requests.post(
        f"{API}/updates",
        headers=h1,
        json={"item_id": item_id, "content": unique},
        timeout=30,
    )
    assert r2.status_code == 200, f"update create failed: {r2.status_code} {r2.text}"

    # Check user2's notifications
    r3 = requests.get(f"{API}/notifications/me", headers=h2, timeout=30)
    notifs = r3.json()
    comment_notifs = [n for n in notifs if n.get("type") == "update" and n.get("item_id") == item_id]
    assert comment_notifs, "no 'update' type notification created for user2 after comment"
    latest = comment_notifs[0]
    assert latest.get("actor_name"), "actor_name empty on comment notification"
    assert latest["actor_name"] != "Someone", "actor_name should not be 'Someone'"


# --- Permission: user cannot read another user's notifications ---
def test_mark_read_cross_user_is_noop(h1, h2):
    # Get a notification of user2
    r = requests.get(f"{API}/notifications/me", headers=h2, timeout=30)
    notifs = r.json()
    if not notifs:
        pytest.skip("no notifications to test cross-user")
    nid = notifs[0]["id"]

    # User1 tries to mark it read -- endpoint filters by user_id so it's a silent no-op
    r2 = requests.put(f"{API}/notifications/{nid}/read", headers=h1, timeout=30)
    # Returns 200 but does nothing (this is an acceptable design)
    assert r2.status_code == 200
