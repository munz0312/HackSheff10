from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Any
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        # Key: voyage_id, Value: List of active websockets for that voyage
        self.active_connections: Dict[str, List[WebSocket]] = {}

        # Outer Key: voyage_id (e.g., 'space')
        # Inner Key: role (e.g., 'Captain')
        # Value: WebSocket
        self.active_roles: Dict[str, Dict[str, WebSocket]] = {}
        
        self.LIMITED_ROLES = ["Captain", "Scavenger", "Mechanic"]
        self.lock = asyncio.Lock()

    async def get_role_status(self, voyage_id: str) -> Dict[str, bool]:
        """Returns the current occupancy status of limited roles for a specific voyage."""
        async with self.lock:
            status = {}
            # Defaults to empty dict {} if voyage hasn't started yet
            current_voyage_roles = self.active_roles.get(voyage_id, {})
            
            for role in self.LIMITED_ROLES:
                # Check if role exists in THIS voyage's dictionary
                status[role] = role in current_voyage_roles
            return status

    async def connect(self, websocket: WebSocket, voyage_id: str, role: str):
        await websocket.accept()

        async with self.lock:
            # Ensure storage exists for this specific voyage
            if voyage_id not in self.active_connections:
                self.active_connections[voyage_id] = []
            
            # Ensure the nested dictionary exists for this voyage
            if voyage_id not in self.active_roles:
                self.active_roles[voyage_id] = {}

            if role in self.LIMITED_ROLES:
                # 2. Check for the role inside THIS SPECIFIC voyage
                if role in self.active_roles[voyage_id]:
                    reason = f"Connection Denied: The {role} role for {voyage_id} is already occupied."
                    print(reason)
                    await websocket.close(code=4000, reason=reason)
                    raise WebSocketDisconnect(4000)

                # Assign the role to this voyage only
                self.active_roles[voyage_id][role] = websocket
                print(f"Role Assigned: {role} in Voyage: {voyage_id}")

            # Add connection to this voyage's broadcast list
            self.active_connections[voyage_id].append(websocket)

    def disconnect(self, websocket: WebSocket, voyage_id: str, role: str):
        async def remove_connection():
            async with self.lock:
                # Remove from voyage connections
                if voyage_id in self.active_connections:
                    if websocket in self.active_connections[voyage_id]:
                        self.active_connections[voyage_id].remove(websocket)

                # Remove from voyage-specific role tracking
                if voyage_id in self.active_roles:
                    current_voyage_roles = self.active_roles[voyage_id]
                    if role in self.LIMITED_ROLES and current_voyage_roles.get(role) == websocket:
                        del self.active_roles[voyage_id][role]
                        print(f"Role Freed: {role} from Voyage: {voyage_id}")

        asyncio.create_task(remove_connection())

    async def broadcast(self, message: Dict[str, Any], voyage_id: str):
        """Broadcasts a message ONLY to users in the specific voyage."""
        message_json = json.dumps(message)
        dead_connections = []

        # Only look at connections for this specific voyage
        target_connections = self.active_connections.get(voyage_id, [])

        for connection in target_connections:
            try:
                await connection.send_text(message_json)
            except WebSocketDisconnect:
                dead_connections.append(connection)
            except Exception as e:
                print(f"Error sending message: {e}")
                dead_connections.append(connection)

        if dead_connections:
            async with self.lock:
                if voyage_id in self.active_connections:
                    for connection in dead_connections:
                        if connection in self.active_connections[voyage_id]:
                            self.active_connections[voyage_id].remove(connection)