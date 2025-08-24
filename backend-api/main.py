import os
import cv2
import numpy as np
import uvicorn
import httpx
import json
import uuid
from typing import Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# ✅ Initialize app
app = FastAPI(
    title="Age-Based Image Gateway",
    description="Processes images with kids (≤18) and rejects images with only adults (>18).",
    version="1.1.0"
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
TEMP_INPUT_DIR = os.path.join(BASE_DIR, 'temp_age_inputs')
TEMP_OUTPUT_DIR = os.path.join(BASE_DIR, 'temp_age_outputs')
AUTISM_ANNOTATED_DIR = os.path.join(BASE_DIR, 'annotated')  # For autism images

os.makedirs(TEMP_INPUT_DIR, exist_ok=True)
os.makedirs(TEMP_OUTPUT_DIR, exist_ok=True)
os.makedirs(AUTISM_ANNOTATED_DIR, exist_ok=True)

# ✅ CRITICAL FIX: Serve both age and autism annotated images
app.mount("/annotated_age", StaticFiles(directory=TEMP_OUTPUT_DIR), name="annotated_age")
app.mount("/annotated", StaticFiles(directory=AUTISM_ANNOTATED_DIR), name="autism_annotated")  # This was missing!

# --- Model Configuration ---
faceProto = "opencv_face_detector.pbtxt"
faceModel = "opencv_face_detector_uint8.pb"
ageProto = "age_deploy.prototxt"
ageModel = "age_net.caffemodel"

MODEL_MEAN_VALUES = (78.4263377603, 87.7689143744, 114.895847746)
ageList = ['(0-2)', '(4-6)', '(8-12)', '(15-20)', '(25-32)', '(38-43)', '(48-53)', '(60-100)']

# --- Load Models ---
faceNet = cv2.dnn.readNet(faceModel, faceProto)
ageNet = cv2.dnn.readNet(ageModel, ageProto)

# --- Helper Functions ---
def highlightFace_and_annotate(net, frame):
    frameOpencvDnn = frame.copy()
    frameHeight, frameWidth, _ = frameOpencvDnn.shape
    blob = cv2.dnn.blobFromImage(frameOpencvDnn, 1.0, (300, 300), [104, 117, 123], True, False)

    net.setInput(blob)
    detections = net.forward()
    annotations = []
    padding = 20

    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]
        if confidence > 0.7:
            x1 = int(detections[0, 0, i, 3] * frameWidth)
            y1 = int(detections[0, 0, i, 4] * frameHeight)
            x2 = int(detections[0, 0, i, 5] * frameWidth)
            y2 = int(detections[0, 0, i, 6] * frameHeight)

            face = frame[max(0, y1 - padding):min(y2 + padding, frameHeight - 1),
                         max(0, x1 - padding):min(x2 + padding, frameWidth - 1)]

            if face.size == 0: continue

            age_blob = cv2.dnn.blobFromImage(face, 1.0, (227, 227), MODEL_MEAN_VALUES, swapRB=False)
            ageNet.setInput(age_blob)
            agePreds = ageNet.forward()
            age = ageList[agePreds[0].argmax()]
            
            label = f"Age: {age}"
            cv2.rectangle(frameOpencvDnn, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frameOpencvDnn, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2, cv2.LINE_AA)
            annotations.append({"age": age, "box": [x1, y1, x2, y2]})

    return frameOpencvDnn, annotations

def is_kid(age: str) -> bool:
    kid_ages = ['(0-2)', '(4-6)', '(8-12)', '(15-20)']
    return age in kid_ages

def process_image_for_age_check(image_path: str) -> Dict[str, Any]:
    frame = cv2.imread(image_path)
    if frame is None:
        raise HTTPException(status_code=400, detail="Could not read image file.")

    annotated_frame, annotations = highlightFace_and_annotate(faceNet, frame)
    
    # Save annotated image to the output directory
    annotated_filename = f"annotated_{uuid.uuid4().hex}.jpg"
    annotated_path = os.path.join(TEMP_OUTPUT_DIR, annotated_filename)
    cv2.imwrite(annotated_path, annotated_frame)
    
    if not annotations:
        return {
            "has_faces": False, 
            "contains_kids": False, 
            "annotations": [],
            "kids_count": 0,
            "adults_count": 0,
            "annotated_image_url": None
        }

    kids_count = sum(1 for ann in annotations if is_kid(ann["age"]))
    
    return {
        "has_faces": True,
        "contains_kids": kids_count > 0,
        "annotations": annotations,  # Include full annotations array
        "kids_count": kids_count,
        "adults_count": len(annotations) - kids_count,
        "annotated_image_url": f"/annotated_age/{annotated_filename}"
    }

