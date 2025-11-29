from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Store tuples of (WebSocket, Role)
        self.active_connections: List[Dict[str, any]] = []

    async def connect(self, websocket: WebSocket, role: str):
        await websocket.accept()
        self.active_connections.append({"ws": websocket, "role": role})

    def disconnect(self, websocket: WebSocket):
        self.active_connections = [c for c in self.active_connections if c["ws"] != websocket]

    async def broadcast(self, message: dict):
        # We broadcast a JSON object now, not just text
        for connection in self.active_connections:
            await connection["ws"].send_json(message)