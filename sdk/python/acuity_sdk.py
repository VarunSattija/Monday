"""
Acuity Professional SDK for Python
==================================

Official Python client for the Acuity Work Management API. Mirrors the
shape of the monday.com SDK (api / storage / events) so existing scripts
can be ported with minimal changes.

Quick start
-----------

    from acuity_sdk import AcuitySDK

    acuity = AcuitySDK(token="ak_xxxxx")
    # or set ACUITY_API_TOKEN env var and call AcuitySDK()

    # 1. Verify connection
    print(acuity.api.whoami())

    # 2. List boards
    boards = acuity.api.boards.list()

    # 3. Inspect a board's columns + groups
    board = acuity.api.boards.get(boards[0]["id"])

    # 4. Create an item (e.g. from a CV parser)
    item = acuity.api.items.create(
        board_id=board["id"],
        name="Candidate: Jane Doe",
        column_values={
            "<email_column_id>": "jane@example.com",
            "<phone_column_id>": "+44 20 1234 5678",
        },
    )

    # 5. Persist app state across runs (key-value storage)
    acuity.storage.set("last_run_at", "2026-04-29T10:00:00Z")
    print(acuity.storage.get("last_run_at"))

    # 6. Listen to live board changes (WebSocket)
    def on_event(evt):
        print("event:", evt)

    acuity.events.on_board("<board_id>", on_event)   # blocking
"""
from __future__ import annotations

import json
import os
import threading
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import urlparse

import requests

try:
    import websocket  # websocket-client
except ImportError:  # optional dependency for events
    websocket = None


__version__ = "1.0.0"

DEFAULT_API_URL = os.environ.get(
    "ACUITY_API_URL",
    "https://acuity-team-hub.preview.emergentagent.com/api",
)


class AcuityError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None, body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


class _BaseClient:
    def __init__(self, token: str, api_url: str, timeout: int):
        self.token = token
        self.api_url = api_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": f"acuity-sdk-python/{__version__}",
        })

    def _request(self, method: str, path: str, **kw) -> Any:
        url = f"{self.api_url}{path}"
        try:
            resp = self.session.request(method, url, timeout=self.timeout, **kw)
        except requests.RequestException as e:
            raise AcuityError(f"Network error: {e}") from e
        if resp.status_code >= 400:
            try:
                body = resp.json()
                detail = body.get("detail") or body
            except Exception:
                body = resp.text
                detail = body
            raise AcuityError(
                f"HTTP {resp.status_code}: {detail}",
                status_code=resp.status_code,
                body=body,
            )
        if resp.status_code == 204 or not resp.text:
            return None
        try:
            return resp.json()
        except Exception:
            return resp.text


# --------------------------- Resource clients ---------------------------

class _BoardsAPI:
    def __init__(self, client: _BaseClient):
        self._c = client

    def list(self) -> List[Dict[str, Any]]:
        return self._c._request("GET", "/v1/boards")

    def get(self, board_id: str) -> Dict[str, Any]:
        return self._c._request("GET", f"/v1/boards/{board_id}")


