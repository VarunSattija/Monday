"""
Iteration 23 — Case-insensitive email handling
Tests:
  - Register normalizes email to lowercase
  - Login accepts mixed-case email
  - Board invite supports mixed-case email lookup (case-insensitive regex)
  - Iteration 21 $elemMatch regression: invited -> active flip without sibling corruption
"""
import os
import re
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/") + "/api"

OWNER_EMAIL = "testuser@acuity.com"
OWNER_PASS = "TestPass123!"
PIPELINE_BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"


def _login(email, password):
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    return r


@pytest.fixture(scope="module")
def owner_token():
    r = _login(OWNER_EMAIL, OWNER_PASS)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}


# --- Register: lowercase normalization ---
class TestRegisterLowercase:
    def test_register_stores_lowercase(self):
        rand = uuid.uuid4().hex[:8]
        mixed = f"TEST_Mix.Case_{rand}@Example.COM"
        lower = mixed.lower()
        r = requests.post(f"{BASE_URL}/auth/register", json={
            "email": mixed, "name": "Mix Case", "password": "Passw0rd!"
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["email"] == lower

        # login with the original mixed casing should work
        r2 = _login(mixed, "Passw0rd!")
        assert r2.status_code == 200, r2.text

        # login with all-lower also works
        r3 = _login(lower, "Passw0rd!")
        assert r3.status_code == 200, r3.text

        # login with UPPER also works
        r4 = _login(mixed.upper(), "Passw0rd!")
        assert r4.status_code == 200, r4.text


# --- Board invite: case-insensitive lookup ---
class TestBoardInviteCaseInsensitive:
    @pytest.mark.parametrize("email_variant", [
        "Pragati.Y@acuityprofessional.com",
        "PARMINDER.S@ACUITYPROFESSIONAL.COM",
        "pragati.y@acuityprofessional.com",
    ])
    def test_invite_mixed_case_succeeds(self, auth_headers, email_variant):
        r = requests.post(
            f"{BASE_URL}/boards/{PIPELINE_BOARD_ID}/invite",
            params={"email": email_variant, "role": "member"},
            headers=auth_headers,
        )
        assert r.status_code == 200, f"{email_variant} -> {r.status_code} {r.text}"
        body = r.json()
        assert "invitation" in body
        assert body["invitation"]["status"] == "accepted"

    def test_invite_unknown_email_400(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/boards/{PIPELINE_BOARD_ID}/invite",
            params={"email": "ghost_zzz@example.com", "role": "member"},
            headers=auth_headers,
        )
        assert r.status_code == 400
        assert "not registered" in r.json().get("detail", "").lower()

    def test_invitee_added_to_board_member_ids(self, auth_headers):
        # Verify pragati.y is in member_ids of the pipeline board
        r = requests.get(f"{BASE_URL}/boards/{PIPELINE_BOARD_ID}", headers=auth_headers)
        assert r.status_code == 200
        board = r.json()
        # Search team users to find pragati.y user_id
        s = requests.get(f"{BASE_URL}/auth/users/search?q=pragati.y&limit=5", headers=auth_headers)
        assert s.status_code == 200
        matches = [u for u in s.json() if u["email"].lower() == "pragati.y@acuityprofessional.com"]
        assert matches, "pragati.y user not found"
        assert matches[0]["id"] in board["member_ids"]


# --- Iteration 21 $elemMatch regression ---
class TestRegisterFlipsInvitedToActive:
    def test_register_flips_only_target_invitee(self, auth_headers):
        """Invite a fresh email to the team via team invite endpoint, then register.
        Verify the target moves invited->active and other team members unchanged."""
        rand = uuid.uuid4().hex[:10]
        target_email = f"TEST_reg_{rand}@example.com"

        # Snapshot Acuity-Professional team before
        r_before = requests.get(f"{BASE_URL}/teams", headers=auth_headers)
        assert r_before.status_code == 200
        teams = r_before.json()
        acuity = next((t for t in teams if t["name"] == "Acuity-Professional"), None)
        assert acuity is not None
        before_members = {m["email"]: dict(m) for m in acuity.get("members", [])}

        # Invite via /api/teams/{id}/invite
        team_id = acuity["id"]
        r_inv = requests.post(
            f"{BASE_URL}/teams/{team_id}/invite",
            json={"email": target_email, "role": "member"},
            headers=auth_headers,
        )
        assert r_inv.status_code in (200, 201), r_inv.text

        # Register the target email
        r_reg = requests.post(f"{BASE_URL}/auth/register", json={
            "email": target_email, "name": "Reg Tester", "password": "Passw0rd!"
        })
        assert r_reg.status_code == 200, r_reg.text

        # Re-fetch teams
        r_after = requests.get(f"{BASE_URL}/teams", headers=auth_headers)
        assert r_after.status_code == 200
        acuity_after = next(t for t in r_after.json() if t["name"] == "Acuity-Professional")
        after_members = {m["email"]: m for m in acuity_after.get("members", [])}

        # Target flipped
        target = after_members.get(target_email.lower())
        assert target is not None, "target member not present"
        assert target["status"] == "active"

        # Siblings not corrupted — same status & user_id as before
        for email, prev in before_members.items():
            if email == target_email.lower() or email == target_email:
                continue
            cur = after_members.get(email)
            assert cur is not None, f"{email} disappeared after register"
            assert cur.get("status") == prev.get("status"), f"{email} status changed"
            assert cur.get("user_id") == prev.get("user_id"), f"{email} user_id changed"
