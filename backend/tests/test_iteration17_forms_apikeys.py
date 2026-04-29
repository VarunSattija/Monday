"""Iteration 17: Form View + Developer API tests.

Covers:
- Form CRUD (POST/GET/PUT/DELETE /api/forms)
- Public form view & submission (no auth) /api/forms/public/{id}
- API Keys CRUD + scopes (/api/api-keys)
- Developer Public API (/api/v1/*) using ak_... bearer
- Revoked key 401
- Workspace-scoped key 403 on out-of-scope board
"""
import os
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

USER1 = {"email": "testuser@acuity.com", "password": "TestPass123!"}
USER2 = {"email": "user2@acuity.com", "password": "TestPass123!"}
PIPELINE_BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"
WORKSPACE_ID = "ac2d85dd-bbbd-4189-a365-9ab682d97860"


# ---- session-scoped fixtures ----
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def token1(s):
    r = s.post(f"{API}/auth/login", json=USER1)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def token2(s):
    r = s.post(f"{API}/auth/login", json=USER2)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def board(s, token1):
    r = s.get(f"{API}/boards/{PIPELINE_BOARD_ID}",
              headers={"Authorization": f"Bearer {token1}"})
    assert r.status_code == 200, r.text
    return r.json()


# ============== FORM CRUD ==============