class _ItemsAPI:
    def __init__(self, client: _BaseClient):
        self._c = client

    def create(
        self,
        board_id: str,
        name: str,
        column_values: Optional[Dict[str, Any]] = None,
        group_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload = {"name": name, "column_values": column_values or {}}
        if group_id:
            payload["group_id"] = group_id
        return self._c._request(
            "POST", f"/v1/boards/{board_id}/items", data=json.dumps(payload),
        )


class _APINamespace:
    """Equivalent of monday.api — server-side data access."""

    def __init__(self, client: _BaseClient):
        self._c = client
        self.boards = _BoardsAPI(client)
        self.items = _ItemsAPI(client)

    def whoami(self) -> Dict[str, Any]:
        return self._c._request("GET", "/api-keys/whoami")


class _StorageAPI:
    """Equivalent of monday.storage — key/value persistence per user or workspace."""

    def __init__(self, client: _BaseClient):
        self._c = client

    def get(self, key: str) -> Any:
        res = self._c._request("GET", f"/v1/storage/{key}")
        return (res or {}).get("value")

    def set(self, key: str, value: Any) -> Dict[str, Any]:
        return self._c._request(
            "PUT", f"/v1/storage/{key}", data=json.dumps({"value": value})
        )

    def delete(self, key: str) -> None:
        self._c._request("DELETE", f"/v1/storage/{key}")

    def keys(self) -> List[str]:
        res = self._c._request("GET", "/v1/storage") or []
        return [r["key"] for r in res]


class _EventsAPI:
    """Subscribe to real-time board events via WebSocket.
    Mirrors monday.listen — blocks until disconnected."""

    def __init__(self, client: _BaseClient):
        self._c = client
        self._ws_url = self._derive_ws_url()

    def _derive_ws_url(self) -> str:
        parsed = urlparse(self._c.api_url)
        scheme = "wss" if parsed.scheme == "https" else "ws"
        return f"{scheme}://{parsed.netloc}{parsed.path}"

    def on_board(
        self,
        board_id: str,
        callback: Callable[[Dict[str, Any]], None],
        block: bool = True,
    ) -> Optional[threading.Thread]:
        """Subscribe to real-time events on a board.
        callback receives a parsed JSON dict per event.
        """
        if websocket is None:
            raise AcuityError(
                "Events require the 'websocket-client' package: pip install websocket-client"
            )

        url = f"{self._ws_url}/ws/board/{board_id}"

        def _run():
            ws = websocket.WebSocketApp(
                url,
                on_message=lambda _ws, msg: self._dispatch(msg, callback),
            )
            ws.run_forever(ping_interval=30, ping_timeout=10)

        if block:
            _run()
            return None
        t = threading.Thread(target=_run, daemon=True)
        t.start()
        return t

    @staticmethod
    def _dispatch(raw: str, callback: Callable[[Dict[str, Any]], None]):
        try:
            data = json.loads(raw)
        except Exception:
            data = {"raw": raw}
        callback(data)


# --------------------------- 2FA helper ---------------------------

class _AuthAPI:
    """Helper namespace for password-based login — useful when a script
    needs to login as a user (e.g. CI test). Not required when using
    Personal Access Tokens (the recommended pattern)."""

    def __init__(self, api_url: str, timeout: int):
        self.api_url = api_url.rstrip("/")
        self.timeout = timeout

    def login(self, email: str, password: str, totp: Optional[str] = None) -> Dict[str, Any]:
        r = requests.post(
            f"{self.api_url}/auth/login",
            json={"email": email, "password": password},
            timeout=self.timeout,
        )
        r.raise_for_status()
        body = r.json()
        if body.get("requires_2fa"):
            if not totp:
                raise AcuityError("2FA is enabled — pass totp=<6-digit code>")
            r2 = requests.post(
                f"{self.api_url}/auth/2fa/verify-challenge",
                json={"challenge_token": body["challenge_token"], "code": totp},
                timeout=self.timeout,
            )
            r2.raise_for_status()
            return r2.json()
        return body


# --------------------------- Top-level SDK ---------------------------

class AcuitySDK:
    """Top-level SDK entry point.

    >>> acuity = AcuitySDK(token="ak_xxx")
    >>> acuity.api.boards.list()
    """

    def __init__(
        self,
        token: Optional[str] = None,
        api_url: Optional[str] = None,
        timeout: int = 30,
    ):
        self.token = token or os.environ.get("ACUITY_API_TOKEN")
        if not self.token:
            raise AcuityError(
                "API token is required. Pass token='ak_...' or set ACUITY_API_TOKEN env var."
            )
        self.api_url = api_url or DEFAULT_API_URL
        self._client = _BaseClient(self.token, self.api_url, timeout)
        self.api = _APINamespace(self._client)
        self.storage = _StorageAPI(self._client)
        self.events = _EventsAPI(self._client)
        self.auth = _AuthAPI(self.api_url, timeout)

    def set_token(self, token: str) -> None:
        self.token = token
        self._client.session.headers["Authorization"] = f"Bearer {token}"


__all__ = ["AcuitySDK", "AcuityError", "__version__"]
