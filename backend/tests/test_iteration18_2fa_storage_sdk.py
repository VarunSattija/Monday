"""Iteration 18: 2FA, Storage API, SDK download endpoints, Python SDK functional test."""
import os
import sys
import json
import importlib.util
import subprocess
import pytest
import pyotp
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    raise RuntimeError("REACT_APP_BACKEND_URL is not set")

API = f"{BASE_URL}/api"
EMAIL = "testuser@acuity.com"
PASSWORD = "TestPass123!"
WORKSPACE_ID = "ac2d85dd-bbbd-4189-a365-9ab682d97860"
BOARD_ID = "80443bd5-2839-4909-955b-e13157def5eb"


# ---------------- Shared session/state ----------------

@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def jwt_token(session):
    """Login (assuming 2FA disabled at start). If 2FA happens to be on, fail loudly so we know."""
    r = session.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    body = r.json()
    if body.get("requires_2fa"):
        pytest.skip("2FA appears already enabled at start — leftover state. Disable manually.")
    return body["access_token"]


@pytest.fixture(scope="session")
def auth_headers(jwt_token):
    return {"Authorization": f"Bearer {jwt_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def api_key(session, auth_headers):
    """Create a fresh user-scoped API key for storage tests."""
    r = session.post(
        f"{API}/api-keys",
        json={"name": "TEST_iter18_user", "scope": "user"},
        headers=auth_headers,
    )
    if r.status_code not in (200, 201):
        # Try without scope (backend default)
        r = session.post(
            f"{API}/api-keys", json={"name": "TEST_iter18_user"}, headers=auth_headers
        )
    assert r.status_code in (200, 201), f"Create API key failed: {r.status_code} {r.text}"
    body = r.json()
    key = body.get("key") or body.get("token") or body.get("api_key")
    assert key, f"API key not in response: {body}"
    return key


@pytest.fixture(scope="session")
def workspace_api_key(session, auth_headers):
    """Workspace-scoped API key."""
    r = session.post(
        f"{API}/api-keys",
        json={"name": "TEST_iter18_workspace", "scope": "workspace", "workspace_id": WORKSPACE_ID},
        headers=auth_headers,
    )
    if r.status_code not in (200, 201):
        pytest.skip(f"Workspace-scoped API key creation not supported: {r.status_code} {r.text}")
    key = r.json().get("key") or r.json().get("token") or r.json().get("api_key")
    assert key
    return key


# Track 2FA secret across tests
_state = {"totp_secret": None, "backup_codes": []}


# ---------------- 2FA tests ----------------

class TestTwoFA:
    def test_status_initial_disabled(self, session, auth_headers):
        r = session.get(f"{API}/auth/2fa/status", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["enabled"] is False

    def test_setup_returns_secret_and_qr(self, session, auth_headers):
        r = session.post(f"{API}/auth/2fa/setup", headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "secret" in body and len(body["secret"]) >= 16
        assert body["qr_code"].startswith("data:image/png;base64,")
        assert body["account"] == EMAIL
        _state["totp_secret"] = body["secret"]

    def test_enable_with_invalid_code_rejected(self, session, auth_headers):
        r = session.post(
            f"{API}/auth/2fa/enable", headers=auth_headers, json={"code": "000000"}
        )
        assert r.status_code == 400

    def test_enable_with_valid_code(self, session, auth_headers):
        assert _state["totp_secret"], "setup must run first"
        code = pyotp.TOTP(_state["totp_secret"]).now()
        r = session.post(f"{API}/auth/2fa/enable", headers=auth_headers, json={"code": code})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["enabled"] is True
        assert isinstance(body["backup_codes"], list) and len(body["backup_codes"]) == 10
        _state["backup_codes"] = body["backup_codes"]

    def test_status_after_enable(self, session, auth_headers):
        r = session.get(f"{API}/auth/2fa/status", headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["enabled"] is True
        assert body["backup_codes_remaining"] == 10

    def test_login_now_requires_2fa(self, session):
        r = session.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        assert r.status_code == 200
        body = r.json()
        assert body.get("requires_2fa") is True
        assert body.get("challenge_token")
        _state["challenge_token"] = body["challenge_token"]

    def test_verify_challenge_invalid_token(self, session):
        r = session.post(
            f"{API}/auth/2fa/verify-challenge",
            json={"challenge_token": "garbage.token.here", "code": "123456"},
        )
        assert r.status_code == 401

    def test_verify_challenge_with_totp(self, session):
        code = pyotp.TOTP(_state["totp_secret"]).now()
        r = session.post(
            f"{API}/auth/2fa/verify-challenge",
            json={"challenge_token": _state["challenge_token"], "code": code},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "access_token" in body
        assert body["user"]["email"] == EMAIL
        assert body.get("used_backup_code") is False

    def test_login_with_backup_code(self, session):
        # New login → new challenge
        r = session.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        ct = r.json()["challenge_token"]
        backup = _state["backup_codes"][0]
        r2 = session.post(
            f"{API}/auth/2fa/verify-challenge",
            json={"challenge_token": ct, "code": backup},
        )
        assert r2.status_code == 200, r2.text
        b = r2.json()
        assert b.get("used_backup_code") is True
        # Verify backup code consumed
        r3 = session.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        ct2 = r3.json()["challenge_token"]
        r4 = session.post(
            f"{API}/auth/2fa/verify-challenge",
            json={"challenge_token": ct2, "code": backup},
        )
        assert r4.status_code == 401, "Used backup code should not work again"

    def test_regenerate_backup_codes(self, session):
        # Need fresh JWT (post-2FA verify)
        code = pyotp.TOTP(_state["totp_secret"]).now()
        r = session.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        ct = r.json()["challenge_token"]
        r2 = session.post(
            f"{API}/auth/2fa/verify-challenge",
            json={"challenge_token": ct, "code": code},
        )
        token = r2.json()["access_token"]
        h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # Need a fresh code (TOTP rotates every 30s)
        import time
        time.sleep(1)
        new_code = pyotp.TOTP(_state["totp_secret"]).now()
        r3 = session.post(
            f"{API}/auth/2fa/regenerate-backup-codes", headers=h, json={"code": new_code}
        )
        assert r3.status_code == 200, r3.text
        codes = r3.json()["backup_codes"]
        assert len(codes) == 10
        _state["backup_codes"] = codes
        _state["jwt_after_2fa"] = token

    def test_disable_2fa(self, session):
        """CRITICAL: this must run last in 2FA suite to clean up."""
        token = _state.get("jwt_after_2fa")
        assert token
        h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        import time
        time.sleep(1)
        code = pyotp.TOTP(_state["totp_secret"]).now()
        r = session.post(
            f"{API}/auth/2fa/disable",
            headers=h,
            json={"password": PASSWORD, "code": code},
        )
        assert r.status_code == 200, r.text
        assert r.json()["enabled"] is False

        # Verify status
        r2 = session.get(f"{API}/auth/2fa/status", headers=h)
        assert r2.json()["enabled"] is False


# ---------------- Storage API tests ----------------

class TestStorage:
    def test_put_get_delete(self, session, api_key):
        h = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        # PUT
        r = session.put(
            f"{API}/v1/storage/TEST_key1", headers=h, json={"value": {"a": 1, "b": "x"}}
        )
        assert r.status_code == 200, r.text
        # GET
        r2 = session.get(f"{API}/v1/storage/TEST_key1", headers=h)
        assert r2.status_code == 200
        assert r2.json()["value"] == {"a": 1, "b": "x"}
        # LIST
        r3 = session.get(f"{API}/v1/storage", headers=h)
        assert r3.status_code == 200
        keys = [k["key"] for k in r3.json()]
        assert "TEST_key1" in keys
        # DELETE
        r4 = session.delete(f"{API}/v1/storage/TEST_key1", headers=h)
        assert r4.status_code == 200
        # GET after delete returns null
        r5 = session.get(f"{API}/v1/storage/TEST_key1", headers=h)
        assert r5.status_code == 200
        assert r5.json()["value"] is None

    def test_put_missing_value_400(self, session, api_key):
        h = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        r = session.put(f"{API}/v1/storage/TEST_bad", headers=h, json={})
        assert r.status_code == 400

    def test_workspace_scope_isolation(self, session, api_key, workspace_api_key):
        """User-scoped key cannot see workspace-scoped data."""
        hu = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        hw = {"Authorization": f"Bearer {workspace_api_key}", "Content-Type": "application/json"}
        # Set in workspace
        r = session.put(f"{API}/v1/storage/TEST_ws_only", headers=hw, json={"value": "ws_secret"})
        assert r.status_code == 200
        # Set in user with same key
        r2 = session.put(f"{API}/v1/storage/TEST_ws_only", headers=hu, json={"value": "user_secret"})
        assert r2.status_code == 200
        # Workspace sees ws value
        rw = session.get(f"{API}/v1/storage/TEST_ws_only", headers=hw).json()
        assert rw["value"] == "ws_secret"
        # User sees user value
        ru = session.get(f"{API}/v1/storage/TEST_ws_only", headers=hu).json()
        assert ru["value"] == "user_secret"
        # Cleanup
        session.delete(f"{API}/v1/storage/TEST_ws_only", headers=hw)
        session.delete(f"{API}/v1/storage/TEST_ws_only", headers=hu)


# ---------------- SDK download tests ----------------

class TestSDKDownloads:
    def test_download_python_sdk(self, session):
        r = session.get(f"{API}/sdk/python")
        assert r.status_code == 200
        assert "python" in r.headers.get("content-type", "").lower() or "text" in r.headers.get("content-type", "").lower()
        assert "class AcuitySDK" in r.text
        assert "def whoami" in r.text

    def test_download_javascript_sdk(self, session):
        r = session.get(f"{API}/sdk/javascript")
        assert r.status_code == 200
        assert "function" in r.text or "factory" in r.text
        assert "acuitySdk" in r.text

    def test_download_javascript_cdn(self, session):
        r = session.get(f"{API}/sdk/javascript/cdn")
        assert r.status_code == 200
        assert "javascript" in r.headers.get("content-type", "").lower()
        assert "acuitySdk" in r.text

    def test_download_readme(self, session):
        r = session.get(f"{API}/sdk/readme")
        assert r.status_code == 200
        assert "markdown" in r.headers.get("content-type", "").lower()


# ---------------- Python SDK functional test ----------------

class TestPythonSDK:
    def test_sdk_imports_and_calls_backend(self, api_key):
        # Load SDK as module
        spec = importlib.util.spec_from_file_location(
            "acuity_sdk_test", "/app/sdk/python/acuity_sdk.py"
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        sdk = mod.AcuitySDK(token=api_key, api_url=API)

        # whoami
        who = sdk.api.whoami()
        assert who.get("email") == EMAIL or who.get("user", {}).get("email") == EMAIL or "id" in who

        # Boards list
        boards = sdk.api.boards.list()
        assert isinstance(boards, list)

        # Storage: set / get / keys / delete
        sdk.storage.set("TEST_sdk_key", {"hello": "world"})
        v = sdk.storage.get("TEST_sdk_key")
        assert v == {"hello": "world"}
        keys = sdk.storage.keys()
        assert "TEST_sdk_key" in keys
        sdk.storage.delete("TEST_sdk_key")
        v2 = sdk.storage.get("TEST_sdk_key")
        assert v2 is None


# ---------------- JavaScript SDK syntactic check ----------------

class TestJavaScriptSDK:
    def test_js_sdk_loads_in_node(self):
        """Quick syntax / shape check by requiring it from Node."""
        node_path = subprocess.run(["which", "node"], capture_output=True, text=True).stdout.strip()
        if not node_path:
            pytest.skip("Node.js not available")
        script = """
        const sdk = require('/app/sdk/javascript/acuity-sdk.js');
        const inst = sdk({ token: 'fake_token', fetch: () => Promise.resolve({ok:true,json:()=>({})}) });
        const ok = !!(inst.api && inst.storage && inst.listen && inst.auth);
        console.log(JSON.stringify({ok, version: inst.version}));
        """
        r = subprocess.run([node_path, "-e", script], capture_output=True, text=True, timeout=10)
        assert r.returncode == 0, f"Node load failed: {r.stderr}"
        out = json.loads(r.stdout.strip().splitlines()[-1])
        assert out["ok"] is True
        assert out["version"] == "1.0.0"
