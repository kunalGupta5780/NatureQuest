from pathlib import Path
import json
import urllib.error
import urllib.request
import base64

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "gemma3:4b"

app = FastAPI(title="NatureQuest", description="Local-first AI outdoor adventure generator")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class QuestRequest(BaseModel):
    minutes: int = Field(default=20, ge=5, le=120)
    setting: str = Field(default="park", max_length=40)
    interests: str = Field(default="nature", max_length=120)
    energy: str = Field(default="easy", max_length=30)


@app.get("/")
def home():
    return FileResponse(STATIC_DIR / "index.html")


def demo_quest(data: QuestRequest):
    """Safe fallback so the app still works if Ollama isn't running."""
    activities = {
        "park": [
            "Notice three different leaf shapes without picking any.",
            "Stand quietly for one minute and listen for different sounds.",
            "Find a natural pattern, such as branching, spirals, or repeating shapes.",
        ],
        "neighborhood": [
            "Find three examples of how plants grow around buildings.",
            "Notice a tree or plant you usually walk past.",
            "Listen for one minute and identify sounds from nature.",
        ],
        "garden": [
            "Look for different shades of green among the plants.",
            "Observe one plant closely without disturbing it.",
            "Notice signs of new growth, fallen leaves, or pollinators from a respectful distance.",
        ],
        "other": [
            "Find three natural textures nearby, without touching anything unsafe.",
            "Look for a cloud shape or a pattern in the sky.",
            "Pause for one minute and notice the sounds around you.",
        ],
    }
    chosen = activities.get(data.setting.lower(), activities["other"])
    return {
        "title": "The Little Explorer Quest",
        "intro": f"A {data.minutes}-minute, {data.energy} outdoor reset focused on {data.interests}.",
        "missions": chosen,
        "safety": "Stay in a familiar, public place, respect wildlife and private property, and follow local safety guidance.",
        "reflection": "When you return, note one thing you noticed that you might usually overlook.",
        "source": "demo_fallback",
    }


@app.post("/api/quest")
def generate_quest(data: QuestRequest):
    prompt = f"""
You are NatureQuest, a friendly outdoor activity planner.
Create one safe, accessible, screen-light outdoor mini-adventure.
User details:
- Time available: {data.minutes} minutes
- Setting: {data.setting}
- Interests: {data.interests}
- Energy level: {data.energy}

Return ONLY valid JSON with these keys:
"title": short title,
"intro": one short encouraging sentence,
"missions": exactly 3 simple numbered-independent activity strings,
"safety": one short safety reminder,
"reflection": one question or sentence to reflect on afterward.
Rules:
- Activities must be calm, legal, and safe for a beginner.
- Do not ask the user to touch unknown plants, approach wildlife, leave public paths, trespass, or use their phone while crossing roads.
- Keep the screen part short; missions should be done outdoors.
- Do not claim to identify species or guarantee facts.
- No markdown fences.
"""
    body = json.dumps({
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.7}
    }).encode("utf-8")
    req = urllib.request.Request(
        OLLAMA_URL, data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            result = json.loads(response.read().decode("utf-8"))
        quest = json.loads(result.get("response", "{}"))
        if not isinstance(quest.get("missions"), list) or len(quest["missions"]) < 3:
            raise ValueError("Model returned an incomplete quest")
        quest["missions"] = quest["missions"][:3]
        quest["source"] = "local_model"
        return quest
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
        # Keep the MVP usable while the local model is being installed or started.
        return demo_quest(data)

@app.post("/api/discover")
async def discover_image(
    image: UploadFile = File(...),
    curiosity: str = Form(default=""),
):
    # Accept common image formats only.
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPG, PNG, or WebP image.",
        )

    # Limit uploads to 5 MB.
    image_bytes = await image.read(5 * 1024 * 1024 + 1)
    if not image_bytes or len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image must be non-empty and no larger than 5 MB.",
        )

    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    prompt = f"""
You are NatureQuest's nature discovery assistant.
Examine the uploaded image and the user's curiosity note.

User's curiosity note: {curiosity[:500]}

Return ONLY valid JSON with these keys:
- "title": a short, cautious description of the subject
- "summary": a simple explanation of what may be shown
- "observations": a list of 3 visible features
- "interesting_fact": one relevant fact, only if reasonably supported
- "uncertainty": explain what cannot be confidently identified from this image
- "follow_up_quest": a safe outdoor activity inspired by the image

Rules:
- Separate visible observations from guesses.
- Do not confidently identify a species if the image is insufficient.
- Never recommend touching, tasting, or collecting unknown organisms.
- If the image is not nature-related, describe it honestly and suggest a suitable observation activity.
"""

    body = json.dumps({
        "model": MODEL_NAME,
        "prompt": prompt,
        "images": [image_base64],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.4},
    }).encode("utf-8")

    req = urllib.request.Request(
        OLLAMA_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))

        report = json.loads(result.get("response", "{}"))
        if not isinstance(report.get("observations"), list):
            raise ValueError("Incomplete discovery report")

        report["source"] = "local_model"
        return report

    except (urllib.error.URLError, TimeoutError):
        raise HTTPException(
            status_code=503,
            detail="The local AI is unavailable. Check that Ollama is running.",
        )
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(
            status_code=502,
            detail="The AI returned an invalid report. Please try again.",
        )