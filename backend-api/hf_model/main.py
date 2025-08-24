from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse
import shutil
import os
import cv2
import torch
import torch.nn.functional as F
import torchvision.transforms as transforms
from modeling import VisionTransformer, CONFIGS
from cww_for_vit import process_labels_confidence
from PIL import Image
import dlib
from uuid import uuid4
import traceback
import uuid
import json
import pandas as pd
import zipfile
from fastapi.responses import StreamingResponse
from io import BytesIO

# Setup FastAPI app
app = FastAPI()

# Determine base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'model_checkpoint')
TEMP_INPUT_DIR = os.path.join(BASE_DIR, 'temp_inputs')
TEMP_OUTPUT_DIR = os.path.join(BASE_DIR, 'temp_outputs')
TEMP_LOG_FILE = os.path.join(BASE_DIR, 'prediction_log.csv')

# Ensure temp directories exist
os.makedirs(TEMP_INPUT_DIR, exist_ok=True)
os.makedirs(TEMP_OUTPUT_DIR, exist_ok=True)

# Device
DEVICE = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
CONFIG = CONFIGS['ViT-B_16']

# Load models
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

# Dlib setup
predictor = dlib.shape_predictor(os.path.join(MODEL_DIR, 'shape_predictor_68_face_landmarks.dat'))
detector = dlib.get_frontal_face_detector()

# Transforms
transform_train = transforms.Compose([
    transforms.RandomResizedCrop((256, 256), scale=(0.05, 1.0)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5,0.5,0.5], std=[0.5,0.5,0.5]),
])
transform_test = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5,0.5,0.5], std=[0.5,0.5,0.5]),
])

# Single image inference logic
def run_inference(input_path):
    image = cv2.imread(input_path)
    if image is None:
        raise ValueError("Cannot read image")
    image_save = image.copy()
    faces = detector(image)
    results = []

    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected in the image")

    for face in faces:
        landmarks = predictor(image, face)
        xf1, yf1, xf2, yf2 = face.left(), face.top(), face.right(), face.bottom()
        cv2.rectangle(image_save, (xf1,yf1), (xf2,yf2), (255,0,0), 2)

        regions = {
            'eyes': [17,19,24,26,41,47],
            'nose': [31,33,35,39,42],
            'lips': [48,50,52,54,57]
        }

        for region, idxs in regions.items():
            x_min = min(landmarks.part(i).x for i in idxs)
            y_min = min(landmarks.part(i).y for i in idxs)
            x_max = max(landmarks.part(i).x for i in idxs)
            y_max = max(landmarks.part(i).y for i in idxs)
            crop = image[y_min:y_max, x_min:x_max]
            color = (0,255,0) if region=='eyes' else (0,255,255) if region=='nose' else (255,255,0)
            cv2.rectangle(image_save, (x_min,y_min), (x_max,y_max), color, 2)

            pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
            tensor = transform_test(pil).unsqueeze(0).to(DEVICE)
            model = {'eyes': model_eyes, 'nose': model_nose, 'lips': model_lips}[region]
            logits = model(tensor)[0]
            probs = F.softmax(logits, dim=-1).squeeze()

            label = 'autistic' if probs[0].item() > 0.5 else 'non-autistic'
            conf = probs[0].item() if label=='autistic' else probs[1].item()
            pct = round(conf*100,2)
            cv2.putText(image_save, f"{region}: {label} {pct}%", (x_min, y_min-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            results.append({'region': region, 'label': label, 'confidence': pct})

        labels = [r['label'] for r in results]
        confs = [torch.tensor(r['confidence']/100) for r in results]
        final_dec = process_labels_confidence(labels, confs)
        cv2.putText(image_save, final_dec, (xf1, yf1-40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,255), 2)
        results.append({'final_decision': final_dec})

    out_file = f"annotated_{uuid4().hex}.jpg"
    out_path = os.path.join(TEMP_OUTPUT_DIR, out_file)
    cv2.imwrite(out_path, image_save)

    # Append log
    df = pd.DataFrame([r for r in results if 'region' in r])
    df['final_decision'] = final_dec
    df.to_csv(TEMP_LOG_FILE, mode='a', header=not os.path.exists(TEMP_LOG_FILE), index=False)

    return results, out_path

# API endpoint
@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    temp_path = f"temp_{uuid.uuid4()}.jpg"
    with open(temp_path, "wb") as f:
        f.write(contents)

    try:
        results, out_path = run_inference(temp_path)
    except Exception as e:
        os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

    # Create a zip
        os.remove(temp_path)

    return JSONResponse({
        "status": "success",
        "results": results,
        "annotated_image_path": f"/annotated/{os.path.basename(out_path)}"
    })

@app.get('/healthz')
def health():
    return JSONResponse({'status':'ok'})
