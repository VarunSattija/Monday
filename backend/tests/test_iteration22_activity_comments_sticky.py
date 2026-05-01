"""Iteration 22 backend tests:
- Activity 'moved' entries store old_value as group NAME (not UUID)
- DELETE /api/updates/{id} always returns 403 (compliance)
- Iteration 21 regression: register flips invited->active with $elemMatch and
  doesn't corrupt other members.
"""
import os
import re
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "testuser@acuity.com", "password": "TestPass123!"}
PIPELINE_BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"

UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")


@pytest.fixture(scope="module")
def owner_headers():
    r = requests.post(f"{API}/auth/login", json=OWNER, timeout=20)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def acuity_team_id(owner_headers):
    r = requests.get(f"{API}/teams/by-name/Acuity-Professional", headers=owner_headers, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["id"]


# ---------------- Activity: moved old_value is group NAME ----------------
class TestActivityMovedOldValueIsName:
    def test_no_moved_activity_uses_uuid_as_old_value(self, owner_headers):
        r = requests.get(f"{API}/activity/board/{PIPELINE_BOARD_ID}", headers=owner_headers, timeout=30)
        assert r.status_code == 200, r.text
        acts = r.json()
        moved = [a for a in acts if a.get("action") == "moved"]
        # Validate shape
        assert isinstance(acts, list)
        offenders = [a for a in moved if a.get("old_value") and UUID_RE.match(str(a["old_value"]))]
        assert not offenders, (
            f"Found {len(offenders)} 'moved' activities whose old_value is still a UUID; "
            f"examples={offenders[:2]}"
        )


# ---------------- Updates: DELETE forbidden ----------------
class TestDeleteUpdateForbidden:
    def test_delete_returns_403_for_any_id(self, owner_headers):
        # Random UUID id — even if it doesn't exist, endpoint should 403 first (compliance short-circuit)
        r = requests.delete(f"{API}/updates/{uuid.uuid4()}", headers=owner_headers, timeout=20)
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"
        body = r.json()
        assert "compliance" in (body.get("detail") or "").lower()

    def test_delete_returns_403_on_real_update(self, owner_headers):
        # Find a real update via board update counts -> an item with updates
        counts_r = requests.get(f"{API}/updates/counts/board/{PIPELINE_BOARD_ID}", headers=owner_headers, timeout=20)
        assert counts_r.status_code == 200
        counts = counts_r.json()
        if not counts:
            pytest.skip("No existing updates in Pipeline board to test delete against")
        item_id = next(iter(counts.keys()))
        ups = requests.get(f"{API}/updates/item/{item_id}", headers=owner_headers, timeout=20).json()
        if not ups:
            pytest.skip("Item has no updates")
        uid = ups[0]["id"]
        r = requests.delete(f"{API}/updates/{uid}", headers=owner_headers, timeout=20)
        assert r.status_code == 403
        assert "compliance" in r.json()["detail"].lower()

        # And confirm the update still exists (no data loss)
        ups_after = requests.get(f"{API}/updates/item/{item_id}", headers=owner_headers, timeout=20).json()
        assert any(u["id"] == uid for u in ups_after), "Update vanished despite 403 response"


# ---------------- Iteration 21 regression: $elemMatch flip ----------------
class TestRegisterFlipElemMatchRegression:
    def test_register_flips_only_target_invitee(self, owner_headers, acuity_team_id):
        # Snapshot team members before
        before = requests.get(f"{API}/teams/{acuity_team_id}", headers=owner_headers, timeout=20).json()
        before_members = {m["email"]: dict(m) for m in before["members"]}

        # Invite a fresh random email
        rand = uuid.uuid4().hex[:10]
        email = f"TEST_reg_{rand}@example.com"
        inv = requests.post(
            f"{API}/teams/{acuity_team_id}/invite",
            json={"email": email, "role": "member"},
            headers=owner_headers, timeout=20,
        )
        assert inv.status_code in (200, 201), inv.text

        # Register using that email
        reg = requests.post(
            f"{API}/auth/register",
            json={"email": email, "password": "StrongPass123!", "name": "Regression Tester"},
            timeout=30,
        )
        assert reg.status_code == 200, reg.text

        # Re-fetch
        after = requests.get(f"{API}/teams/{acuity_team_id}", headers=owner_headers, timeout=20).json()
        after_members = {m["email"]: dict(m) for m in after["members"]}

        # Target flipped to active
        assert email in after_members, "Target invitee missing after register"
        target = after_members[email]
        assert target["status"] == "active", f"Target not flipped: {target}"
        assert target.get("name") == "Regression Tester"

        # Other members unchanged (status + name + user_id)
        for em, before_m in before_members.items():
            if em == email:
                continue
            after_m = after_members.get(em)
            assert after_m is not None, f"Member disappeared: {em}"
            assert after_m.get("status") == before_m.get("status"), (
                f"Corruption: {em} status changed {before_m.get('status')} -> {after_m.get('status')}"
            )
            assert after_m.get("name") == before_m.get("name"), (
                f"Corruption: {em} name changed {before_m.get('name')} -> {after_m.get('name')}"
            )
            assert after_m.get("user_id") == before_m.get("user_id"), (
                f"Corruption: {em} user_id changed"
            )
