"""
Iteration 14 tests:
- Team invite no longer requires existing membership
- Team remove member works for any member (not just admin)
- Board Views CRUD
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://acuity-team-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

USER1 = {"email": "testuser@acuity.com", "password": "TestPass123!"}
USER2 = {"email": "user2@acuity.com", "password": "TestPass123!"}
TEAM_NAME = "Acuity-Professional"
BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"


def login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def token1():
    return login(USER1)


@pytest.fixture(scope="module")
def token2():
    return login(USER2)


@pytest.fixture(scope="module")
def team(token1):
    r = requests.get(f"{API}/teams/by-name/{TEAM_NAME}", headers=auth_headers(token1), timeout=30)
    assert r.status_code == 200, f"team lookup failed: {r.status_code} {r.text}"
    return r.json()


# ============== TEAM INVITE TESTS ==============
class TestTeamInvite:
    def test_invite_new_member_no_membership_check(self, token1, team):
        new_email = f"TEST_invite_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(
            f"{API}/teams/{team['id']}/invite",
            json={"email": new_email, "role": "member"},
            headers=auth_headers(token1),
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        body = r.json()
        assert "Invitation sent" in body.get("message", "")
        assert body["member"]["email"] == new_email
        assert body["member"]["status"] == "invited"

        # Verify persistence
        g = requests.get(f"{API}/teams/{team['id']}", headers=auth_headers(token1), timeout=30)
        assert g.status_code == 200
        emails = [m["email"] for m in g.json()["members"]]
        assert new_email in emails

    def test_invite_does_not_require_being_member(self, team):
        """User who isn't part of the team should still be able to invite (anyone authenticated)."""
        # Register a brand new user
        new_email = f"TEST_outsider_{uuid.uuid4().hex[:8]}@example.com"
        reg = requests.post(
            f"{API}/auth/register",
            json={"email": new_email, "password": "TestPass123!", "name": "Outsider"},
            timeout=30,
        )
        if reg.status_code not in (200, 201):
            pytest.skip(f"register failed: {reg.status_code} {reg.text}")
        outsider_token = reg.json().get("access_token") or login({"email": new_email, "password": "TestPass123!"})

        invite_email = f"TEST_inv_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(
            f"{API}/teams/{team['id']}/invite",
            json={"email": invite_email, "role": "member"},
            headers=auth_headers(outsider_token),
            timeout=30,
        )
        assert r.status_code == 200, f"Non-member should be able to invite. Got: {r.status_code} {r.text}"


# ============== TEAM REMOVE TESTS ==============
class TestTeamRemove:
    def test_member_can_remove_invited_member(self, token1, team):
        # Invite a member first
        invite_email = f"TEST_rem_{uuid.uuid4().hex[:8]}@example.com"
        inv = requests.post(
            f"{API}/teams/{team['id']}/invite",
            json={"email": invite_email, "role": "member"},
            headers=auth_headers(token1),
            timeout=30,
        )
        assert inv.status_code == 200
        invited_user_id = inv.json()["member"]["user_id"]

        # Remove them as a regular team member
        r = requests.delete(
            f"{API}/teams/{team['id']}/members/{invited_user_id}",
            headers=auth_headers(token1),
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        assert "removed" in r.json().get("message", "").lower()

        # Verify status updated to removed
        g = requests.get(f"{API}/teams/{team['id']}", headers=auth_headers(token1), timeout=30)
        statuses = {m["user_id"]: m["status"] for m in g.json()["members"]}
        assert statuses.get(invited_user_id) == "removed"

    def test_cannot_remove_self(self, token1, team):
        # Find current user's id
        me = requests.get(f"{API}/auth/me", headers=auth_headers(token1), timeout=30)
        assert me.status_code == 200
        my_id = me.json()["id"]
        r = requests.delete(
            f"{API}/teams/{team['id']}/members/{my_id}",
            headers=auth_headers(token1),
            timeout=30,
        )
        assert r.status_code == 400


# ============== BOARD VIEWS TESTS ==============
class TestBoardViews:
    created_view_id = None

    def test_create_view(self, token1):
        payload = {
            "board_id": BOARD_ID,
            "name": f"TEST_View_{uuid.uuid4().hex[:6]}",
            "filters": {"status": "Working on it"},
            "sort": {"field": "name", "direction": "asc"},
            "group_by": "status",
            "hidden_columns": ["priority"],
        }
        r = requests.post(f"{API}/views", json=payload, headers=auth_headers(token1), timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        v = r.json()
        assert v["name"] == payload["name"]
        assert v["board_id"] == BOARD_ID
        assert v["filters"] == payload["filters"]
        assert v["group_by"] == "status"
        assert v["hidden_columns"] == ["priority"]
        assert "id" in v
        assert "_id" not in v
        TestBoardViews.created_view_id = v["id"]

    def test_list_views_includes_created(self, token1):
        assert TestBoardViews.created_view_id, "Run create test first"
        r = requests.get(f"{API}/views/board/{BOARD_ID}", headers=auth_headers(token1), timeout=30)
        assert r.status_code == 200
        views = r.json()
        assert isinstance(views, list)
        assert any(v["id"] == TestBoardViews.created_view_id for v in views)
        for v in views:
            assert "_id" not in v

    def test_create_view_missing_fields(self, token1):
        r = requests.post(f"{API}/views", json={"name": "x"}, headers=auth_headers(token1), timeout=30)
        assert r.status_code == 400

    def test_delete_view(self, token1):
        assert TestBoardViews.created_view_id, "Run create test first"
        r = requests.delete(
            f"{API}/views/{TestBoardViews.created_view_id}",
            headers=auth_headers(token1),
            timeout=30,
        )
        assert r.status_code == 200

        # Verify it's gone
        g = requests.get(f"{API}/views/board/{BOARD_ID}", headers=auth_headers(token1), timeout=30)
        assert g.status_code == 200
        assert not any(v["id"] == TestBoardViews.created_view_id for v in g.json())

    def test_delete_nonexistent_view(self, token1):
        r = requests.delete(f"{API}/views/{uuid.uuid4()}", headers=auth_headers(token1), timeout=30)
        assert r.status_code == 404

    def test_views_require_auth(self):
        r = requests.get(f"{API}/views/board/{BOARD_ID}", timeout=30)
        assert r.status_code in (401, 403)
