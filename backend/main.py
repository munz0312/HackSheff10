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
import base64
import io
import random
from google import genai
import asyncio


load_dotenv()

app = FastAPI(title="Voyage AI Outfitter API")

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI if API key is available
openai_client = None
if os.getenv("OPENAI_API_KEY"):
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class VoyageRequest(BaseModel):
    voyage_type: str
    mission_description: str

class ShopItem(BaseModel):
    name: str
    description: str
    price: int
    image_url: Optional[str] = None
    category: str

gen_ai_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
model = gen_ai_client.get_model('gemini-2.5-flash')

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # 1. Broadcast Human Message
            await manager.broadcast(f"Human {client_id}: {message_data['content']}")
            
            # 2. Trigger AI Agent 1 (The Outfitter)
            # This agent suggests an item based on the chat context
            outfitter_response = await generate_agent_response("Outfitter", message_data['content'])
            await manager.broadcast(f"Outfitter AI: {outfitter_response}")
            
            # 3. Trigger AI Agent 2 (The Safety Officer)
            # This agent analyzes the risk of the Outfitter's suggestion
            safety_response = await generate_agent_response("Safety Officer", outfitter_response)
            await manager.broadcast(f"Safety AI: {safety_response}")
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/")
async def root():
    """Health check endpoint that displays server architecture"""
    return {
        "status": "healthy",
        "architecture": platform.machine(),
        "system": platform.system(),
        "message": "Voyage AI Outfitter API is running"
    }

@app.get("/architecture")
async def get_architecture():
    """Endpoint to specifically display architecture info"""
    return {
        "architecture": platform.machine(),
        "system": platform.system(),
        "processor": platform.processor(),
        "python_version": platform.python_version()
    }

def generate_placeholder_image_url(item_name: str, voyage_type: str) -> str:
    """Generate a placeholder image URL for fallback when image generation fails"""
    # For demo purposes, use a placeholder service or return simulated data
    seed = abs(hash(item_name + voyage_type)) % 1000
    return f"https://picsum.photos/200/200?random={seed}"

async def generate_ai_image_url(item_name: str, item_description: str, voyage_type: str) -> str:
    """Generate an AI image using OpenAI DALL-E based on item details"""
    try:
        # Check if image generation is disabled
        if os.getenv("IMAGE_GENERATION_ENABLED", "true").lower() == "false":
            return generate_placeholder_image_url(item_name, voyage_type)

        if not openai_client:
            # Fallback to placeholder if OpenAI client not available
            return generate_placeholder_image_url(item_name, voyage_type)

        # Get configuration from environment variables
        image_model = os.getenv("IMAGE_MODEL", "dall-e-2")
        image_size = os.getenv("IMAGE_SIZE", "1024x1024")

        # Create a detailed prompt based on item information
        prompt = f"""
        Create a detailed image of a {item_name} for {voyage_type} exploration.
        Description: {item_description}

        Style: Adventure/Survival equipment, realistic, high quality,
        professional product photography style, isolated on clean background.
        The item should look practical and well-designed for its intended purpose.
        """

        # Generate image using DALL-E (quality parameter only supported for dall-e-3)
        generation_params = {
            "model": image_model,
            "prompt": prompt.strip(),
            "size": image_size,
            "n": 1
        }

        # Only add quality parameter for DALL-E 3
        if image_model == "dall-e-3":
            generation_params["quality"] = os.getenv("IMAGE_QUALITY", "standard")
 
        response = openai_client.images.generate(**generation_params)

        return response.data[0].url

    except Exception as e:
        print(f"Failed to generate AI image for {item_name}: {str(e)}")
        # Fallback to placeholder URL
        return generate_placeholder_image_url(item_name, voyage_type)

# async def generate_items_with_openai(voyage_type: str, mission_description: str) -> List[dict]:
#     """Use OpenAI to generate survival items based on voyage and mission"""
#     try:
#         if not openai_client:
#             print("OpenAI client not initialized")
#             return generate_fallback_items(voyage_type, mission_description)

#         prompt = f"""Generate 3-5 unique survival items for a fictional voyage.

# Voyage Type: {voyage_type}
# Mission: {mission_description}

# Return the response as a JSON array with the following structure:
# [
#     {{
#         "name": "Item Name",
#         "description": "Brief description of the item and its purpose",
#         "price": 100,
#         "category": "category_name"
#     }}
# ]

# Make the items creative, relevant to the specific voyage type and mission.
# Prices should be fictional credits (10-500 range).
# Categories should be: "tools", "safety", "navigation", "communication", or "medical".

# Ensure your response is valid JSON only - no extra text or explanations."""

#         response = openai_client.chat.completions.create(
#             model="gpt-3.5-turbo",
#             messages=[
#                 {"role": "system", "content": "You are a creative assistant that generates fictional survival items as valid JSON arrays only."},
#                 {"role": "user", "content": prompt}
#             ],
#             max_tokens=1000,
#             temperature=0.8
#         )

#         text = response.choices[0].message.content.strip()

#         # Clean the response and parse JSON
#         if text.startswith("```json"):
#             text = text[7:]
#         if text.endswith("```"):
#             text = text[:-3]
#         text = text.strip()

#         items_data = json.loads(text)
#         return items_data

#     except Exception as e:
#         print(f"OpenAI API error: {e}")
#         # Fallback to hardcoded items if API fails
#         return generate_fallback_items(voyage_type, mission_description)


OUTFITTER_PROMPT = """
You are 'The Outfitter', an enthusiastic, slightly chaotic merchant in a sci-fi survival store. 
Your goal is to sell items based on the mission context. You are optimistic and love dangerous gadgets.
Keep responses short (under 50 words). Address the humans directly.
"""

