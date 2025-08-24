# 🧠 CIRG Autism Detection AI Pipeline

A comprehensive AI research and deployment system for detecting Autism Spectrum Disorder (ASD) traits from facial images using Vision Transformer (ViT) models. This project features multiple AI-powered APIs, a React web frontend, and a React Native Android mobile app — all deployed and hosted on Google Cloud.

---

## 🔗 Live API Endpoints

- **Age Prediction API**  
  [https://age-api-667306373563.europe-west1.run.app](https://age-api-667306373563.europe-west1.run.app)

- **Animal/Human Filter API**  
  [https://animal-human-filter-667306373563.europe-west2.run.app](https://animal-human-filter-667306373563.europe-west2.run.app)

- **Autism Detection Backend API**  
  [https://autism-detection-backend-667306373563.europe-west1.run.app](https://autism-detection-backend-667306373563.europe-west1.run.app)

---

## 🗂️ Repository Structure

```
CIRG-AI-pipeline-NDs/
├── Age-api/                  # Age prediction API source and model files
│   ├── Dockerfile
│   ├── age_net.caffemodel
│   ├── main.py
│   ├── temp_age_inputs/
│   ├── temp_age_outputs/
│   └── (supporting scripts)
│
├── ASD api/              # Autism Detection API backend & models
│   ├── api.py
│   ├── Dockerfile
│   ├── model_checkpoint/
│   ├── requirements.txt
│   ├── temp_inputs/
│   ├── temp_outputs/
│   └── (utility scripts & configs)
│
├── Human-face-api/           # Animal/Human filter API
│   ├── Dockerfile
│   ├── main.py
│   ├── shape_predictor_68_face_landmarks.dat
│   ├── yolov8n.pt
│   ├── temp_face_inputs/
│   └── temp_face_outputs/
│
├── Frontend/                 # React web frontend
│   ├── package.json
│   ├── public/
│   ├── src/
│   ├── README.md
│   └── (config & assets)
│
├── MobileApp/                # React Native Android app
│   ├── android/
│   ├── App.tsx
│   ├── index.js
│   ├── package.json
│   ├── tsconfig.json
│   ├── babel.config.js
│   ├── metro.config.js
│   ├── tests/
│   └── apk/                  # Pre-built APKs (debug/release)
│
├── ASD.apk                   #Directly Usable APK
│
├── docs/                     # Documentation, diagrams, reports, screenshots
├── .gitignore
├── .gitattributes            # Git LFS configuration
├── README.md
```

---

## 📚 Project Overview

This project is an end-to-end AI pipeline for Autism Spectrum Disorder (ASD) detection from facial images:

- **APIs**: Modular cloud APIs for filtering, age detection, and autism prediction.
- **Web App (React)**: Upload images, run inference via APIs, and view annotated outputs.
- **Mobile App (React Native Android)**: Capture or upload photos, send requests to APIs, and get results instantly. Pre-built APKs available.
- **Cloud-native Deployment**: All services are containerized and deployed on Google Cloud Run.
- **Modeling**: Vision Transformer models analyze **eyes, nose, and lips** independently. Final inference uses fuzzy-logic aggregation.

---
## Model Overview and Details
-This is to be added

---

## 🌐 Web App Features

The React web frontend (in `Frontend/`) provides a seamless interface for:

- Image uploads and webcam captures.  
- Automatic preprocessing (face validation & filtering).  
- Region-wise analysis (eyes, nose, lips).  
- Annotated outputs for visualization.  
- Integration with live backend APIs hosted on Google Cloud Run.

### Running Web App Locally

```bash
cd Frontend
npm install
npm start
```

The app will be served locally at `http://localhost:3000`.

---

## 📱 Mobile App Details

The mobile app (in `MobileApp/`) is a React Native Android project that enables:

- **Camera & Gallery Uploads**
- **Cloud inference with APIs**
- **Region-wise prediction visualizations**
- **APK-based quick installation**

### Running Mobile App Locally

```bash
cd MobileApp
npm install
npx react-native run-android
```

Or install directly using the pre-built APKs from `ASD.apk`.

---

## 🏗️ Running Backend APIs Locally

### Autism Detection API

```bash
cd ASD api
docker build -t autism-backend .
docker run -p 8000:8000 autism-backend
```

### Age Prediction API

```bash
cd Age-api
docker build -t age-api .
docker run -p 8001:8001 age-api
```

### Human/Animal Filter API

```bash
cd Human-face-api
docker build -t human-face-api .
docker run -p 8002:8002 human-face-api
```

---

## 🔎 Sample API Usage

### 1. Human/Animal Face Filter API

```bash
curl -X 'POST'   'https://animal-human-filter-667306373563.europe-west2.run.app/filter_face/'   -H 'accept: application/json'   -H 'Content-Type: multipart/form-data'   -F 'file=@123.jpg;type=image/jpeg'
```

Example response:

```json
{
  "valid": true,
  "status": "face_validated_and_processed",
  "message": "Human face validated and processed by age API.",
  "face_count": 1,
  "annotated_image_url": "/annotated_face/face_annotated.jpg",
  "age_analysis_data": {
    "status": "child_autism_screened",
    "autism_prediction_data": {
      "status": "success",
      "results": [
        {"region": "eyes", "label": "non-autistic", "confidence": 70.14},
        {"region": "nose", "label": "non-autistic", "confidence": 61.92},
        {"region": "lips", "label": "non-autistic", "confidence": 73.06},
        {"final_decision": "non-autistic High"}
      ],
      "annotated_image_path": "/annotated/autism_annotated.jpg"
    },
    "age_check_summary": {
      "has_faces": true,
      "contains_kids": true,
      "kids_count": 1,
      "adults_count": 0
    }
  }
}
```

---

### 2. Age Prediction API

```bash
curl -X 'POST'   'https://age-api-667306373563.europe-west1.run.app/process'   -H 'accept: application/json'   -H 'Content-Type: multipart/form-data'   -F 'file=@face.jpg;type=image/jpeg'
```

Example response:

```json
{
  "status": "child_autism_screened",
  "message": "Child detected. Autism analysis performed.",
  "autism_prediction_data": {
    "status": "success",
    "results": [
      {"region": "eyes", "label": "autistic", "confidence": 69.17},
      {"region": "nose", "label": "autistic", "confidence": 70.42},
      {"region": "lips", "label": "non-autistic", "confidence": 72.49},
      {"final_decision": "autistic Moderate"}
    ],
    "annotated_image_path": "/annotated/autism_annotated.jpg"
  }
}
```

---

### 3. Autism Detection Backend API

```bash
curl -X 'POST'   'https://autism-detection-backend-667306373563.europe-west1.run.app/predict/'   -H 'accept: application/json'   -H 'Content-Type: multipart/form-data'   -F 'file=@face.jpg;type=image/jpeg'
```

Example response:

```json
{
  "status": "success",
  "results": [
    {"region": "eyes", "label": "autistic", "confidence": 69.17},
    {"region": "nose", "label": "autistic", "confidence": 70.42},
    {"region": "lips", "label": "non-autistic", "confidence": 72.49},
    {"final_decision": "autistic Moderate"}
  ],
  "annotated_image_path": "/annotated/annotated_output.jpg"
}
```

---

## 🛡️ Security Overview

- End-to-end **HTTPS** for all endpoints.
- **Strict input validation** and MIME-type filtering.  
- Stateless backend: **no persistent user data storage**.  
- Container isolation with **Google Cloud Run**.  
- Single authenticated POST API endpoints.  


---

## 📑 Documentation & Reports

(Research Paper)

---

## 👥 Team & Contact

- **Lead**: Dr.Prashant K Gupta, Dr.Bireshwar Mazumder, Dr.Shallu Sharma
- **Intern**: Rudra Verma, Devansh
  
🔗 GitHub: [pguptak](https://github.com/pguptak)

---
## Screenshots
**WebApp**
https://github.com/pguptak/CIRG-AI-pipeline-NDs/blob/3841c67a0d3237dfa863a4a14c837a25eb1dc699/Docs/Images/1.png

**MobileApp**


**Cloud InterFace**

✨ *README will be updated regularly with new screenshots, APK versions, and feature improvements.*
