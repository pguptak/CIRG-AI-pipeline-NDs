import os
import cv2
import numpy as np
import uvicorn
import httpx
import json
import uuid
import asyncio
import traceback
from typing import Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


# ✅ Initialize app
app = FastAPI(
    title="Age-Based Image Gateway",
    description="Processes images with kids (≤18) and rejects images with only adults (>18).",
    version="1.3.0"
)


# ✅ Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your specific frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ CRITICAL FIX: Directory setup with proper paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_INPUT_DIR = os.path.join(BASE_DIR, 'temp_age_inputs')
TEMP_OUTPUT_DIR = os.path.join(BASE_DIR, 'temp_age_outputs')
AUTISM_ANNOTATED_DIR = os.path.join(BASE_DIR, 'annotated')  # For autism images

# Ensure all directories exist
os.makedirs(TEMP_INPUT_DIR, exist_ok=True)
os.makedirs(TEMP_OUTPUT_DIR, exist_ok=True)
os.makedirs(AUTISM_ANNOTATED_DIR, exist_ok=True)

print(f"✅ Directories created:")
print(f"   - Age outputs: {TEMP_OUTPUT_DIR}")
print(f"   - Autism annotated: {AUTISM_ANNOTATED_DIR}")


# ✅ CRITICAL: Static file mounts - must match directory structure
app.mount("/annotated_age", StaticFiles(directory=TEMP_OUTPUT_DIR), name="annotated_age")
app.mount("/annotated", StaticFiles(directory=AUTISM_ANNOTATED_DIR), name="autism_annotated")

print(f"✅ Static file mounts configured:")
print(f"   - /annotated_age -> {TEMP_OUTPUT_DIR}")
print(f"   - /annotated -> {AUTISM_ANNOTATED_DIR}")


# --- Model Configuration ---
faceProto = "opencv_face_detector.pbtxt"
faceModel = "opencv_face_detector_uint8.pb"
ageProto = "age_deploy.prototxt"
ageModel = "age_net.caffemodel"

MODEL_MEAN_VALUES = (78.4263377603, 87.7689143744, 114.895847746)
ageList = ['(0-2)', '(4-6)', '(8-12)', '(15-20)', '(25-32)', '(38-43)', '(48-53)', '(60-100)']

# --- Load Models ---
try:
    faceNet = cv2.dnn.readNet(faceModel, faceProto)
    ageNet = cv2.dnn.readNet(ageModel, ageProto)
    print("✅ OpenCV models loaded successfully")
except Exception as e:
    print(f"❌ Model loading error: {e}")


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
    annotated_filename = f"age_annotated_{uuid.uuid4().hex}.jpg"
    annotated_path = os.path.join(TEMP_OUTPUT_DIR, annotated_filename)
    cv2.imwrite(annotated_path, annotated_frame)
    
    if not annotations:
        return {
            "has_faces": False, 
            "contains_kids": False, 
            "annotations": [],
            "kids_count": 0,
            "adults_count": 0,
            "annotated_image_url": f"/annotated_age/{annotated_filename}"
        }

    kids_count = sum(1 for ann in annotations if is_kid(ann["age"]))
    
    return {
        "has_faces": True,
        "contains_kids": kids_count > 0,
        "annotations": annotations,
        "kids_count": kids_count,
        "adults_count": len(annotations) - kids_count,
        "annotated_image_url": f"/annotated_age/{annotated_filename}"
    }