# ✅ FIXED: Save autism image to correct directory with proper path
def save_autism_image_locally(image_data, filename: str) -> str:
    """Save autism annotated image to local directory and return the path"""
    local_filename = f"annotated_{uuid.uuid4().hex}.jpg"
    local_path = os.path.join(AUTISM_ANNOTATED_DIR, local_filename)
    
    try:
        # If image_data is bytes, write directly
        if isinstance(image_data, bytes):
            with open(local_path, 'wb') as f:
                f.write(image_data)
        # If it's a file path or other format, handle accordingly
        else:
            # You might need to adjust this based on how the autism API returns images
            pass
            
        return f"/annotated/{local_filename}"
    except Exception as e:
        print(f"Error saving autism image: {e}")
        return None

# ✅ FIXED: Modified forward function to handle autism image properly
async def forward_to_next_api(image_path: str):
    next_api_url = "https://autism-detection2-667306373563.europe-west1.run.app/predict/"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            with open(image_path, "rb") as f:
                files = {"file": ("image.jpg", f, "image/jpeg")}
                response = await client.post(next_api_url, files=files)
                response.raise_for_status()
                
                autism_response = response.json()
                print(f"🧠 Autism API Response: {autism_response}")
                
                # ✅ CRITICAL FIX: Handle autism annotated image
                if 'annotated_image_path' in autism_response:
                    original_path = autism_response['annotated_image_path']
                    print(f"🖼️ Original autism image path: {original_path}")
                    
                    # Try to download and save the image locally
                    try:
                        image_url = f"https://autism-detection2-667306373563.europe-west1.run.app{original_path}"
                        image_response = await client.get(image_url)
                        if image_response.status_code == 200:
                            local_path = save_autism_image_locally(image_response.content, original_path)
                            if local_path:
                                autism_response['annotated_image_path'] = local_path
                                print(f"✅ Saved autism image locally: {local_path}")
                    except Exception as e:
                        print(f"⚠️ Could not download autism image: {e}")
                
                return {"status": "success", "data": autism_response}
                
    except httpx.RequestError as e:
        return {"status": "forward_failed", "error": f"Request to next API failed: {e}"}
    except Exception as e:
        return {"status": "forward_failed", "error": str(e)}

# ✅ FIXED: Correct response structure for frontend
@app.post("/process")
async def process_image_gateway(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    temp_input_path = os.path.join(TEMP_INPUT_DIR, f"{uuid.uuid4().hex}_{file.filename}")
    try:
        with open(temp_input_path, "wb") as f:
            f.write(await file.read())

        age_check_result = process_image_for_age_check(temp_input_path)

        if not age_check_result["has_faces"]:
            return JSONResponse(status_code=200, content={
                "status": "no_faces_detected",
                "message": "No faces were detected in the image.",
                "age_check_summary": age_check_result
            })

        if age_check_result["contains_kids"]:
            print(f"🎯 KID(S) DETECTED! Forwarding to autism API...")
            forward_result = await forward_to_next_api(temp_input_path)
            
            if forward_result["status"] == "success":
                autism_data = forward_result["data"]
                
                # ✅ CRITICAL FIX: Return the correct structure expected by frontend
                return JSONResponse(status_code=200, content={
                    "status": "child_autism_screened",  # Matches frontend expectation
                    "message": "Child detected. Autism analysis performed.",
                    "autism_prediction_data": autism_data,  # Contains results and annotated_image_path
                    "age_check_summary": age_check_result
                })
            else:
                return JSONResponse(status_code=500, content={
                    "status": "autism_api_failed",
                    "message": "Failed to process autism detection",
                    "error": forward_result.get("error"),
                    "age_check_summary": age_check_result
                })
        else:
            print(f"❌ ADULTS ONLY! Rejecting image...")
            return JSONResponse(status_code=200, content={  # Changed to 200 for consistency
                "status": "adult_invalid",  # Matches frontend expectation
                "message": "Adult detected - Invalid for analysis",
                "age_check_summary": age_check_result
            })
    finally:
        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)

@app.get("/")
def root():
    return {"message": "Welcome to the Age-Based Image Gateway"}

# ✅ Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Server is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)