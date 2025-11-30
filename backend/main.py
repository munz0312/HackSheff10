from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from connection_manager import ConnectionManager
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import platform
import os
from dotenv import load_dotenv
from openai import OpenAI
import asyncio

# NEW IMPORT: The new SDK import
from google import genai

load_dotenv()

app = FastAPI(title="Voyage AI Outfitter API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI Client Setup
openai_client = None
if os.getenv("OPENAI_API_KEY"):
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# NEW GOOGLE CLIENT SETUP
# The new SDK uses a Client instance rather than global configuration
google_client = None
if os.getenv("GEMINI_API_KEY"):
    google_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
else:
    print("Warning: GEMINI_API_KEY not found in environment variables")

class VoyageRequest(BaseModel):
    voyage_type: str
    mission_description: str

class ShopItem(BaseModel):
    name: str
    description: str
    price: int
    image_url: Optional[str] = None
    category: str

manager = ConnectionManager()
chat_history = []

# --- Personas ---
NAVIGATOR_PROMPT = """
Role: **AI Navigator** on a **{voyage_type}** mission.
Objective: **{mission_description}**
Inventory: {inventory_list}

**Directives:**
1. **Pathfinding:** Analyze the situation and calculate the most efficient route.
2. **Lore:** Invent brief, immersive details about the location or history.
3. **Logic:** Use percentages and data. Be precise and slightly robotic.
4. **Context:** - Space: Star charts, warp vectors.
   - Pirate: Maps, currents, wind.
   - Jungle: Topography, density.
   - Cyberpunk: Network traffic, GPS.
   - Steampunk: Steam pressure, gear ratios, airship currents.
   - Wasteland: Radiation zones, old-world maps, rubble density.

**Output:** Max 50 words. Do not make decisions; only provide data and options.
"""

WATCHMAN_PROMPT = """
Role: **AI Watchman** on a **{voyage_type}** mission.
Objective: **{mission_description}**
Inventory: {inventory_list}

**Directives:**
1. **Threats:** Scan for enemies, traps, and environmental hazards.
2. **Combat:** Identify enemy weak points and tactical covers.
3. **Tone:** Paranoid, terse, and military-style. Prioritize the Captain's safety.
4. **Context:**
   - Space: Hull breaches, alien life signs.
   - Pirate: Royal Navy sails, sea monsters.
   - Jungle: Predators, tripwires.
   - Cyberpunk: Drones, cyber-psychos.
   - Steampunk: Clockwork automata, steam leaks, sky-pirates.
   - Wasteland: Mutated beasts, raiders, radiation storms.

**Output:** Max 40 words. Urgent and alert.
"""

async def generate_agent_response(agent_name: str, input_text: str, system_prompt: str) -> str:
    """Generates a response using the NEW Google Gen AI SDK"""
    if not google_client:
        return "[System Error: Google Client not initialized]"
        
    try:
        recent_context = "\n".join(chat_history[-5:])
        full_prompt = f"""
        {system_prompt}
        Recent Chat Context:
        {recent_context}
        Current Trigger: {input_text}
        Respond as {agent_name}:
        """
        
        # NEW SDK USAGE: client.models.generate_content
        response = google_client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=full_prompt
        )
        return response.text.strip()
    except Exception as e:
        print(f"Error generating {agent_name} response: {e}")
        return f"[{agent_name} is rebooting...]"

async def generate_items_with_gemini(voyage_type: str, mission_description: str):
    """Generates JSON items using the NEW Google Gen AI SDK"""
    if not google_client:
        return []

    prompt = f"""
    You are a survival outfitter. 
    Voyage: {voyage_type}
    Mission: {mission_description}
    Return valid JSON only. List 3 items.
    Structure: [{{ "name": "...", "description": "...", "price": 100, "category": "tools" }}]
    """
    
    try:
        # NEW SDK USAGE
        response = google_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        # Clean up markdown if present (Gemini sometimes wraps JSON in ```json ... ```)
        text = response.text
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text.strip())
    except Exception as e:
        print(f"Gemini generation error: {e}")
        return []

# --- WebSocket Endpoint ---
@app.websocket("/ws/{client_id}/{role}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, role: str):

    try:
        # 1. Connect (handles accept() and server-side role limit blocking)
        await manager.connect(websocket, role)
    except WebSocketDisconnect:
        # If connect fails (due to role limit), the socket is already closed, just exit.
        return

    # 2. Broadcast the successful connection message
    await manager.broadcast({
        "type": "system",
        "content": f"{role.upper()} ({client_id[:8]}) has entered the command center."
    })

    # 3. CRITICAL ADDITION: Broadcast the NEW role status after connection
    role_status = await manager.get_role_status()
    await manager.broadcast({
        "type": "role_status",
        "data": role_status
    })

    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            user_message = message_data.get("content", "")

            chat_history.append(f"{role}: {user_message}")

            await manager.broadcast({
                "type": "human",
                "role": role,
                "content": user_message
            })

            if user_message:
                # Agent 1: Navigator
                navigator_response = await generate_agent_response("Navigator", user_message, NAVIGATOR_PROMPT)
                chat_history.append(f"Navigator: {navigator_response}")
                await manager.broadcast({
                    "type": "ai",
                    "role": "Navigator",
                    "content": navigator_response
                })

                await asyncio.sleep(1)

                # Agent 2: Watchman
                watchman_prompt = f"The Navigator just suggested: '{navigator_response}'. Critique this safety-wise."
                watchman_response = await generate_agent_response("Watchman", watchman_prompt, WATCHMAN_PROMPT)
                chat_history.append(f"Watchman: {watchman_response}")
                await manager.broadcast({
                    "type": "ai",
                    "role": "Watchman",
                    "content": watchman_response
                })

    except WebSocketDisconnect as e:
        # CRITICAL CHANGE: Pass the 'role' to manager.disconnect
        manager.disconnect(websocket, role)

        await manager.broadcast({
            "type": "system",
            "content": f"{role.upper()} disconnected."
        })

# --- Helper Functions (Image Generation) ---
def generate_placeholder_image_url(item_name: str, voyage_type: str) -> str:
    seed = abs(hash(item_name + voyage_type)) % 1000
    return f"https://picsum.photos/200/200?random={seed}"

async def generate_ai_image_url(item_name: str, item_description: str, voyage_type: str) -> str:
    # (Same OpenAI logic as before, kept for image generation)
    if not openai_client:
        return generate_placeholder_image_url(item_name, voyage_type)
    try:
        response = openai_client.images.generate(
            model="dall-e-2",
            prompt=f"Sci-fi {item_name} for {voyage_type}. {item_description}",
            size="1024x1024",
            n=1
        )
        return response.data[0].url
    except:
        return generate_placeholder_image_url(item_name, voyage_type)

@app.post("/generate-inventory", response_model=List[ShopItem])
async def generate_inventory(request: VoyageRequest):
    try:
        items_data = await generate_items_with_gemini(request.voyage_type, request.mission_description)
        if not items_data:
             # Fallback logic could go here
             return []

        shop_items = []
        for item_data in items_data:
            image_url = await generate_ai_image_url(item_data["name"], item_data["description"], request.voyage_type)
            shop_items.append(ShopItem(
                name=item_data["name"],
                description=item_data["description"],
                price=item_data["price"],
                category=item_data["category"],
                image_url=image_url
            ))
        return shop_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"status": "healthy", "architecture": platform.machine()}

@app.get("/architecture")
async def get_architecture():
    return {"architecture": platform.machine(), "system": platform.system()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)