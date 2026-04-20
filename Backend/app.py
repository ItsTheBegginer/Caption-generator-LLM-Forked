from typing import List
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io

from model_loader import load_model
from caption_generator import generate_captions
from nsfw_detector import load_nsfw_model, detect_nsfw
from story_engine import build_story

# ----------------------------
# Create FastAPI App
# ----------------------------

app = FastAPI()

# Enable CORS (important for frontend connection)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Load Model Once At Startup
# ----------------------------

try:
    processor, model = load_model()
    print("✅ Model loaded successfully.")
except Exception as e:
    print("❌ Failed to load model:", e)
    processor, model = None, None

try:
    nsfw_processor, nsfw_model, nsfw_device = load_nsfw_model()
except Exception as e:
    print("❌ Failed to load NSFW model wrapper:", e)
    nsfw_processor, nsfw_model, nsfw_device = None, None, None


# ----------------------------
# Root Test Route
# ----------------------------

@app.get("/")
def root():
    return {"message": "AI Caption Generator Backend Running 🚀"}


# ----------------------------
# Generate Caption Endpoint
# ----------------------------

@app.post("/generate")
async def generate_caption(
    file: UploadFile = File(...),
    tone: str = Form("casual")
):
    if processor is None or model is None:
        return {"error": "Model not loaded properly."}

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        captions = generate_captions(image, processor, model, tone)

        return {
            "status": "success",
            "captions": captions
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# ----------------------------
# NSFW Check Endpoint
# ----------------------------

@app.post("/check-nsfw")
async def check_nsfw(file: UploadFile = File(...)):
    if nsfw_processor is None or nsfw_model is None:
        return {"error": "NSFW Model not loaded properly."}

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        result = detect_nsfw(image, nsfw_processor, nsfw_model, nsfw_device)

        return {
            "status": "success",
            "result": result
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# ----------------------------
# Generate Story Endpoint
# ----------------------------

@app.post("/generate-story")
async def generate_story(files: List[UploadFile] = File(...)):
    if processor is None or model is None:
        return {"error": "Model not loaded properly."}

    if len(files) > 5:
        return {"error": "Maximum of 5 images allowed for story generation."}

    try:
        captions = []
        for file in files:
            contents = await file.read()
            image = Image.open(io.BytesIO(contents)).convert("RGB")
            # Generate a simple informative caption to use for the story
            generated = generate_captions(image, processor, model, "informative")
            if generated and len(generated) > 0:
                captions.append(generated[0])
            else:
                captions.append("an image")

        story = build_story(captions)

        return {
            "status": "success",
            "captions": captions,
            "story": story
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

