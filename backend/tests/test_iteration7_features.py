"""Iteration 7: Favorites, Bulk Copy/Move to Board, Activity Logging, Undo."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://acuity-team-hub.preview.emergentagent.com").rstrip("/")
PIPELINE_BOARD_ID = "8110ddb1-2cd2-4ce6-a27d-a4ef5120744a"
EMAIL = "testuser@acuity.com"
PASSWORD = "TestPass123!"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def workspace_id(client):
    r = client.get(f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}")
    assert r.status_code == 200, r.text
    return r.json()["workspace_id"]


@pytest.fixture(scope="session")
def target_board(client, workspace_id):
    """Create a TEST_ target board for bulk copy/move."""
    payload = {"name": f"TEST_Iter7_Target_{int(time.time())}", "workspace_id": workspace_id}
    r = client.post(f"{BASE_URL}/api/boards", json=payload)
    assert r.status_code == 200, r.text
    board = r.json()
    # create a group
    g = client.post(f"{BASE_URL}/api/groups", json={"board_id": board["id"], "title": "TargetGroup", "color": "#579bfc"})
    assert g.status_code == 200, g.text
    yield board
    # cleanup
    client.delete(f"{BASE_URL}/api/boards/{board['id']}")


@pytest.fixture(scope="session")
def seed_items(client, workspace_id):
    """Create a TEST_ source board with 3 items."""
    r = client.post(f"{BASE_URL}/api/boards", json={"name": f"TEST_Iter7_Source_{int(time.time())}", "workspace_id": workspace_id})
    assert r.status_code == 200
    board = r.json()
    g = client.post(f"{BASE_URL}/api/groups", json={"board_id": board["id"], "title": "SourceGroup", "color": "#00c875"})
    group_id = g.json()["id"]
    items = []
    for i in range(3):
        ri = client.post(f"{BASE_URL}/api/items", json={"board_id": board["id"], "group_id": group_id, "name": f"TEST_ItemCopy_{i}", "position": i})
        assert ri.status_code == 200, ri.text
        items.append(ri.json())
    yield {"board": board, "group_id": group_id, "items": items}
    client.delete(f"{BASE_URL}/api/boards/{board['id']}")


# ============= Favorites =============
class TestFavorites:
    def test_01_toggle_favorite_on(self, client):
        r = client.post(f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}/favorite")
        assert r.status_code == 200, r.text
        assert "favorited" in r.json()

    def test_02_my_favorites_includes_board(self, client):
        # ensure it's favorited
        r0 = client.get(f"{BASE_URL}/api/boards/favorites/me")
        assert r0.status_code == 200
        favs = r0.json()
        ids = [b["id"] for b in favs]
        if PIPELINE_BOARD_ID not in ids:
            # toggle it on
            client.post(f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}/favorite")
            r0 = client.get(f"{BASE_URL}/api/boards/favorites/me")
            ids = [b["id"] for b in r0.json()]
        assert PIPELINE_BOARD_ID in ids

    def test_03_toggle_favorite_off_and_on(self, client):
        # off
        r1 = client.post(f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}/favorite")
        assert r1.status_code == 200
        favorited_after = r1.json()["favorited"]
        # toggle opposite
        r2 = client.post(f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}/favorite")
        assert r2.json()["favorited"] == (not favorited_after)
        # leave it on
        final = client.get(f"{BASE_URL}/api/boards/favorites/me").json()
        if PIPELINE_BOARD_ID not in [b["id"] for b in final]:
            client.post(f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}/favorite")


# ============= Bulk copy / move across boards =============
class TestBulkCopy:
    def test_01_copy_items_to_target_board(self, client, seed_items, target_board):
        item_ids = [it["id"] for it in seed_items["items"][:2]]
        r = client.post(f"{BASE_URL}/api/boards/bulk-copy",
                        json={"item_ids": item_ids, "target_board_id": target_board["id"]})
        assert r.status_code == 200, r.text
        assert r.json().get("copied") == 2
        # verify target board has the items
        r2 = client.get(f"{BASE_URL}/api/items/board/{target_board['id']}")
        assert r2.status_code == 200
        names = [it["name"] for it in r2.json()]
        assert sum(1 for n in names if n.startswith("TEST_ItemCopy_")) >= 2
        # source unchanged
        r3 = client.get(f"{BASE_URL}/api/items/board/{seed_items['board']['id']}")
        assert r3.status_code == 200
        assert len(r3.json()) == 3

    def test_02_copy_requires_item_ids(self, client, target_board):
        r = client.post(f"{BASE_URL}/api/boards/bulk-copy",
                        json={"item_ids": [], "target_board_id": target_board["id"]})
        assert r.status_code == 400

    def test_03_copy_requires_target(self, client, seed_items):
        r = client.post(f"{BASE_URL}/api/boards/bulk-copy",
                        json={"item_ids": [seed_items["items"][0]["id"]]})
        assert r.status_code == 400

    def test_04_copy_target_not_found(self, client, seed_items):
        r = client.post(f"{BASE_URL}/api/boards/bulk-copy",
                        json={"item_ids": [seed_items["items"][0]["id"]], "target_board_id": "nonexistent-id"})
        assert r.status_code == 404


class TestBulkMoveBoard:
    def test_01_move_item_to_target_board(self, client, seed_items, target_board):
        # move the 3rd item
        item_id = seed_items["items"][2]["id"]
        r = client.post(f"{BASE_URL}/api/boards/bulk-move-board",
                        json={"item_ids": [item_id], "target_board_id": target_board["id"]})
        assert r.status_code == 200, r.text
        assert r.json().get("moved") == 1
        # verify item now belongs to target
        r2 = client.get(f"{BASE_URL}/api/items/{item_id}")
        assert r2.status_code == 200
        assert r2.json()["board_id"] == target_board["id"]

    def test_02_move_requires_params(self, client):
        r = client.post(f"{BASE_URL}/api/boards/bulk-move-board", json={"item_ids": []})
        assert r.status_code == 400


# ============= Activity logging =============
class TestActivityLog:
    def test_01_rename_item_creates_activity(self, client, seed_items):
        # create a dedicated item
        ri = client.post(f"{BASE_URL}/api/items", json={
            "board_id": seed_items["board"]["id"], "group_id": seed_items["group_id"], "name": "TEST_ActOrig", "position": 10
        })
        item_id = ri.json()["id"]
        # rename
        r = client.put(f"{BASE_URL}/api/items/{item_id}", json={"name": "TEST_ActRenamed"})
        assert r.status_code == 200
        time.sleep(0.5)
        # fetch activity
        ra = client.get(f"{BASE_URL}/api/activity/board/{seed_items['board']['id']}")
        assert ra.status_code == 200
        acts = ra.json()
        renames = [a for a in acts if a.get("item_id") == item_id and a.get("action") == "renamed"]
        assert len(renames) >= 1
        a = renames[0]
        for f in ("item_name", "column_name", "old_value", "new_value", "user_name", "created_at"):
            assert f in a
        assert a["old_value"] == "TEST_ActOrig"
        assert a["new_value"] == "TEST_ActRenamed"

    def test_02_column_value_change_creates_activity(self, client, seed_items):
        board = seed_items["board"]
        # grab a column id from the board
        bd = client.get(f"{BASE_URL}/api/boards/{board['id']}").json()
        col_id = bd["columns"][0]["id"]
        # create item
        ri = client.post(f"{BASE_URL}/api/items", json={
            "board_id": board["id"], "group_id": seed_items["group_id"], "name": "TEST_ActCol", "position": 11,
            "column_values": {col_id: "old_val"},
        })
        item_id = ri.json()["id"]
        # update column_values
        r = client.put(f"{BASE_URL}/api/items/{item_id}",
                       json={"column_values": {col_id: "new_val"}})
        assert r.status_code == 200
        time.sleep(0.5)
        ra = client.get(f"{BASE_URL}/api/activity/board/{board['id']}")
        acts = [a for a in ra.json() if a.get("item_id") == item_id and a.get("action") == "updated"]
        assert len(acts) >= 1
        a = acts[0]
        assert a["old_value"] == "old_val"
        assert a["new_value"] == "new_val"
        assert a.get("column_name")  # should have readable column title

    def test_03_activities_sorted_desc(self, client, seed_items):
        r = client.get(f"{BASE_URL}/api/activity/board/{seed_items['board']['id']}")
        assert r.status_code == 200
        acts = r.json()
        if len(acts) >= 2:
            ts = [a["created_at"] for a in acts]
            assert ts == sorted(ts, reverse=True)

    def test_04_undo_reverts_column_value(self, client, seed_items):
        board = seed_items["board"]
        bd = client.get(f"{BASE_URL}/api/boards/{board['id']}").json()
        col_id = bd["columns"][0]["id"]
        ri = client.post(f"{BASE_URL}/api/items", json={
            "board_id": board["id"], "group_id": seed_items["group_id"], "name": "TEST_UndoItem", "position": 12,
            "column_values": {col_id: "before"},
        })
        item_id = ri.json()["id"]
        client.put(f"{BASE_URL}/api/items/{item_id}", json={"column_values": {col_id: "after"}})
        time.sleep(0.5)
        # find activity
        ra = client.get(f"{BASE_URL}/api/activity/board/{board['id']}")
        acts = [a for a in ra.json() if a.get("item_id") == item_id and a.get("action") == "updated"]
        assert acts, "No activity logged"
        act_id = acts[0]["id"]
        ru = client.post(f"{BASE_URL}/api/activity/{act_id}/undo")
        assert ru.status_code == 200, ru.text
        # verify item reverted
        gi = client.get(f"{BASE_URL}/api/items/{item_id}")
        assert gi.json()["column_values"].get(col_id) == "before"

    def test_05_undo_nonexistent_404(self, client):
        r = client.post(f"{BASE_URL}/api/activity/does-not-exist/undo")
        assert r.status_code == 404


# ============= Link column support =============
class TestLinkColumn:
    def test_01_add_link_column(self, client, seed_items):
        board_id = seed_items["board"]["id"]
        r = client.post(f"{BASE_URL}/api/boards/{board_id}/columns",
                        json={"title": "Website", "type": "link", "width": 200})
        assert r.status_code == 200, r.text
        bd = client.get(f"{BASE_URL}/api/boards/{board_id}").json()
        link_cols = [c for c in bd["columns"] if c["type"] == "link"]
        assert len(link_cols) >= 1


# ============= Auth protection =============
class TestAuth:
    def test_01_favorite_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}/favorite")
        assert r.status_code in (401, 403)

    def test_02_bulk_copy_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/boards/bulk-copy", json={"item_ids": ["x"], "target_board_id": "y"})
        assert r.status_code in (401, 403)

    def test_03_activity_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/activity/board/{PIPELINE_BOARD_ID}")
        assert r.status_code in (401, 403)