SAFETY_PROMPT = """
You are 'The Safety Officer', a nervous, risk-averse AI droid. 
Your job is to analyze what 'The Outfitter' suggests and point out why it is dangerous or against regulations.
You are bureaucratic and worried. Keep responses short (under 50 words).
"""

# Store chat history for context
chat_history = []

@app.websocket("/ws/{client_id}/{role}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, role: str):
    await manager.connect(websocket, role)
    
    # Notify that a user joined
    await manager.broadcast({
        "type": "system",
        "content": f"{role} ({client_id}) has entered the command center."
    })

    try:
        while True:
            # 1. Receive Human Message
            data = await websocket.receive_text()
            message_data = json.loads(data)
            user_message = message_data.get("content", "")
            
            # Add to history
            chat_history.append(f"{role}: {user_message}")
            
            # Broadcast Human Message immediately
            await manager.broadcast({
                "type": "human",
                "role": role,
                "content": user_message
            })

            # 2. Trigger AI Agents (Only if the message isn't empty)
            if user_message:
                # Agent 1: The Outfitter (Reacts to the human)
                outfitter_response = await generate_agent_response("Outfitter", user_message, OUTFITTER_PROMPT)
                chat_history.append(f"Outfitter: {outfitter_response}")
                
                await manager.broadcast({
                    "type": "ai",
                    "role": "Outfitter",
                    "content": outfitter_response
                })

                # Agent 2: Safety Officer (Reacts to the Outfitter)
                # Give a small delay for dramatic effect
                await asyncio.sleep(1) 
                
                safety_prompt = f"The Outfitter just suggested: '{outfitter_response}'. Critique this safety-wise."
                safety_response = await generate_agent_response("Safety Officer", safety_prompt, SAFETY_PROMPT)
                chat_history.append(f"Safety Officer: {safety_response}")
                
                await manager.broadcast({
                    "type": "ai",
                    "role": "Safety Officer",
                    "content": safety_response
                })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast({
            "type": "system",
            "content": f"{role} disconnected."
        })

async def generate_agent_response(agent_name: str, input_text: str, system_prompt: str) -> str:
    """Generates a response using Gemini based on the persona"""
    try:
        # Construct a context-aware prompt
        # We limit history to last 5 messages to keep context relevant and tokens low
        recent_context = "\n".join(chat_history[-5:])
        
        full_prompt = f"""
        {system_prompt}
        
        Recent Chat Context:
        {recent_context}
        
        Current Trigger: {input_text}
        
        Respond as {agent_name}:
        """
        
        response = model.generate_content(full_prompt, stream=False)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating {agent_name} response: {e}")
        return f"[{agent_name} is rebooting...]"


async def generate_items_with_gemini(voyage_type: str, mission_description: str):
    prompt = f"""
    You are a survival outfitter. 
    Voyage: {voyage_type}
    Mission: {mission_description}
    Return valid JSON only. List 3 items.
    """
    
    response = model.generate_content(prompt, stream=False)
    # Parse response.text similar to how you did with OpenAI
    return json.loads(response.text)

def generate_fallback_items(voyage_type: str, mission_description: str) -> List[dict]:
    """Fallback item generation when OpenAI API is unavailable"""
    base_items = {
        "space": [
            {"name": "Zero-Gravity Multi-Tool", "description": "Compact tool kit for repairs in microgravity", "price": 250, "category": "tools"},
            {"name": "Emergency Oxygen Canister", "description": "4-hour backup oxygen supply", "price": 180, "category": "safety"},
            {"name": "Quantum Navigation Device", "description": "Deep space navigation with quantum entanglement", "price": 450, "category": "navigation"}
        ],
        "pirate": [
            {"name": "Cutlass of the Seven Seas", "description": "Enchanted blade that never rusts", "price": 320, "category": "tools"},
            {"name": "Eye of the Storm Compass", "description": "Magical compass that points to treasure", "price": 280, "category": "navigation"},
            {"name": "Grog of Eternal Life", "description": "Healing potion that cures scurvy and wounds", "price": 150, "category": "medical"}
        ],
        "jungle": [
            {"name": "Machete of the Ancient Temple", "description": "Sharp blade that cuts through magical vines", "price": 200, "category": "tools"},
            {"name": "Anti-Poison Dart Kit", "description": "Complete antivenom collection for jungle creatures", "price": 220, "category": "medical"},
            {"name": "Sunstone Navigation Amulet", "description": "Ancient device that always points to civilization", "price": 380, "category": "navigation"}
        ]
    }

    return base_items.get(voyage_type.lower(), base_items["space"])

@app.post("/generate-inventory", response_model=List[ShopItem])
async def generate_inventory(request: VoyageRequest):
    """Generate shop inventory based on voyage type and mission"""
    try:
        # Generate items using OpenAI or fallback
        items_data = await generate_items_with_gemini(request.voyage_type, request.mission_description)

        # Convert to ShopItem models with AI-generated image URLs
        shop_items = []
        for item_data in items_data:
            # Generate AI image for each item
            image_url = await generate_ai_image_url(
                item_data["name"],
                item_data["description"],
                request.voyage_type
            )

            item = ShopItem(
                name=item_data["name"],
                description=item_data["description"],
                price=item_data["price"],
                category=item_data["category"],
                image_url=image_url
            )
            shop_items.append(item)

        return shop_items

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate inventory: {str(e)}")
    
    
    
    


if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Starting Voyage AI Outfitter API on {platform.machine()} architecture")
    print(f"📋 System: {platform.system()} {platform.release()}")
    print(f"🐍 Python: {platform.python_version()}")

    uvicorn.run(app, host="0.0.0.0", port=8000)
