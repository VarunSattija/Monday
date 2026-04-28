"""
Iteration 13 tests:
- Column-level permissions persistence (PUT /api/boards/{id}/columns/{col_id})
- Dashboard widget creation (POST /api/dashboards/{id}/widgets)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://acuity-team-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

USER1 = {"email": "testuser@acuity.com", "password": "TestPass123!"}
USER2 = {"email": "user2@acuity.com", "password": "TestPass123!"}
BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"
WORKSPACE_ID = "ac2d85dd-bbbd-4189-a365-9ab682d97860"


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token") or r.json().get("token")
    assert token, f"no token in {r.json()}"
    return token


@pytest.fixture(scope="module")
def user1_headers():
    return {"Authorization": f"Bearer {_login(USER1)}"}


@pytest.fixture(scope="module")
def user2_headers():
    return {"Authorization": f"Bearer {_login(USER2)}"}


# ---------- Column Permissions ----------
class TestColumnPermissions:
    def test_get_board_columns(self, user1_headers):
        r = requests.get(f"{API}/boards/{BOARD_ID}", headers=user1_headers, timeout=30)
        assert r.status_code == 200
        board = r.json()
        assert "columns" in board and len(board["columns"]) > 1
        # Each column should have a settings field (dict)
        for c in board["columns"]:
            assert isinstance(c.get("settings", {}), dict)

    def test_update_column_persists_permissions(self, user1_headers):
        # pick a non-name column
        board = requests.get(f"{API}/boards/{BOARD_ID}", headers=user1_headers, timeout=30).json()
        target_col = board["columns"][1]
        col_id = target_col["id"]
        original_settings = target_col.get("settings", {}) or {}

        payload = {"settings": {"permissions": {"edit": "owner_only", "view": "everyone"}}}
        r = requests.put(
            f"{API}/boards/{BOARD_ID}/columns/{col_id}",
            json=payload,
            headers=user1_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text

        # GET-verify the permissions persisted
        board2 = requests.get(f"{API}/boards/{BOARD_ID}", headers=user1_headers, timeout=30).json()
        updated_col = next(c for c in board2["columns"] if c["id"] == col_id)
        perms = updated_col.get("settings", {}).get("permissions")
        assert perms == {"edit": "owner_only", "view": "everyone"}, updated_col.get("settings")

        # Cleanup – restore original settings (remove permissions)
        restore = {"settings": {"permissions": original_settings.get("permissions", {})}}
        requests.put(
            f"{API}/boards/{BOARD_ID}/columns/{col_id}",
            json=restore,
            headers=user1_headers,
            timeout=30,
        )

    def test_update_column_merges_settings(self, user1_headers):
        # add another setting first, then add permissions, expect both to persist
        board = requests.get(f"{API}/boards/{BOARD_ID}", headers=user1_headers, timeout=30).json()
        col = board["columns"][2]
        col_id = col["id"]
        original_settings = col.get("settings", {}) or {}

        requests.put(
            f"{API}/boards/{BOARD_ID}/columns/{col_id}",
            json={"settings": {"foo": "bar"}},
            headers=user1_headers,
            timeout=30,
        )
        requests.put(
            f"{API}/boards/{BOARD_ID}/columns/{col_id}",
            json={"settings": {"permissions": {"edit": "owner_only", "view": "everyone"}}},
            headers=user1_headers,
            timeout=30,
        )
        b2 = requests.get(f"{API}/boards/{BOARD_ID}", headers=user1_headers, timeout=30).json()
        updated_col = next(c for c in b2["columns"] if c["id"] == col_id)
        s = updated_col.get("settings", {})
        assert s.get("foo") == "bar"
        assert s.get("permissions", {}).get("edit") == "owner_only"

        # restore
        requests.put(
            f"{API}/boards/{BOARD_ID}/columns/{col_id}",
            json={"settings": original_settings},
            headers=user1_headers,
            timeout=30,
        )


# ---------- Dashboards / Widgets ----------
class TestDashboardWidgets:
    created_dash_id = None
    created_widget_ids = []

    def test_create_dashboard(self, user1_headers):
        r = requests.post(
            f"{API}/dashboards",
            json={"workspace_id": WORKSPACE_ID, "name": "TEST_dash_i13"},
            headers=user1_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == "TEST_dash_i13"
        assert data["workspace_id"] == WORKSPACE_ID
        assert "id" in data
        TestDashboardWidgets.created_dash_id = data["id"]

    def test_list_workspace_dashboards(self, user1_headers):
        r = requests.get(f"{API}/dashboards/workspace/{WORKSPACE_ID}", headers=user1_headers, timeout=30)
        assert r.status_code == 200
        assert any(d["id"] == TestDashboardWidgets.created_dash_id for d in r.json())

    @pytest.mark.parametrize("widget_type,settings", [
        ("numbers", {"metric": "count"}),
        ("chart", {"chart_type": "bar", "column_id": ""}),
        ("battery", {"target_value": "Done", "column_id": ""}),
    ])
    def test_add_widget(self, user1_headers, widget_type, settings):
        dash_id = TestDashboardWidgets.created_dash_id
        assert dash_id, "dashboard was not created"
        payload = {
            "dashboard_id": dash_id,
            "type": widget_type,
            "title": f"TEST_{widget_type}_widget",
            "board_ids": [BOARD_ID],
            "settings": settings,
        }
        r = requests.post(f"{API}/dashboards/{dash_id}/widgets", json=payload, headers=user1_headers, timeout=30)
        assert r.status_code == 200, r.text
        w = r.json()
        assert w["type"] == widget_type
        assert w["title"] == f"TEST_{widget_type}_widget"
        assert w["board_ids"] == [BOARD_ID]
        assert "id" in w
        TestDashboardWidgets.created_widget_ids.append(w["id"])

    def test_widgets_persisted_on_dashboard(self, user1_headers):
        dash_id = TestDashboardWidgets.created_dash_id
        r = requests.get(f"{API}/dashboards/{dash_id}", headers=user1_headers, timeout=30)
        assert r.status_code == 200
        dash = r.json()
        widget_ids = {w["id"] for w in dash.get("widgets", [])}
        for wid in TestDashboardWidgets.created_widget_ids:
            assert wid in widget_ids, f"widget {wid} not persisted"

    def test_zzz_cleanup_dashboard(self, user1_headers):
        # last test – delete the test dashboard
        dash_id = TestDashboardWidgets.created_dash_id
        if dash_id:
            r = requests.delete(f"{API}/dashboards/{dash_id}", headers=user1_headers, timeout=30)
            assert r.status_code in (200, 204)
