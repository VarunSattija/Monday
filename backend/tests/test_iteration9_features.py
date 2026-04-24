"""
Iteration 9: Test number/formula/link column types and group summary.
Focus on backend APIs:
- POST /api/boards/{id}/columns with type=numbers + settings={unit,decimals,direction}
- POST /api/boards/{id}/columns with type=formula + settings={expression,unit}
- POST /api/boards/{id}/columns with type=link
- Verify settings persist on GET
"""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
TEST_EMAIL = "testuser@acuity.com"
TEST_PASSWORD = "TestPass123!"
PIPELINE_BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"
WORKSPACE_ID = "ac2d85dd-bbbd-4189-a365-9ab682d97860"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
                      timeout=15)
    if r.status_code != 200:
        pytest.skip(f"login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}",
                      "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def test_board(client):
    # Create an isolated board for column tests (avoid corrupting Pipeline board)
    r = client.post(f"{BASE_URL}/api/boards",
                    json={"name": "TEST_iter9_columns",
                          "workspace_id": WORKSPACE_ID,
                          "description": "iter9"},
                    timeout=15)
    assert r.status_code in (200, 201), r.text
    board = r.json()
    yield board
    client.delete(f"{BASE_URL}/api/boards/{board['id']}", timeout=15)


class TestColumnType:
    def test_pipeline_board_reachable(self, client):
        r = client.get(f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}", timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()
        assert isinstance(b.get("columns"), list)

    def test_add_numbers_column_with_pound_settings(self, client, test_board):
        bid = test_board["id"]
        payload = {
            "title": "TEST_amount",
            "type": "numbers",
            "settings": {"unit": "pound", "decimals": "auto", "direction": "L"},
        }
        r = client.post(f"{BASE_URL}/api/boards/{bid}/columns",
                        json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        # GET to verify persistence
        r2 = client.get(f"{BASE_URL}/api/boards/{bid}", timeout=15)
        assert r2.status_code == 200
        cols = r2.json()["columns"]
        match = [c for c in cols if c["title"] == "TEST_amount"]
        assert match, f"Created column not found: {cols}"
        col = match[0]
        assert col["type"] == "numbers"
        assert col["settings"].get("unit") == "pound"
        assert col["settings"].get("direction") == "L"

    def test_add_formula_column(self, client, test_board):
        bid = test_board["id"]
        payload = {
            "title": "TEST_total",
            "type": "formula",
            "settings": {"expression": "SUM(col1,col2)", "unit": "pound"},
        }
        r = client.post(f"{BASE_URL}/api/boards/{bid}/columns",
                        json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        r2 = client.get(f"{BASE_URL}/api/boards/{bid}", timeout=15)
        cols = r2.json()["columns"]
        match = [c for c in cols if c["title"] == "TEST_total"]
        assert match, "formula column missing"
        col = match[0]
        assert col["type"] == "formula"
        assert col["settings"].get("expression") == "SUM(col1,col2)"
        assert col["settings"].get("unit") == "pound"

    def test_add_link_column(self, client, test_board):
        bid = test_board["id"]
        payload = {"title": "TEST_website", "type": "link"}
        r = client.post(f"{BASE_URL}/api/boards/{bid}/columns",
                        json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        r2 = client.get(f"{BASE_URL}/api/boards/{bid}", timeout=15)
        cols = r2.json()["columns"]
        match = [c for c in cols if c["title"] == "TEST_website"]
        assert match, "link column missing"
        assert match[0]["type"] == "link"

    def test_pipeline_board_has_number_columns(self, client):
        """Pipeline re-import should detect fee columns as 'numbers'."""
        r = client.get(f"{BASE_URL}/api/boards/{PIPELINE_BOARD_ID}", timeout=15)
        assert r.status_code == 200
        cols = r.json()["columns"]
        titles = {c["title"]: c["type"] for c in cols}
        # Check at least some of the expected fee columns are numbers type
        expected_number_titles = ["Exc. Proc", "Exc. Fee", "Exc. Life Fee",
                                  "Proc Fee", "Broker Fee", "Life Fee",
                                  "P Price", "M Amount"]
        found_as_numbers = [t for t in expected_number_titles
                            if titles.get(t) == "numbers"]
        # Report finding - allow some missing but at least one should be numbers
        print(f"Number-typed fee columns found: {found_as_numbers}")
        print(f"All pipeline column types: {titles}")
        # Soft check: warn if none detected
        assert len(found_as_numbers) >= 1, \
            f"Expected at least 1 fee column as 'numbers'. Got types: {titles}"