@pytest.fixture(scope="session")
def created_form(s, token1, board):
    cols = board["columns"]
    # Hide the second column, mark the first as required
    fields = []
    for i, c in enumerate(cols):
        fields.append({
            "column_id": c["id"],
            "hidden": (i == 1),
            "required": (i == 0),
            "label": None,
            "description": None,
        })
    payload = {
        "board_id": PIPELINE_BOARD_ID,
        "name": "TEST_form_iter17",
        "description": "iter17 form",
        "fields": fields,
        "success_message": "Thanks for testing",
    }
    r = s.post(f"{API}/forms", json=payload,
               headers={"Authorization": f"Bearer {token1}"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "TEST_form_iter17"
    assert body["board_id"] == PIPELINE_BOARD_ID
    assert len(body["fields"]) == len(cols)
    yield body
    # cleanup
    s.delete(f"{API}/forms/{body['id']}",
             headers={"Authorization": f"Bearer {token1}"})


def test_form_list_by_board(s, token1, created_form):
    r = s.get(f"{API}/forms/board/{PIPELINE_BOARD_ID}",
              headers={"Authorization": f"Bearer {token1}"})
    assert r.status_code == 200
    ids = [f["id"] for f in r.json()]
    assert created_form["id"] in ids


def test_form_update(s, token1, created_form):
    r = s.put(
        f"{API}/forms/{created_form['id']}",
        json={"name": "TEST_form_iter17_renamed"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["name"] == "TEST_form_iter17_renamed"


def test_form_create_unauthorized_returns_401(s):
    r = s.post(f"{API}/forms",
               json={"board_id": PIPELINE_BOARD_ID, "name": "x"})
    assert r.status_code in (401, 403)


# ============== PUBLIC FORM ==============

def test_public_form_get_no_auth(created_form, board):
    # bare requests, no auth
    r = requests.get(f"{API}/forms/public/{created_form['id']}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == created_form["id"]
    cols = body["columns"]
    # hidden column must NOT be present
    hidden_col_id = board["columns"][1]["id"]
    visible_ids = [c["id"] for c in cols]
    assert hidden_col_id not in visible_ids
    # required column should be flagged
    req_id = board["columns"][0]["id"]
    req = next((c for c in cols if c["id"] == req_id), None)
    assert req is not None
    assert req["required"] is True


def test_public_form_submit_missing_name_400(created_form):
    r = requests.post(f"{API}/forms/public/{created_form['id']}/submit",
                      json={"name": "", "column_values": {}})
    assert r.status_code == 400


def test_public_form_submit_missing_required_field_400(created_form, board):
    # required column is the first; submit without it
    req_col_id = board["columns"][0]["id"]
    r = requests.post(
        f"{API}/forms/public/{created_form['id']}/submit",
        json={"name": "TEST_iter17_item_invalid",
              "column_values": {req_col_id: ""}},
    )
    assert r.status_code == 400
    assert "required" in r.text.lower()


def test_public_form_submit_success(created_form, board):
    req_col_id = board["columns"][0]["id"]
    r = requests.post(
        f"{API}/forms/public/{created_form['id']}/submit",
        json={"name": "TEST_iter17_item_ok",
              "column_values": {req_col_id: "Hello"}},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "item_id" in body
    assert body["message"]


def test_public_form_404_for_unknown():
    r = requests.get(f"{API}/forms/public/does-not-exist")
    assert r.status_code == 404


# ============== API KEYS ==============

@pytest.fixture(scope="session")
def user_key(s, token1):
    r = s.post(f"{API}/api-keys",
               json={"name": "TEST_user_key", "scope": "user"},
               headers={"Authorization": f"Bearer {token1}"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["key"].startswith("ak_")
    assert "key_hash" not in body
    yield body
    # cleanup
    s.delete(f"{API}/api-keys/{body['id']}",
             headers={"Authorization": f"Bearer {token1}"})


@pytest.fixture(scope="session")
def workspace_key(s, token1):
    r = s.post(
        f"{API}/api-keys",
        json={"name": "TEST_ws_key", "scope": "workspace",
              "workspace_id": WORKSPACE_ID},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    yield body
    s.delete(f"{API}/api-keys/{body['id']}",
             headers={"Authorization": f"Bearer {token1}"})


def test_api_key_workspace_scope_requires_workspace_id(s, token1):
    r = s.post(f"{API}/api-keys",
               json={"name": "TEST_bad", "scope": "workspace"},
               headers={"Authorization": f"Bearer {token1}"})
    assert r.status_code == 400


def test_api_key_invalid_scope(s, token1):
    r = s.post(f"{API}/api-keys",
               json={"name": "TEST_bad2", "scope": "global"},
               headers={"Authorization": f"Bearer {token1}"})
    assert r.status_code == 400


def test_list_api_keys_strips_hash(s, token1, user_key):
    r = s.get(f"{API}/api-keys",
              headers={"Authorization": f"Bearer {token1}"})
    assert r.status_code == 200
    keys = r.json()
    assert any(k["id"] == user_key["id"] for k in keys)
    for k in keys:
        assert "key_hash" not in k
        assert "key" not in k  # full key only on creation
        assert "key_prefix" in k


def test_whoami_with_user_key(user_key):
    r = requests.get(f"{API}/api-keys/whoami",
                     headers={"Authorization": f"Bearer {user_key['key']}"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["email"] == USER1["email"]
    assert body["scope"] == "user"


def test_whoami_missing_header_401():
    r = requests.get(f"{API}/api-keys/whoami")
    assert r.status_code == 401


def test_whoami_bad_format_401():
    r = requests.get(f"{API}/api-keys/whoami",
                     headers={"Authorization": "Bearer not_a_key"})
    assert r.status_code == 401


# ============== Developer Public API (/api/v1) ==============

def test_v1_list_boards_with_user_key(user_key):
    r = requests.get(f"{API}/v1/boards",
                     headers={"Authorization": f"Bearer {user_key['key']}"})
    assert r.status_code == 200, r.text
    boards = r.json()
    assert any(b["id"] == PIPELINE_BOARD_ID for b in boards)


def test_v1_get_board(user_key):
    r = requests.get(f"{API}/v1/boards/{PIPELINE_BOARD_ID}",
                     headers={"Authorization": f"Bearer {user_key['key']}"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == PIPELINE_BOARD_ID
    assert "columns" in body and "groups" in body


def test_v1_create_item(user_key):
    payload = {
        "name": "TEST_iter17_api_item",
        "column_values": {},
    }
    r = requests.post(
        f"{API}/v1/boards/{PIPELINE_BOARD_ID}/items",
        json=payload,
        headers={"Authorization": f"Bearer {user_key['key']}"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "TEST_iter17_api_item"
    assert body["board_id"] == PIPELINE_BOARD_ID
    assert "id" in body


def test_v1_create_item_missing_name_400(user_key):
    r = requests.post(
        f"{API}/v1/boards/{PIPELINE_BOARD_ID}/items",
        json={"column_values": {}},
        headers={"Authorization": f"Bearer {user_key['key']}"},
    )
    assert r.status_code == 400


def test_v1_workspace_scoped_key_works_on_in_scope_board(workspace_key):
    r = requests.get(
        f"{API}/v1/boards/{PIPELINE_BOARD_ID}",
        headers={"Authorization": f"Bearer {workspace_key['key']}"},
    )
    assert r.status_code == 200


def test_v1_workspace_scoped_key_403_on_other_workspace(s, token1, workspace_key):
    """Create a board in a NEW workspace; workspace_key should get 403."""
    # create new workspace
    rw = s.post(f"{API}/workspaces",
                json={"name": "TEST_iter17_other_ws"},
                headers={"Authorization": f"Bearer {token1}"})
    assert rw.status_code == 200, rw.text
    other_ws_id = rw.json()["id"]
    rb = s.post(f"{API}/boards",
                json={"name": "TEST_iter17_other_board",
                      "workspace_id": other_ws_id},
                headers={"Authorization": f"Bearer {token1}"})
    assert rb.status_code == 200, rb.text
    other_board_id = rb.json()["id"]

    r = requests.get(
        f"{API}/v1/boards/{other_board_id}",
        headers={"Authorization": f"Bearer {workspace_key['key']}"},
    )
    assert r.status_code == 403, r.text

    # workspace-scoped list should also exclude it
    rl = requests.get(
        f"{API}/v1/boards",
        headers={"Authorization": f"Bearer {workspace_key['key']}"},
    )
    assert rl.status_code == 200
    assert all(b["id"] != other_board_id for b in rl.json())


def test_revoked_key_cannot_access_v1(s, token1):
    # create a fresh key, then revoke it, then call /v1/boards
    r = s.post(f"{API}/api-keys",
               json={"name": "TEST_revoke_me", "scope": "user"},
               headers={"Authorization": f"Bearer {token1}"})
    assert r.status_code == 200
    body = r.json()
    rd = s.delete(f"{API}/api-keys/{body['id']}",
                  headers={"Authorization": f"Bearer {token1}"})
    assert rd.status_code == 200
    rv = requests.get(f"{API}/v1/boards",
                      headers={"Authorization": f"Bearer {body['key']}"})
    assert rv.status_code == 401


def test_revoke_unknown_key_404(s, token1):
    r = s.delete(f"{API}/api-keys/nonexistent-id",
                 headers={"Authorization": f"Bearer {token1}"})
    assert r.status_code == 404
