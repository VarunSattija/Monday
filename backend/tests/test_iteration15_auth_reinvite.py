"""
Iteration 15 tests:
- Forgot password + reset password flow
- Reinvite a removed member
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://acuity-team-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

USER1 = {"email": "testuser@acuity.com", "password": "TestPass123!"}
TEAM_NAME = "Acuity-Professional"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    r = session.post(f"{API}/auth/login", json=USER1, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Auth failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_session(session, auth_token):
    session.headers.update({"Authorization": f"Bearer {auth_token}"})
    return session


@pytest.fixture(scope="module")
def team_id(auth_session):
    r = auth_session.get(f"{API}/teams/by-name/{TEAM_NAME}", timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["id"]


# ---------- Forgot / Reset password ----------

class TestForgotPassword:
    def test_forgot_password_existing_email(self, session):
        r = session.post(f"{API}/auth/forgot-password", json={"email": USER1["email"]}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "message" in data
        assert "reset" in data["message"].lower() or "sent" in data["message"].lower()

    def test_forgot_password_unknown_email_returns_same(self, session):
        # To avoid email enumeration, API should return same 200 message
        r = session.post(f"{API}/auth/forgot-password", json={"email": f"nobody_{uuid.uuid4().hex[:8]}@x.com"}, timeout=15)
        assert r.status_code == 200, r.text

    def test_forgot_password_missing_email(self, session):
        r = session.post(f"{API}/auth/forgot-password", json={}, timeout=15)
        assert r.status_code == 400

    def test_reset_password_invalid_token(self, session):
        r = session.post(f"{API}/auth/reset-password",
                         json={"token": "invalid-token-xyz", "new_password": "NewPass123!"}, timeout=15)
        assert r.status_code == 400

    def test_reset_password_missing_fields(self, session):
        r = session.post(f"{API}/auth/reset-password", json={"token": ""}, timeout=15)
        assert r.status_code == 400

    def test_reset_password_short_password(self, session):
        r = session.post(f"{API}/auth/reset-password", json={"token": "abc", "new_password": "123"}, timeout=15)
        assert r.status_code == 400


class TestForgotPasswordFullCycle:
    """Full cycle: request reset -> fetch token from DB -> reset -> login with new password -> restore."""

    def test_full_reset_cycle(self, session):
        # Step 1: Create throwaway user
        throwaway_email = f"TEST_reset_{uuid.uuid4().hex[:8]}@acuity.com"
        orig_password = "OrigPass123!"
        new_password = "BrandNewPass456!"

        r = session.post(f"{API}/auth/register",
                         json={"email": throwaway_email, "password": orig_password, "name": "Reset Tester"},
                         timeout=15)
        assert r.status_code in (200, 201), r.text

        # Step 2: Ask for reset
        r = session.post(f"{API}/auth/forgot-password", json={"email": throwaway_email}, timeout=15)
        assert r.status_code == 200

        # Step 3: Fetch token from DB (because emails are mocked)
        import pymongo
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        client = pymongo.MongoClient(mongo_url)
        db = client[db_name]
        doc = db.password_resets.find_one({"email": throwaway_email, "used": False},
                                          sort=[("created_at", pymongo.DESCENDING)])
        assert doc is not None, "No reset token found in DB"
        token = doc["token"]

        # Step 4: Reset password
        r = session.post(f"{API}/auth/reset-password",
                         json={"token": token, "new_password": new_password}, timeout=15)
        assert r.status_code == 200, r.text

        # Step 5: Login with new password
        r = session.post(f"{API}/auth/login",
                         json={"email": throwaway_email, "password": new_password}, timeout=15)
        assert r.status_code == 200, r.text

        # Step 6: Old password no longer works
        r = session.post(f"{API}/auth/login",
                         json={"email": throwaway_email, "password": orig_password}, timeout=15)
        assert r.status_code in (400, 401)

        # Step 7: Token cannot be reused
        r = session.post(f"{API}/auth/reset-password",
                         json={"token": token, "new_password": "AnotherPass789!"}, timeout=15)
        assert r.status_code == 400

        # Cleanup
        session.delete(f"{API}/auth/users/delete-by-domain?domain=acuity.com_no")  # no-op safety


# ---------- Reinvite removed member ----------

class TestReinviteRemovedMember:
    def test_reinvite_cycle(self, auth_session, team_id):
        email = f"TEST_reinvite_{uuid.uuid4().hex[:6]}@test.com"

        # 1. Invite fresh email
        r = auth_session.post(f"{API}/teams/{team_id}/invite",
                              json={"email": email, "role": "member"}, timeout=15)
        assert r.status_code == 200, r.text

        # 2. Fetch team, find member by email
        r = auth_session.get(f"{API}/teams/{team_id}", timeout=15)
        assert r.status_code == 200
        members = r.json()["members"]
        match = next((m for m in members if m["email"] == email), None)
        assert match is not None, f"Invited member not found: {email}"
        assert match["status"] == "invited"
        uid = match["user_id"]

        # 3. Remove the member
        r = auth_session.delete(f"{API}/teams/{team_id}/members/{uid}", timeout=15)
        assert r.status_code == 200, r.text

        # 4. Verify status flipped to removed
        r = auth_session.get(f"{API}/teams/{team_id}", timeout=15)
        match = next((m for m in r.json()["members"] if m["user_id"] == uid), None)
        assert match is not None
        assert match["status"] == "removed", f"Expected removed, got {match['status']}"

        # 5. Reinvite same email
        r = auth_session.post(f"{API}/teams/{team_id}/invite",
                              json={"email": email, "role": "member"}, timeout=15)
        assert r.status_code == 200, f"Reinvite failed: {r.status_code} {r.text}"

        # 6. Verify status back to invited
        r = auth_session.get(f"{API}/teams/{team_id}", timeout=15)
        match = next((m for m in r.json()["members"] if m["user_id"] == uid), None)
        assert match is not None
        assert match["status"] == "invited", f"Expected invited after reinvite, got {match['status']}"

        # 7. Can't invite someone who's already invited/active
        r = auth_session.post(f"{API}/teams/{team_id}/invite",
                              json={"email": email, "role": "member"}, timeout=15)
        assert r.status_code == 400

        # Cleanup: remove and leave as removed
        auth_session.delete(f"{API}/teams/{team_id}/members/{uid}", timeout=15)
