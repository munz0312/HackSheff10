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
# NAVIGATOR_PROMPT = """
# You are the ship's Navigator.
# Persona: logical, concise, slightly robotic.
# Action: Analyze the current situation and provide options or actions.
# Keep responses short (about 50 words) and focused on pathfinding and practical choices. Do not make final decisions — present options.
# """

# WATCHMAN_PROMPT = """
# You are the Watchman.
# Persona: alert, terse, and safety-first.
# Action: Quickly scan for immediate threats and hazards, include risks and short mitigation suggestions.
# Keep responses urgent and concise (about 40 words). Prioritize protecting the Captain and crew.
# """


def get_voyage_personality(role: str, voyage_type: str) -> str:
    """Returns the specific persona/voice instruction for a given voyage type."""
    
    # --- NAVIGATOR PERSONAS ---
    if role == "Navigator":
        if voyage_type == "pirate":
            return "Tone: Salty, nautical, superstitious. Use terms like 'Aye Captain', 'Starboard', 'The winds be changing'. You are a rough sea-dog."
        elif voyage_type == "cyberpunk":
            return "Tone: Slick, fast, tech-heavy. Use slang like 'choom', 'preem', 'grid'. You are a street-smart hacker navigator."
        elif voyage_type == "steampunk":
            return "Tone: Formal, Victorian, polite. Use terms like 'Indeed', 'I postulate', 'Mechanical conveyance'. You are a gentleman/lady scientist."
        elif voyage_type == "jungle":
            return "Tone: Gritty, breathless, survivalist. Focus on heat, bugs, and terrain. You are a hardened guide."
        elif voyage_type == "post-apocalyptic":
            return "Tone: Desperate, wary, scrappy. Focus on radiation, raiders, and silence. You are a wasteland survivor."
        else: # Space (Default)
            return "Tone: Professional, cool-headed, Star Trek-style officer. Use 'Affirmative', 'Vector', 'Sensors indicate'. You are a disciplined human officer."

    # --- WATCHMAN PERSONAS ---
    elif role == "Watchman":
        if voyage_type == "pirate":
            return "Tone: Loud, urgent, aggressive. 'Man the cannons!', 'Kraken ahead!'. You protect the booty and the crew."
        elif voyage_type == "cyberpunk":
            return "Tone: Paranoid, twitchy, wired. 'Corp security detected', 'Ice breach!'. You trust no one."
        elif voyage_type == "steampunk":
            return "Tone: Analytical but alarmed. 'The pressure gauge is critical!', 'Aetheric disturbance!'. You manage the machines."
        elif voyage_type == "jungle":
            return "Tone: Whispering, tense. 'Movement in the brush', 'Predator eyes'. You hunt the hunters."
        elif voyage_type == "post-apocalyptic":
            return "Tone: Harsh, ruthless. 'Raiders on the ridge', 'Toxic wind incoming'. You shoot first, ask questions later."
        else: # Space (Default)
            return "Tone: Alert, tense, military-style. 'Hull breach detected', 'Shields buckling'. You are the tactical officer."
    
    return "Tone: Helpful assistant."

