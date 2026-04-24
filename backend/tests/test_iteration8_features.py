"""Iteration 8 tests: Column resize/reorder persistence + WebSocket endpoint."""
import os
import json
import asyncio
import pytest
import requests
import websockets

def _load_backend_url():
    url = os.environ.get('REACT_APP_BACKEND_URL')
    if not url:
        try:
            with open('/app/frontend/.env') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        url = line.split('=', 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    assert url, "REACT_APP_BACKEND_URL not set"
    return url.rstrip('/')

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"
WS_BASE = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')

EMAIL = "testuser@acuity.com"
PASSWORD = "TestPass123!"
PIPELINE_BOARD_ID = "8110ddb1-2cd2-4ce6-a27d-a4ef5120744a"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


# --- Backend: Column update (resize/reorder) persistence ---
class TestColumnUpdateBoard:
    def test_get_board_has_columns(self, client):
        r = client.get(f"{API}/boards/{PIPELINE_BOARD_ID}")
        assert r.status_code == 200
        data = r.json()
        assert "columns" in data
        assert isinstance(data["columns"], list)
        assert len(data["columns"]) >= 2

    def test_update_columns_widths_persists(self, client):
        r = client.get(f"{API}/boards/{PIPELINE_BOARD_ID}")
        cols = r.json()["columns"]
        original = json.loads(json.dumps(cols))  # deep copy

        # Update widths
        modified = json.loads(json.dumps(cols))
        for c in modified:
            c["width"] = 275

        up = client.put(f"{API}/boards/{PIPELINE_BOARD_ID}", json={"columns": modified})
        assert up.status_code == 200, up.text

        # Re-fetch
        again = client.get(f"{API}/boards/{PIPELINE_BOARD_ID}").json()["columns"]
        for c in again:
            assert c.get("width") == 275, f"width not persisted on {c.get('id')}"

        # Restore
        client.put(f"{API}/boards/{PIPELINE_BOARD_ID}", json={"columns": original})

    def test_update_columns_reorder_persists(self, client):
        r = client.get(f"{API}/boards/{PIPELINE_BOARD_ID}")
        cols = r.json()["columns"]
        original = json.loads(json.dumps(cols))

        if len(cols) < 3:
            pytest.skip("Need at least 3 columns for reorder test")

        # Swap index 1 and 2 (not touching the item name col at index 0)
        reordered = json.loads(json.dumps(cols))
        reordered[1], reordered[2] = reordered[2], reordered[1]

        up = client.put(f"{API}/boards/{PIPELINE_BOARD_ID}", json={"columns": reordered})
        assert up.status_code == 200, up.text

        again = client.get(f"{API}/boards/{PIPELINE_BOARD_ID}").json()["columns"]
        assert again[1]["id"] == reordered[1]["id"]
        assert again[2]["id"] == reordered[2]["id"]

        # Restore
        client.put(f"{API}/boards/{PIPELINE_BOARD_ID}", json={"columns": original})

    @pytest.mark.skip(reason="Destructive: backend accepts non-list columns and persists, corrupting board. See backend_issues.critical in iteration_8.json")
    def test_update_invalid_columns_type(self, client):
        # Backend SHOULD reject non-list columns with 4xx, but currently persists the
        # garbage string and subsequently returns 500 on every board-list fetch.
        r = client.put(f"{API}/boards/{PIPELINE_BOARD_ID}", json={"columns": "not-a-list"})
        assert r.status_code in (400, 422), f"expected 4xx validation error, got {r.status_code}"


# --- Backend: WebSocket ---
class TestWebSocket:
    def test_ws_connect_and_broadcast(self):
        async def run():
            url_a = f"{WS_BASE}/api/ws/board/{PIPELINE_BOARD_ID}"
            async with websockets.connect(url_a) as ws_a:
                async with websockets.connect(url_a) as ws_b:
                    # Give both a moment to register
                    await asyncio.sleep(0.3)
                    payload = {"type": "board_updated", "source": "test"}
                    await ws_a.send(json.dumps(payload))
                    msg = await asyncio.wait_for(ws_b.recv(), timeout=5)
                    data = json.loads(msg)
                    assert data.get("type") == "board_updated"
                    assert data.get("board_id") == PIPELINE_BOARD_ID
        asyncio.run(run())

    def test_ws_sender_does_not_receive_own_message(self):
        async def run():
            url = f"{WS_BASE}/api/ws/board/{PIPELINE_BOARD_ID}"
            async with websockets.connect(url) as ws:
                await asyncio.sleep(0.2)
                await ws.send(json.dumps({"type": "x"}))
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=1.5)
                    pytest.fail(f"sender got own broadcast: {msg}")
                except asyncio.TimeoutError:
                    pass  # expected
        asyncio.run(run())
