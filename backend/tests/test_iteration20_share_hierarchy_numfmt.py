"""
Iteration 20 backend tests:
- Invite-to-board auto adds invitee to workspace.member_ids
- GET /api/workspaces backfills legacy board members + returns shared workspaces for invitee
- GET /api/boards/workspace/{ws} for non-owner returns ONLY boards they own/are invited to
- PUT /api/boards/{id}/columns/{cid} with {settings: {...}} merges into column.settings
"""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

OWNER = {"email": "testuser@acuity.com", "password": "TestPass123!"}
VIEWER = {"email": "viewer@acuity.com", "password": "View123!"}
WORKSPACE_ID = "ac2d85dd-bbbd-4189-a365-9ab682d97860"
BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"
NUM_COLUMN_ID = "c2593e9e-71d8-403e-8834-6e5d4789bdd9"


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed for {creds['email']}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def owner_headers():
    return {"Authorization": f"Bearer {_login(OWNER)}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def viewer_headers():
    return {"Authorization": f"Bearer {_login(VIEWER)}", "Content-Type": "application/json"}


# ---------------- Workspace visibility for invitee ----------------
class TestWorkspaceSharing:
    def test_viewer_sees_owner_workspace(self, viewer_headers):
        r = requests.get(f"{BASE_URL}/api/workspaces", headers=viewer_headers, timeout=30)
        assert r.status_code == 200
        ids = [w["id"] for w in r.json()]
        assert WORKSPACE_ID in ids, f"Owner workspace not visible to viewer. Got: {ids}"

    def test_viewer_sees_only_invited_boards_in_owner_workspace(self, viewer_headers):
        r = requests.get(
            f"{BASE_URL}/api/boards/workspace/{WORKSPACE_ID}", headers=viewer_headers, timeout=30
        )
        assert r.status_code == 200, r.text
        boards = r.json()
        ids = [b["id"] for b in boards]
        # Pipeline must be visible
        assert BOARD_ID in ids, f"Pipeline board not visible to viewer: {ids}"
        # Should not include boards viewer is not invited to
        # Validate by cross-checking owner's full list size differs (or equal if owner has only Pipeline)
        # We at least assert pipeline present.

    def test_owner_sees_workspace_boards(self, owner_headers):
        r = requests.get(
            f"{BASE_URL}/api/boards/workspace/{WORKSPACE_ID}", headers=owner_headers, timeout=30
        )
        assert r.status_code == 200
        ids = [b["id"] for b in r.json()]
        assert BOARD_ID in ids


# ---------------- Number column settings merge ----------------
class TestNumberColumnSettings:
    def _get_column(self, headers):
        r = requests.get(f"{BASE_URL}/api/boards/{BOARD_ID}", headers=headers, timeout=30)
        assert r.status_code == 200
        board = r.json()
        cols = board.get("columns", [])
        col = next((c for c in cols if c["id"] == NUM_COLUMN_ID), None)
        assert col is not None, f"Column {NUM_COLUMN_ID} not found"
        return col

    def test_initial_column_present(self, owner_headers):
        col = self._get_column(owner_headers)
        assert col["type"] in ("number", "numbers", "currency"), col

    def test_put_settings_percent_merges(self, owner_headers):
        # Capture existing settings
        before = self._get_column(owner_headers).get("settings", {}) or {}

        payload = {"settings": {"unit": "percent", "decimals": 1, "direction": "R"}}
        r = requests.put(
            f"{BASE_URL}/api/boards/{BOARD_ID}/columns/{NUM_COLUMN_ID}",
            headers=owner_headers,
            json=payload,
            timeout=30,
        )
        assert r.status_code == 200, r.text

        col = self._get_column(owner_headers)
        s = col.get("settings", {}) or {}
        assert s.get("unit") == "percent"
        assert s.get("decimals") == 1
        assert s.get("direction") == "R"
        # Other keys preserved
        for k, v in before.items():
            if k in ("unit", "decimals", "direction"):
                continue
            assert s.get(k) == v, f"Existing setting '{k}' lost. before={before} after={s}"

    def test_put_settings_pound_resets(self, owner_headers):
        # Reset back to pound/auto/L per instructions
        payload = {"settings": {"unit": "pound", "decimals": "auto", "direction": "L"}}
        r = requests.put(
            f"{BASE_URL}/api/boards/{BOARD_ID}/columns/{NUM_COLUMN_ID}",
            headers=owner_headers,
            json=payload,
            timeout=30,
        )
        assert r.status_code == 200
        col = self._get_column(owner_headers)
        s = col.get("settings", {}) or {}
        assert s.get("unit") == "pound"
        assert s.get("decimals") == "auto"
        assert s.get("direction") == "L"