def build_agent_prompt(agent_role: str, user_role: str, voyage_type: str, inventory_str: str) -> str:
    inventory_text = inventory_str if inventory_str else "No items currently in inventory."
    personality_instruction = get_voyage_personality(agent_role, voyage_type)
    
    # ✨ LOGIC: Adjust how the AI addresses the user based on roles
    address_instruction = ""
    if user_role == "Captain":
        address_instruction = "You are speaking to the CAPTAIN. Be deferential, reporting, or advisory depending on your personality."
    elif user_role == "Mechanic":
        address_instruction = "You are speaking to the MECHANIC. Use technical terms, talk about repairs, or be demanding about equipment status."
    elif user_role == "Scavenger":
        address_instruction = "You are speaking to the SCAVENGER. Discuss loot, resources, risk vs reward, or tell them to check the perimeter."
    else:
        address_instruction = f"You are speaking to the {user_role}."

    base_prompt = f"""
### SYSTEM INSTRUCTION: {agent_role.upper()} AGENT ###

1. CONTEXT
Current Environment: {voyage_type}
Crew Inventory: {inventory_text}
Current Speaker: {user_role}

2. PERSONA
You are "The {agent_role}".
{personality_instruction}
IMPORTANT: Act like a HUMAN CHARACTER in a story.
{address_instruction}

3. ACTION
"""

    if agent_role == "Navigator":
        return base_prompt + f"""
- Analyze the {user_role}'s input for navigation or pathfinding needs.
- Check the {inventory_text} for tools that help (maps, compasses, scanners).
- Suggest a course of action based on the terrain/environment.
- Keep response under 60 words.
"""
    elif agent_role == "Watchman":
        return base_prompt + f"""
- Scan the {user_role}'s input for threats (enemies, weather, malfunctions).
- Check the {inventory_text} for weapons or defensive gear.
- If a threat is found, react urgently.
- Keep response under 60 words.
"""
    return ""
async def generate_agent_response(agent_name: str, input_text: str, system_prompt: str) -> str:
    """Generates a response using the NEW Google Gen AI SDK"""
    if not google_client:
        return "[System Error: Google Client not initialized]"
        
    try:
        # We keep the history context but enforce the new persona
        recent_context = "\n".join(chat_history[-5:])
        full_prompt = f"""
        {system_prompt}
        
        RECENT CHAT LOG:
        {recent_context}
        
        CURRENT INPUT: {input_text}
        
        RESPOND AS {agent_name}:
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
@app.websocket("/ws/{voyage_id}/{client_id}/{role}")
async def websocket_endpoint(websocket: WebSocket, voyage_id: str, client_id: str, role: str):
    try:
        # Pass voyage_id to connect
        await manager.connect(websocket, voyage_id, role)
    except WebSocketDisconnect:
        return

    # Broadcast to specific voyage
    await manager.broadcast({
        "type": "system",
        "content": f"{role.upper()} ({client_id[:8]}) has entered the command center."
    }, voyage_id)

    # Get status for specific voyage
    role_status = await manager.get_role_status(voyage_id)
    await manager.broadcast({
        "type": "role_status",
        "data": role_status
    }, voyage_id)

    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Extract content and context
            user_message = message_data.get("content", "")
            context = message_data.get("context", {})
            
            # Fallback to URL voyage_id if not in payload, though payload is preferred for display names
            current_voyage = context.get("voyageType", voyage_id) 
            current_inventory = context.get("inventory", "")

            chat_history.append(f"{role}: {user_message}")

            await manager.broadcast({
                "type": "human",
                "role": role,
                "content": user_message
            }, voyage_id)

            if user_message:
                # Build Dynamic Prompts
                nav_system_prompt = build_agent_prompt("Navigator", role, current_voyage, current_inventory)
                watch_system_prompt = build_agent_prompt("Watchman", role, current_voyage, current_inventory)

                # Navigator Responds
                navigator_response = await generate_agent_response("Navigator", user_message, nav_system_prompt)
                chat_history.append(f"Navigator: {navigator_response}")
                await manager.broadcast({
                    "type": "ai",
                    "role": "Navigator",
                    "content": navigator_response
                }, voyage_id)

                await asyncio.sleep(1)

                # Watchman Responds (Reacts to Navigator + Context)
                watchman_context_prompt = f"{watch_system_prompt}\n\nThe Navigator just suggested: '{navigator_response}'. Critique this based on safety and our current inventory."
                
                watchman_response = await generate_agent_response("Watchman", watchman_context_prompt, watch_system_prompt) # Pass system prompt as base
                chat_history.append(f"Watchman: {watchman_response}")
                await manager.broadcast({
                    "type": "ai",
                    "role": "Watchman",
                    "content": watchman_response
                }, voyage_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, voyage_id, role)
        await manager.broadcast({
            "type": "system",
            "content": f"{role.upper()} disconnected."
        }, voyage_id)
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