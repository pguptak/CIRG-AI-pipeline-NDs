# 🧠 CIRG Autism Detection AI Pipeline

A comprehensive AI research and deployment system for detecting Autism Spectrum Disorder (ASD) traits from facial images using Vision Transformer models. This project features multiple APIs, a React web frontend, and a React Native Android mobile app deployed and hosted on Google Cloud.

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

CIRG-AI-pipeline-NDs/
├── Age api/ # Age prediction API source and model files
│ ├── Dockerfile
│ ├── age_net.caffemodel
│ ├── main.py
│ ├── temp_age_inputs/
│ ├── temp_age_outputs/
│ └── (other supporting files)
├── ASD api/ # Autism Detection API backend & models
│ ├── api.py
│ ├── Dockerfile
│ ├── model_checkpoint/
│ ├── requirements.txt
│ ├── temp_inputs/
│ ├── temp_outputs/
│ └── (modeling and utility scripts)
├── Frontend/ # React web frontend source and config files
│ ├── package.json
│ ├── public/
│ ├── src/
│ └── README.md
├── Human face api/ # Animal/Human filter API and related assets
│ ├── Dockerfile
│ ├── main.py
│ ├── shape_predictor_68_face_landmarks.dat
│ ├── yolov8n.pt
│ ├── temp_face_inputs/
│ └── temp_face_outputs/
├── MobileApp/ # React Native Android app with APK included
│ ├── android/
│ ├── App.tsx
│ ├── index.js
│ ├── package.json
│ ├── tsconfig.json
│ ├── babel.config.js
│ ├── metro.config.js
│ ├── tests/
│ └── apk/ # Pre-built APK files (debug and release)
├── docs/ # Documentation, diagrams, reports, screenshots
├── .gitignore
├── .gitattributes # Git LFS configuration for large files
├── README.md

---

## 📚 Project Overview

This project is an end-to-end system for ASD detection from facial images, leveraging state-of-the-art Vision Transformer (ViT) models analyzing facial regions (eyes, nose, lips) independently and applying fuzzy logic for the final decision.

- Multiple backend APIs deployed on Google Cloud Run provide scalable and secure model inference.
- React web app facilitates image upload and live webcam interaction with annotated results.
- Cross-platform React Native Android app allows mobile users to perform inference with the hosted backend.
- Dockerized environment ensures reproducible builds and deployment.
- Large pretrained models and assets are managed efficiently via Git LFS.

---

## 📱 Mobile App Details

The mobile app, found in the `MobileApp/` directory, is a React Native Android application that provides:

- Image capture and gallery upload capabilities.
- Integration with backend AI APIs for inference.
- Visualization of detailed region-wise predictions and annotated output images.
- Pre-built APK files located in the `apk/` folder for easy installation on Android devices without building from source.

### Mobile App Key Folders & Files

- `android/` — Native Android project files.
- `App.tsx` — Main React Native component (TypeScript).
- `index.js` — Entry point registering the main app.
- `package.json` — Project dependencies and scripts.
- `tsconfig.json` — TypeScript configuration.
- `babel.config.js` & `metro.config.js` — Transpiler and bundler configs.
- `tests/` — Unit and integration tests.
- `apk/` — Debug and release APKs for Android devices.

### Running Mobile App Locally

```bash
cd MobileApp
npm install
npx react-native run-android
```

Alternatively, use the pre-built APK from the `apk/` folder for device installation.

---

## 🏗️ Running Backend & Frontend Locally

### Backend API

```bash
cd backend-api
docker build -t autism-backend .
docker run -p 8000:8000 autism-backend
```

### Frontend Web App

```bash
cd Frontend
npm install
npm start
```

---

## 🔎 Sample Backend API Usage

Make a POST request with an image:

```bash
curl -X POST -F "file=@face.jpg" https://autism-detection-backend-667306373563.europe-west1.run.app/predict/
```

Example response:

```json
{
  "results": [
    {"region": "eyes", "label": "autistic", "confidence": 91.2},
    {"region": "lips", "label": "non-autistic", "confidence": 88.6},
    {"final_decision": "autistic high"}
  ],
  "annotated_image_path": "/static/output/image123.jpg"
}
```

---

## 🛡️ Security Overview

- End-to-end HTTPS on all service endpoints.
- Strict input validation and MIME type filtering.
- Stateless backend, no persistent user data storage.
- Container isolation with Google Cloud Run.
- Single authenticated POST API endpoint.

Full security mitigations detailed in the [Attack Vector Mitigation](./docs/Attack-Vector-Mitigitation.pdf) report.

---

## 🖼️ Screenshots & Visual Assets

*(Placeholders for future additions of screenshots from web app, mobile interface, annotated results, and cloud monitoring dashboards.)*

---

## 📑 Documentation & Reports

Access detailed reports and design documents in the `docs/` folder:

- [Integration Report](./docs/Integration_Report.pdf)  
- [Deployment Report](./docs/Deployment_Report.pdf)  
- [Weekly Progress Report](./docs/Autism_AI_Pipeline_Weekly_Report.pdf)  
- [Dataflow & Outputs](./docs/Dataflow-and-Outputs.pdf)

---

## ✨ Contributing

Contributions welcome! Open issues or submit pull requests for bug fixes, features, or improvements.

---

## 👤 Team & Contact

Lead: Prashant K Gupta  
Developer: Rudra Verma  
Contact: rudraverma2612@gmail.com  
GitHub: [pguptak](https://github.com/pguptak)

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*README will be updated regularly with new screenshots, APK versions, and feature improvements.*
