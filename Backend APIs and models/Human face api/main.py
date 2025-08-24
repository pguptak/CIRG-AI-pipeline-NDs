import os
import cv2
import numpy as np
import uvicorn
import httpx
import json
import uuid
import asyncio
from typing import Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import dlib
from ultralytics import YOLO

# ✅ Initialize app
app = FastAPI(
    title="Human Face Detection Gateway",
    description="Detects human faces and filters out animal faces before forwarding to age API.",
    version="1.2.0"
)

# ✅ Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your specific frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Directory setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_INPUT_DIR = os.path.join(BASE_DIR, 'temp_face_inputs')
TEMP_OUTPUT_DIR = os.path.join(BASE_DIR, 'temp_face_outputs')
os.makedirs(TEMP_INPUT_DIR, exist_ok=True)
os.makedirs(TEMP_OUTPUT_DIR, exist_ok=True)

# ✅ Serve annotated images
app.mount("/annotated_face", StaticFiles(directory=TEMP_OUTPUT_DIR), name="annotated_face")

# --- Model Configuration ---
YOLO_WEIGHTS = "yolov8n.pt"
DLIB_WEIGHTS = "shape_predictor_68_face_landmarks.dat"

# Initialize models with error handling
try:
    animal_detector = YOLO(YOLO_WEIGHTS)
    predictor = dlib.shape_predictor(DLIB_WEIGHTS)
    face_detector = dlib.get_frontal_face_detector()
    print("✅ Models loaded successfully")
except Exception as e:
    print(f"❌ Model loading error: {e}")
    raise e

ANIMAL_CLASSES = {"dog", "cat", "bird", "horse", "sheep", "cow", "bear", "elephant", "zebra", "giraffe"}
AGE_API_URL = "https://age-api-667306373563.europe-west1.run.app/process"

# --- Helper Functions ---
def contains_animal(img):
    """Check if image contains animals"""
    try:
        results = animal_detector(img, verbose=False)
        for det in results:
            for box in det.boxes:
                name = animal_detector.names[int(box.cls)]
                if name in ANIMAL_CLASSES and box.conf > 0.7:
                    return True
        return False
    except Exception as e:
        print(f"❌ Animal detection error: {e}")
        return False

def is_human_face(img):
    """Check if image contains valid human faces"""
    try:
        faces = face_detector(img)
        if not faces:
            return False
        
        for face in faces:
            try:
                landmarks = predictor(img, face)
                width, height = face.width(), face.height()
                if width == 0 or height == 0:
                    continue
                aspect = width / float(height)
                if not (0.75 < aspect < 1.4):
                    continue
                return True
            except Exception:
                continue
        return False
    except Exception as e:
        print(f"❌ Face detection error: {e}")
        return False

