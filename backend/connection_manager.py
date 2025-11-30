from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Any
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        # Stores active WebSocket connections
        self.active_connections: List[WebSocket] = []

        # Tracks which limited roles are currently occupied
        # The key is the role name (e.g., 'captain'), the value is the WebSocket instance
        self.active_roles: Dict[str, WebSocket] = {}
        self.LIMITED_ROLES = ["captain", "specialist"]

        # Lock to ensure thread-safe updates to shared state (important for async)
        self.lock = asyncio.Lock()

    async def get_role_status(self) -> Dict[str, bool]:
            """Returns the current occupancy status of limited roles."""
            async with self.lock:
                status = {}
                for role in self.LIMITED_ROLES:
                    # Returns True if the role is in active_roles (i.e., occupied)
                    status[role] = role in self.active_roles
                return status

    async def connect(self, websocket: WebSocket, role: str):
            # 1. Accept the connection first
            await websocket.accept()

            async with self.lock:
                if role in self.LIMITED_ROLES:
                    # 2. CRITICAL: Check for the limit inside the lock
                    if role in self.active_roles:
                        reason = f"Connection Denied: Only one active {role} is allowed."
                        print(reason)

                        # 3. Close the socket with the custom code 4000 and the reason
                        await websocket.close(code=4000, reason=reason)

                        # 4. Raise disconnect to stop execution in main.py
                        raise WebSocketDisconnect(4000) #

                    # If the limit is not met, assign the role
                    self.active_roles[role] = websocket #

                # Add the connection to the main list
                self.active_connections.append(websocket) #

    def disconnect(self, websocket: WebSocket, role: str):
            # This method is now safe to call from the main event loop
            async def remove_connection():
                async with self.lock:
                    # Remove from general connections list
                    if websocket in self.active_connections:
                        self.active_connections.remove(websocket)

                    # Remove from role tracking if it was a limited role
                    if role in self.LIMITED_ROLES and self.active_roles.get(role) == websocket:
                        del self.active_roles[role] #

            # Use create_task for async removal without blocking the exception handler
            asyncio.create_task(remove_connection()) #

    async def broadcast(self, message: Dict[str, Any]):
        message_json = json.dumps(message)

        dead_connections = []

        for connection in self.active_connections:
            try:
                await connection.send_text(message_json)
            except WebSocketDisconnect:
                # Mark disconnected clients for cleanup
                dead_connections.append(connection)
            except Exception as e:
                # Handle other potential send errors
                print(f"Error sending message: {e}")
                dead_connections.append(connection)

        # Clean up dead connections (though the main cleanup happens on disconnect)
        if dead_connections:
            async with self.lock:
                for connection in dead_connections:
                    if connection in self.active_connections:
                         self.active_connections.remove(connection)