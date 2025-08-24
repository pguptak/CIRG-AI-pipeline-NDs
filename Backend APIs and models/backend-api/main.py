<<<<<<< HEAD
from fastapi import FastAPI, UploadFile, File, HTTPException
=======
import os
import cv2
import numpy as np
import uvicorn
import httpx
import json
import uuid
from typing import Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException
>>>>>>> master
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

<<<<<<< HEAD
import os
import cv2
import torch
import torch.nn.functional as F
import torchvision.transforms as transforms
from PIL import Image
import dlib
import uuid
import pandas as pd

from modeling import VisionTransformer, CONFIGS
from cww_for_vit import process_labels_confidence

# ✅ Initialize app
app = FastAPI()
=======
# ✅ Initialize app
app = FastAPI(
    title="Age-Based Image Gateway",
    description="Processes images with kids (≤18) and rejects images with only adults (>18).",
    version="1.1.0"
)
>>>>>>> master

# ✅ Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
<<<<<<< HEAD
    allow_origins=["*"],  # Replace with specific frontend URL in production
=======
    allow_origins=["*"],  # Replace with your specific frontend URL in production
>>>>>>> master
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Directory setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
<<<<<<< HEAD
MODEL_DIR = os.path.join(BASE_DIR, 'model_checkpoint')
TEMP_INPUT_DIR = os.path.join(BASE_DIR, 'temp_inputs')
TEMP_OUTPUT_DIR = os.path.join(BASE_DIR, 'temp_outputs')
TEMP_LOG_FILE = os.path.join(BASE_DIR, 'prediction_log.csv')

os.makedirs(TEMP_INPUT_DIR, exist_ok=True)
os.makedirs(TEMP_OUTPUT_DIR, exist_ok=True)

# ✅ Load model
DEVICE = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
CONFIG = CONFIGS['ViT-B_16']

model_eyes = VisionTransformer(CONFIG, 256, zero_head=True, num_classes=2)
model_nose = VisionTransformer(CONFIG, 256, zero_head=True, num_classes=2)
model_lips = VisionTransformer(CONFIG, 256, zero_head=True, num_classes=2)

def load_model(model, filename):
    path = os.path.join(MODEL_DIR, filename)
    state = torch.load(path, map_location=DEVICE)
    model.load_state_dict(state)
    model.to(DEVICE)
    model.eval()

load_model(model_eyes, 'eyes_checkpoint.bin')
load_model(model_nose, 'nose_checkpoint.bin')
load_model(model_lips, 'lips_checkpoint.bin')

# ✅ Dlib setup
predictor = dlib.shape_predictor(os.path.join(MODEL_DIR, 'shape_predictor_68_face_landmarks.dat'))
detector = dlib.get_frontal_face_detector()

# ✅ Transforms
transform_test = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
])

# ✅ Core logic
def run_inference(input_path):
    image = cv2.imread(input_path)
    if image is None:
        raise ValueError("Cannot read image")

    image_save = image.copy()
    faces = detector(image)
    results = []

    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected")

    for face in faces:
        landmarks = predictor(image, face)
        xf1, yf1, xf2, yf2 = face.left(), face.top(), face.right(), face.bottom()
        cv2.rectangle(image_save, (xf1, yf1), (xf2, yf2), (255, 0, 0), 2)

        regions = {
            'eyes': [17, 19, 24, 26, 41, 47],
            'nose': [31, 33, 35, 39, 42],
            'lips': [48, 50, 52, 54, 57]
        }

        for region, idxs in regions.items():
            x_min = min(landmarks.part(i).x for i in idxs)
            y_min = min(landmarks.part(i).y for i in idxs)
            x_max = max(landmarks.part(i).x for i in idxs)
            y_max = max(landmarks.part(i).y for i in idxs)

            crop = image[y_min:y_max, x_min:x_max]
            color = (0, 255, 0) if region == 'eyes' else (0, 255, 255) if region == 'nose' else (255, 255, 0)
            cv2.rectangle(image_save, (x_min, y_min), (x_max, y_max), color, 2)

            pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
            tensor = transform_test(pil).unsqueeze(0).to(DEVICE)
            model = {'eyes': model_eyes, 'nose': model_nose, 'lips': model_lips}[region]
            logits = model(tensor)[0]
            probs = F.softmax(logits, dim=-1).squeeze()

            label = 'autistic' if probs[0].item() > 0.5 else 'non-autistic'
            conf = probs[0].item() if label == 'autistic' else probs[1].item()
            pct = round(conf * 100, 2)
            cv2.putText(image_save, f"{region}: {label} {pct}%", (x_min, y_min - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

            results.append({'region': region, 'label': label, 'confidence': pct})

        labels = [r['label'] for r in results]
        confs = [torch.tensor(r['confidence'] / 100) for r in results]
        final_dec = process_labels_confidence(labels, confs)
        cv2.putText(image_save, final_dec, (xf1, yf1 - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        results.append({'final_decision': final_dec})

    out_file = f"annotated_{uuid.uuid4().hex}.jpg"
    out_path = os.path.join(TEMP_OUTPUT_DIR, out_file)
    cv2.imwrite(out_path, image_save)

    df = pd.DataFrame([r for r in results if 'region' in r])
    df['final_decision'] = final_dec
    df.to_csv(TEMP_LOG_FILE, mode='a', header=not os.path.exists(TEMP_LOG_FILE), index=False)

    return results, out_path

# ✅ Prediction route
@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    temp_path = f"temp_{uuid.uuid4()}.jpg"
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    try:
        results, out_path = run_inference(temp_path)
    except Exception as e:
        os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

    os.remove(temp_path)
    return JSONResponse({
        "status": "success",
        "results": results,
        "annotated_image_path": f"/annotated/{os.path.basename(out_path)}"
    })

# ✅ Health check
@app.get("/healthz")
def health():
    return JSONResponse({"status": "ok"})

# ✅ Serve annotated images (critical for frontend to display result)
app.mount("/annotated", StaticFiles(directory=TEMP_OUTPUT_DIR), name="annotated")
=======
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
>>>>>>> master