# ✅ CRITICAL FIX: Enhanced autism image saving with comprehensive logging
def save_autism_image_locally(image_data, filename: str = None) -> str:
    """Save autism annotated image to local directory and return the path"""
    try:
        # Generate unique filename
        local_filename = f"autism_annotated_{uuid.uuid4().hex}.jpg"
        local_path = os.path.join(AUTISM_ANNOTATED_DIR, local_filename)
        
        # Ensure directory exists
        os.makedirs(AUTISM_ANNOTATED_DIR, exist_ok=True)
        
        if isinstance(image_data, bytes) and len(image_data) > 0:
            # Save the file
            with open(local_path, 'wb') as f:
                f.write(image_data)
            
            # Verify file was saved correctly
            if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
                print(f"✅ Successfully saved autism image:")
                print(f"   📁 Directory: {AUTISM_ANNOTATED_DIR}")
                print(f"   📄 Filename: {local_filename}")
                print(f"   📊 Size: {os.path.getsize(local_path)} bytes")
                print(f"   🔗 URL path: /annotated/{local_filename}")
                return f"/annotated/{local_filename}"
            else:
                print(f"❌ File save verification failed: {local_path}")
                return None
        else:
            print(f"❌ Invalid image data - type: {type(image_data)}, size: {len(image_data) if hasattr(image_data, '__len__') else 'N/A'}")
            return None
            
    except Exception as e:
        print(f"❌ Critical error saving autism image:")
        print(f"   Error: {str(e)}")
        print(f"   Type: {type(e).__name__}")
        traceback.print_exc()
        return None


# ✅ ENHANCED: Comprehensive autism API forwarding with robust image handling
async def forward_to_next_api(image_path: str):
    """Forward image to autism API and download the annotated result"""
    autism_api_url = "https://autism-detection2-667306373563.europe-west1.run.app/predict/"
    autism_image_base_url = "https://autism-detection2-667306373563.europe-west1.run.app"
    
    for attempt in range(3):
        timeout_duration = 60.0 + (attempt * 30.0)  # 60s, 90s, 120s
        print(f"🎯 Autism API attempt {attempt + 1}/3 with {timeout_duration}s timeout")
        
        try:
            timeout = httpx.Timeout(timeout_duration, connect=30.0, read=timeout_duration)
            
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Send image to autism API
                with open(image_path, "rb") as f:
                    files = {"file": ("image.jpg", f, "image/jpeg")}
                    response = await client.post(autism_api_url, files=files)
                    
                if response.status_code == 200:
                    autism_response = response.json()
                    print(f"✅ Autism API success (attempt {attempt + 1})")
                    print(f"   Response keys: {list(autism_response.keys())}")
                    
                    # CRITICAL: Download autism annotated image
                    if 'annotated_image_path' in autism_response:
                        original_path = autism_response['annotated_image_path']
                        print(f"🔍 Found autism image path: {original_path}")
                        
                        try:
                            # Construct download URL
                            if original_path.startswith('/'):
                                image_url = f"{autism_image_base_url}{original_path}"
                            else:
                                image_url = f"{autism_image_base_url}/{original_path}"
                            
                            print(f"⬇️ Downloading autism image from: {image_url}")
                            
                            # Download the image
                            image_response = await client.get(image_url, timeout=30.0)
                            
                            if image_response.status_code == 200:
                                image_content = image_response.content
                                print(f"✅ Downloaded autism image: {len(image_content)} bytes")
                                
                                # Save locally
                                local_path = save_autism_image_locally(image_content, original_path)
                                
                                if local_path:
                                    # Update response with local path
                                    autism_response['annotated_image_path'] = local_path
                                    print(f"🔗 Updated autism image path to: {local_path}")
                                else:
                                    print("❌ Failed to save autism image locally")
                                    
                            else:
                                print(f"❌ Failed to download autism image: HTTP {image_response.status_code}")
                                print(f"   Response: {image_response.text[:200]}...")
                                
                        except Exception as img_error:
                            print(f"❌ Error downloading autism image:")
                            print(f"   Error: {str(img_error)}")
                            traceback.print_exc()
                    else:
                        print("⚠️ No 'annotated_image_path' in autism response")
                    
                    return {"status": "success", "data": autism_response}
                    
                elif response.status_code == 500:
                    print(f"❌ Autism API 500 error on attempt {attempt + 1}")
                    if attempt < 2:
                        await asyncio.sleep(15 * (attempt + 1))
                        continue
                    return {"status": "forward_failed", "error": f"Autism API 500 error after {attempt + 1} attempts"}
                    
                else:
                    print(f"❌ Autism API error: HTTP {response.status_code}")
                    print(f"   Response: {response.text[:200]}...")
                    return {"status": "forward_failed", "error": f"Autism API returned status {response.status_code}"}
                    
        except httpx.TimeoutException:
            print(f"⏰ Autism API timeout on attempt {attempt + 1} after {timeout_duration}s")
            if attempt < 2:
                await asyncio.sleep(20)
                continue
            return {"status": "forward_failed", "error": f"Autism API timed out after {attempt + 1} attempts"}
            
        except Exception as e:
            print(f"❌ Autism API error on attempt {attempt + 1}:")
            print(f"   Error: {str(e)}")
            print(f"   Type: {type(e).__name__}")
            if attempt < 2:
                await asyncio.sleep(10)
                continue
            return {"status": "forward_failed", "error": f"Unexpected error: {str(e)}"}
    
    return {"status": "forward_failed", "error": "All autism API attempts failed"}


