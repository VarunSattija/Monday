"""WebSocket manager for real-time board collaboration."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


class BoardConnectionManager:
    """Manages WebSocket connections per board."""

    def __init__(self):
        # board_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, board_id: str):
        await websocket.accept()
        if board_id not in self.active_connections:
            self.active_connections[board_id] = set()
        self.active_connections[board_id].add(websocket)

    def disconnect(self, websocket: WebSocket, board_id: str):
        if board_id in self.active_connections:
            self.active_connections[board_id].discard(websocket)
            if not self.active_connections[board_id]:
                del self.active_connections[board_id]

    async def broadcast(self, board_id: str, message: dict, exclude: WebSocket = None):
        """Broadcast a message to all connections on a board except the sender."""
        if board_id not in self.active_connections:
            return
        dead = []
        for conn in self.active_connections[board_id]:
            if conn == exclude:
                continue
            try:
                await conn.send_json(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.active_connections[board_id].discard(d)


manager = BoardConnectionManager()


@router.websocket("/ws/board/{board_id}")
async def board_websocket(websocket: WebSocket, board_id: str):
    await manager.connect(websocket, board_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg["board_id"] = board_id
                # Broadcast to all other users on this board
                await manager.broadcast(board_id, msg, exclude=websocket)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, board_id)
    except Exception:
        manager.disconnect(websocket, board_id)