def annotate_faces(img):
    """Annotate detected faces in the image"""
    try:
        annotated_img = img.copy()
        faces = face_detector(img)
        face_count = 0
        
        for face in faces:
            try:
                # Draw rectangle around face
                x, y, w, h = face.left(), face.top(), face.width(), face.height()
                cv2.rectangle(annotated_img, (x, y), (x + w, y + h), (0, 255, 0), 2)
                cv2.putText(annotated_img, f"Human Face {face_count + 1}", 
                           (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
                face_count += 1
            except Exception:
                continue
                
        return annotated_img, face_count
    except Exception as e:
        print(f"❌ Face annotation error: {e}")
        return img, 0

# ✅ ENHANCED: Better forward function with comprehensive error handling
async def forward_to_age_api(image_path: str):
    """Forward valid human face images to age API"""
    # Try multiple attempts with increasing timeouts
    for attempt in range(3):
        timeout_duration = 60.0 + (attempt * 30.0)  # 60s, 90s, 120s
        print(f"🎯 Attempt {attempt + 1}/3: Calling age API with {timeout_duration}s timeout...")
        
        try:
            timeout = httpx.Timeout(timeout_duration, connect=30.0, read=timeout_duration)
            async with httpx.AsyncClient(timeout=timeout) as client:
                with open(image_path, "rb") as f:
                    files = {"file": ("image.jpg", f, "image/jpeg")}
                    response = await client.post(AGE_API_URL, files=files)
                
                if response.status_code == 200:
                    age_response = response.json()
                    print(f"✅ Age API Response (attempt {attempt + 1}): {age_response}")
                    return {"status": "success", "data": age_response}
                elif response.status_code == 500:
                    print(f"❌ Age API returned 500 error on attempt {attempt + 1}")
                    if attempt < 2:  # Retry on 500 errors
                        await asyncio.sleep(15 * (attempt + 1))  # 15s, 30s backoff
                        continue
                    return {"status": "forward_failed", "error": f"Age API returned 500 error after {attempt + 1} attempts"}
                else:
                    print(f"❌ Age API returned status {response.status_code}")
                    return {"status": "forward_failed", "error": f"Age API returned status {response.status_code}"}
        
        except httpx.TimeoutException:
            print(f"⏰ Timeout on attempt {attempt + 1} after {timeout_duration}s")
            if attempt < 2:
                await asyncio.sleep(20)
                continue
            return {"status": "forward_failed", "error": f"Age API timed out after {attempt + 1} attempts"}
        
        except httpx.RequestError as e:
            print(f"❌ Request error on attempt {attempt + 1}: {e}")
            if attempt < 2:
                await asyncio.sleep(10)
                continue
            return {"status": "forward_failed", "error": f"Network error: {str(e)}"}
        
        except Exception as e:
            print(f"❌ Unexpected error on attempt {attempt + 1}: {e}")
            if attempt < 2:
                await asyncio.sleep(10)
                continue
            return {"status": "forward_failed", "error": f"Unexpected error: {str(e)}"}
    
    return {"status": "forward_failed", "error": "All attempts failed"}

@app.middleware("http")
async def log_request(request: Request, call_next):
    """Log all incoming requests for debugging"""
    print(f"Received {request.method} {request.url.path}")
    response = await call_next(request)
    return response

# ✅ MAIN ENDPOINT: Human face detection with age API forwarding
@app.post("/filter_face/")
async def filter_main(file: UploadFile = File(...)):
    """Main endpoint for face filtering and age processing"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    temp_input_path = os.path.join(TEMP_INPUT_DIR, f"{uuid.uuid4().hex}_{file.filename}")
    
    try:
        # Save uploaded file
        content = await file.read()
        if not content or len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        
        with open(temp_input_path, "wb") as f:
            f.write(content)
        
        # Read image
        img = cv2.imread(temp_input_path)
        if img is None:
            raise HTTPException(status_code=400, detail="Uploaded file could not be read as a valid image.")
        
        # 1. Animal filter
        if contains_animal(img):
            return JSONResponse({
                "valid": False, 
                "status": "animal_detected",
                "reason": "Animal face detected. Only real human images are allowed."
            }, status_code=400)
        
        # 2. Human face filter
        if not is_human_face(img):
            return JSONResponse({
                "valid": False, 
                "status": "no_human_face",
                "reason": "No valid human face detected."
            }, status_code=400)
        
        # 3. Create annotated image
        annotated_img, face_count = annotate_faces(img)
        annotated_filename = f"face_annotated_{uuid.uuid4().hex}.jpg"
        annotated_path = os.path.join(TEMP_OUTPUT_DIR, annotated_filename)
        cv2.imwrite(annotated_path, annotated_img)
        
        # 4. Forward to Age API
        print(f"✅ Valid human face detected! Face count: {face_count}")
        forward_result = await forward_to_age_api(temp_input_path)
        
        if forward_result["status"] == "success":
            age_data = forward_result["data"]
            return JSONResponse(status_code=200, content={
                "valid": True,
                "status": "face_validated_and_processed",
                "message": "Human face validated and processed by age API.",
                "face_count": face_count,
                "annotated_image_url": f"/annotated_face/{annotated_filename}",
                "age_analysis_data": age_data
            })
        else:
            # Return error when age service fails
            return JSONResponse(status_code=503, content={
                "valid": False,
                "status": "age_api_unavailable",
                "message": "Face validation passed but age analysis service is currently unavailable.",
                "error": forward_result.get("error"),
                "face_count": face_count,
                "annotated_image_url": f"/annotated_face/{annotated_filename}"
            })
    
    finally:
        # Cleanup temp file
        if os.path.exists(temp_input_path):
            try:
                os.remove(temp_input_path)
            except Exception:
                pass

@app.get("/", tags=["Health"])
def home():
    """Health check endpoint"""
    return {
        "message": "Human Face Detection Gateway is running",
        "version": "1.2.0",
        "status": "healthy"
    }

@app.get("/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "message": "Face Detection Server is running",
        "models_loaded": True
    }

# ✅ Keep-alive endpoint to prevent cold starts
@app.get("/keepalive")
async def keep_alive():
    """Endpoint to keep both this service and downstream services warm"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Ping the age detection service
            age_response = await client.get("https://age-api-667306373563.europe-west1.run.app/health")
            age_status = "healthy" if age_response.status_code == 200 else f"error_{age_response.status_code}"
    except Exception as e:
        age_status = f"error: {str(e)}"
    
    return {
        "face_gateway": "healthy",
        "age_service": age_status,
        "timestamp": str(uuid.uuid4())
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))  # Changed from 8080 to 8000
    uvicorn.run(app, host="0.0.0.0", port=port)