# ✅ MAIN ENDPOINT: Enhanced to return consistent response structure
@app.post("/process")
async def process_image_gateway(file: UploadFile = File(...)):
    """Main processing endpoint called by Face Detection Gateway"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    temp_input_path = os.path.join(TEMP_INPUT_DIR, f"{uuid.uuid4().hex}_{file.filename}")
    
    try:
        print(f"📤 Processing image: {file.filename}")
        
        # Save uploaded file
        with open(temp_input_path, "wb") as f:
            content = await file.read()
            f.write(content)
        print(f"💾 Saved temp file: {temp_input_path} ({len(content)} bytes)")

        # Process for age detection
        age_check_result = process_image_for_age_check(temp_input_path)
        print(f"📊 Age analysis complete:")
        print(f"   Has faces: {age_check_result['has_faces']}")
        print(f"   Kids: {age_check_result['kids_count']}, Adults: {age_check_result['adults_count']}")

        # Base response structure for frontend compatibility
        base_response = {
            "valid": True,
            "status": "face_validated_and_processed",
            "message": "Human face validated and processed by age API.",
            "face_count": 1,
            "annotated_image_url": age_check_result["annotated_image_url"]
        }

        # Case 1: No faces detected
        if not age_check_result["has_faces"]:
            base_response.update({
                "face_count": 0,
                "age_analysis_data": {
                    "status": "no_faces_detected",
                    "message": "No faces detected",
                    "age_check_summary": age_check_result
                }
            })
            print("🔍 Result: No faces detected")
            return JSONResponse(status_code=200, content=base_response)

        # Case 2: Kids detected - forward to autism API
        if age_check_result["contains_kids"]:
            print(f"🎯 CHILD DETECTED - forwarding to autism API")
            
            forward_result = await forward_to_next_api(temp_input_path)
            
            if forward_result["status"] == "success":
                autism_data = forward_result["data"]
                base_response["age_analysis_data"] = {
                    "status": "child_autism_screened",
                    "message": "Child detected. Autism analysis performed.",
                    "autism_prediction_data": autism_data,
                    "age_check_summary": age_check_result
                }
                print("✅ Complete pipeline success: Child + Autism analysis")
                return JSONResponse(status_code=200, content=base_response)
            else:
                print(f"❌ Autism API failed: {forward_result.get('error')}")
                return JSONResponse(status_code=500, content={
                    "valid": False,
                    "status": "autism_api_failed",
                    "message": "Autism detection service is currently unavailable.",
                    "error": forward_result.get("error"),
                    "age_check_summary": age_check_result
                })
        
        # Case 3: Only adults detected
        else:
            base_response["age_analysis_data"] = {
                "status": "adult_invalid",
                "message": "Adult detected - Invalid for analysis",
                "age_check_summary": age_check_result
            }
            print("🔞 Result: Adults only - autism analysis blocked")
            return JSONResponse(status_code=200, content=base_response)
            
    except Exception as e:
        print(f"❌ Critical error in main endpoint:")
        print(f"   Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
        
    finally:
        # Cleanup temp file
        if os.path.exists(temp_input_path):
            try:
                os.remove(temp_input_path)
                print(f"🧹 Cleaned up temp file: {temp_input_path}")
            except Exception as e:
                print(f"⚠️ Could not remove temp file: {e}")


# ✅ DEBUG ENDPOINTS for troubleshooting
@app.get("/debug/files")
def debug_files():
    """Debug endpoint to check file system state"""
    try:
        autism_files = os.listdir(AUTISM_ANNOTATED_DIR) if os.path.exists(AUTISM_ANNOTATED_DIR) else []
        age_files = os.listdir(TEMP_OUTPUT_DIR) if os.path.exists(TEMP_OUTPUT_DIR) else []
        
        return {
            "directories": {
                "autism_dir": {
                    "path": AUTISM_ANNOTATED_DIR,
                    "exists": os.path.exists(AUTISM_ANNOTATED_DIR),
                    "files_count": len(autism_files),
                    "recent_files": autism_files[-3:] if autism_files else []
                },
                "age_dir": {
                    "path": TEMP_OUTPUT_DIR,
                    "exists": os.path.exists(TEMP_OUTPUT_DIR),
                    "files_count": len(age_files),
                    "recent_files": age_files[-3:] if age_files else []
                }
            },
            "static_mounts": {
                "/annotated": "autism_annotated",
                "/annotated_age": "annotated_age"
            }
        }
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@app.get("/debug/test-image")
async def test_image_download():
    """Test downloading an image from autism service"""
    test_url = "https://autism-detection2-667306373563.europe-west1.run.app/health"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(test_url)
            return {
                "test_url": test_url,
                "status_code": response.status_code,
                "accessible": response.status_code == 200,
                "response_preview": response.text[:200] if response.text else None
            }
    except Exception as e:
        return {"error": str(e), "accessible": False}


# ✅ HEALTH AND INFO ENDPOINTS
@app.get("/")
def root():
    return {
        "message": "Welcome to the Age-Based Image Gateway",
        "version": "1.3.0",
        "status": "healthy",
        "endpoints": {
            "main": "/process",
            "health": "/health",
            "debug": "/debug/files"
        }
    }


@app.get("/health")
def health_check():
    """Detailed health check with directory status"""
    return {
        "status": "healthy",
        "message": "Age Gateway Server is running",
        "directories": {
            "autism_annotated": os.path.exists(AUTISM_ANNOTATED_DIR),
            "age_outputs": os.path.exists(TEMP_OUTPUT_DIR),
            "temp_inputs": os.path.exists(TEMP_INPUT_DIR)
        },
        "static_mounts": ["annotated", "annotated_age"]
    }


@app.get("/keepalive")
async def keep_alive():
    """Keep-alive endpoint to prevent cold starts"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            autism_response = await client.get("https://autism-detection-backend-667306373563.europe-west1.run.app/health")
            autism_status = "healthy" if autism_response.status_code == 200 else f"error_{autism_response.status_code}"
    except Exception as e:
        autism_status = f"error: {str(e)}"
    
    return {
        "age_gateway": "healthy",
        "autism_service": autism_status,
        "timestamp": str(uuid.uuid4()),
        "directories_ok": os.path.exists(AUTISM_ANNOTATED_DIR)
    }


if __name__ == "__main__":
    print("🚀 Starting Age-Based Image Gateway...")
    print(f"📁 Static directories configured:")
    print(f"   - Autism images: {AUTISM_ANNOTATED_DIR}")
    print(f"   - Age images: {TEMP_OUTPUT_DIR}")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
