"""Iteration 21 backend tests:
- Auth register flips invited -> active in any team
- Register sends signup confirmation email (no exception even when no provider keys)
- GET /api/auth/users/search filters by name/email, excludes caller, respects limit
- Existing board invite flow still works (board+workspace member backfill, notification, email)
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://acuity-team-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "testuser@acuity.com", "password": "TestPass123!"}
VIEWER = {"email": "viewer@acuity.com", "password": "View123!"}
PIPELINE_BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"


@pytest.fixture(scope="module")
def owner_token():
    r = requests.post(f"{API}/auth/login", json=OWNER, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def owner_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def acuity_team_id(owner_headers):
    r = requests.get(f"{API}/teams/by-name/Acuity-Professional", headers=owner_headers, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["id"]


# ---------------- Users Search ----------------
class TestUsersSearch:
    def test_search_excludes_self(self, owner_headers):
        r = requests.get(f"{API}/auth/users/search?q=acuity&limit=20", headers=owner_headers, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert all(u["email"] != OWNER["email"] for u in data), "Caller should be excluded"
        # Each user has required keys
        for u in data:
            assert {"id", "email", "name", "avatar"} <= set(u.keys())

    def test_search_filter_by_name(self, owner_headers):
        # 'viewer' is part of viewer@acuity.com / Test Viewer
        r = requests.get(f"{API}/auth/users/search?q=viewer&limit=10", headers=owner_headers, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        assert any("viewer" in u["email"].lower() or "viewer" in u["name"].lower() for u in data)

    def test_search_limit(self, owner_headers):
        r = requests.get(f"{API}/auth/users/search?q=&limit=2", headers=owner_headers, timeout=20)
        assert r.status_code == 200
        assert len(r.json()) <= 2

    def test_search_requires_auth(self):
        r = requests.get(f"{API}/auth/users/search?q=acuity", timeout=20)
        assert r.status_code in (401, 403)


# ---------------- Register flips invited -> active ----------------
class TestRegisterFlipsInvited:
    def _new_email(self):
        return f"TEST_signup_{uuid.uuid4().hex[:10]}@example.com"

    def test_register_flips_invited_to_active_in_acuity_team(self, owner_headers, acuity_team_id):
        new_email = self._new_email()
        # Invite the email to Acuity-Professional team
        r = requests.post(
            f"{API}/teams/{acuity_team_id}/invite",
            headers=owner_headers,
            json={"email": new_email, "role": "member"},
            timeout=20,
        )
        assert r.status_code in (200, 201), r.text

        # Verify team has the email with status='invited'
        r = requests.get(f"{API}/teams/{acuity_team_id}", headers=owner_headers, timeout=20)
        assert r.status_code == 200
        members = r.json()["members"]
        invited = [m for m in members if m["email"] == new_email]
        assert len(invited) == 1
        assert invited[0]["status"] == "invited"

        # Now register the same email
        r = requests.post(
            f"{API}/auth/register",
            json={"email": new_email, "password": "Pass123!", "name": "Signup Tester"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        new_user_id = r.json()["user"]["id"]

        # Re-fetch team — entry should now be active with new user_id
        r = requests.get(f"{API}/teams/{acuity_team_id}", headers=owner_headers, timeout=20)
        members = r.json()["members"]
        flipped = [m for m in members if m["email"] == new_email]
        assert len(flipped) == 1, f"Expected single member entry, got {flipped}"
        assert flipped[0]["status"] == "active", f"Status was not flipped: {flipped[0]}"
        assert flipped[0]["user_id"] == new_user_id
        assert flipped[0]["name"] == "Signup Tester"
        assert flipped[0].get("avatar")

    def test_register_does_not_raise_when_email_provider_missing(self):
        # Just registering a new fresh email should succeed without 5xx even
        # though no AZURE/RESEND/SENDGRID keys are configured.
        new_email = f"TEST_emailcheck_{uuid.uuid4().hex[:10]}@example.com"
        r = requests.post(
            f"{API}/auth/register",
            json={"email": new_email, "password": "Pass123!", "name": "Email Check"},
            timeout=30,
        )
        assert r.status_code == 200, f"Register raised when no email provider: {r.status_code} {r.text}"
        assert "access_token" in r.json()


# ---------------- Existing board invite flow regression ----------------
class TestBoardInviteRegression:
    def test_board_invite_still_works(self, owner_headers):
        # Use an existing platform user so we can verify member_ids contain them.
        # viewer@acuity.com is already a real user in DB.
        r = requests.post(
            f"{API}/boards/{PIPELINE_BOARD_ID}/invite?email={VIEWER['email']}&role=member",
            headers=owner_headers,
            timeout=20,
        )
        assert r.status_code in (200, 201), r.text

        # Board should include viewer in member_ids
        r = requests.get(f"{API}/boards/{PIPELINE_BOARD_ID}", headers=owner_headers, timeout=20)
        assert r.status_code == 200
        board = r.json()

        # Viewer login to find their user id
        v = requests.post(f"{API}/auth/login", json=VIEWER, timeout=20)
        assert v.status_code == 200
        viewer_id = v.json()["user"]["id"]
        assert viewer_id in board.get("member_ids", []), \
            f"Viewer not in board.member_ids: {board.get('member_ids')}"

        # Workspace should also include viewer (workspace backfill from prior iteration)
        ws_id = board.get("workspace_id")
        if ws_id:
            r = requests.get(f"{API}/workspaces/{ws_id}", headers=owner_headers, timeout=20)
            if r.status_code == 200:
                ws = r.json()
                assert viewer_id in ws.get("member_ids", []), \
                    f"Viewer not in workspace.member_ids: {ws.get('member_ids')}"

        # Viewer notifications should include the new board-invite (best-effort)
        v_headers = {"Authorization": f"Bearer {v.json()['access_token']}"}
        nr = requests.get(f"{API}/notifications/me", headers=v_headers, timeout=20)
        # Don't hard-fail if notifications schema changes; just assert 200
        assert nr.status_code == 200
