"""Iteration 16 tests: Board invite must validate user exists in users collection."""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://acuity-team-hub.preview.emergentagent.com").rstrip("/")
BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"

USER1 = {"email": "testuser@acuity.com", "password": "TestPass123!"}
USER2_EMAIL = "user2@acuity.com"


@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=USER1, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token") or r.json().get("token")
    assert token, f"No token in login response: {r.json()}"
    return token


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# Iteration 16: Invite validation - reject unregistered emails
class TestInviteValidation:
    def test_invite_unregistered_email_returns_400(self, headers):
        random_email = f"unregistered_{uuid.uuid4().hex[:8]}@nowhere-fake.com"
        r = requests.post(
            f"{BASE_URL}/api/boards/{BOARD_ID}/invite",
            params={"email": random_email},
            headers=headers,
            timeout=30,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        body = r.json()
        detail = body.get("detail", "")
        assert "not registered" in detail.lower(), f"Unexpected error msg: {detail}"
        assert "sign up" in detail.lower(), f"Expected 'sign up' guidance: {detail}"

    def test_invite_registered_user_succeeds(self, headers):
        r = requests.post(
            f"{BASE_URL}/api/boards/{BOARD_ID}/invite",
            params={"email": USER2_EMAIL},
            headers=headers,
            timeout=30,
        )
        assert r.status_code in (200, 201), f"Expected success, got {r.status_code}: {r.text}"
        body = r.json()
        assert "message" in body or "invitation" in body, f"Unexpected response: {body}"
        # Verify response indicates success with the invited user
        msg = body.get("message", "").lower()
        assert "success" in msg or "shared" in msg or body.get("invitation"), f"Bad response: {body}"

    def test_invite_invalid_board_returns_404(self, headers):
        r = requests.post(
            f"{BASE_URL}/api/boards/00000000-0000-0000-0000-000000000000/invite",
            params={"email": USER2_EMAIL},
            headers=headers,
            timeout=30,
        )
        assert r.status_code in (403, 404), f"Expected 403/404, got {r.status_code}: {r.text}"
