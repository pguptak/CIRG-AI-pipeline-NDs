
# 🧠 Autism Detection AI Pipeline – Deployment Repository

This repository hosts the **complete deployment setup** for our **Autism Detection System**, which uses facial features to analyze and classify potential autism spectrum traits. It includes:

✅ A fully working **FastAPI backend**  
✅ A modern **React frontend**  
✅ Docker-based deployment setup  
✅ Git LFS model file tracking  
✅ Web + Mobile support

> 🔗 **Live Web App:** [https://asd-dusky-ten.vercel.app](https://asd-dusky-ten.vercel.app)  
> 📦 **GitHub Repo:** [CIRG-AI-pipeline-NDs](https://github.com/pguptak/CIRG-AI-pipeline-NDs)

---

## 🧩 System Overview

The system processes facial images and classifies 3 key regions using dedicated models:

- 👁️ Eyes  
- 👃 Nose  
- 👄 Lips

Each region is passed through its own **Vision Transformer (ViT)** model. The outputs are then post-processed using a **fuzzy logic algorithm**, resulting in final decisions such as:

```
autistic high | non-autistic moderate | autistic low
```

---

## 📁 Project Structure

```
CIRG-AI-pipeline-NDs/
├── backend-api/               # FastAPI backend with model & inference
│   ├── api.py
│   ├── main.py
│   ├── model_checkpoint/      # .bin model weights + dlib predictor
│   ├── model_files/           # ViT configurations
│   ├── Dockerfile             # Containerization setup
│   └── ...
│
├── frontend-webapp/           # React frontend (Material UI based)
│   ├── src/
│   ├── public/
│   └── ...
```

---

## 🚀 Backend Deployment Instructions

### 📦 1. Build Docker Image (Locally or for Render/GCP)

```bash
cd backend-api
docker build -t autism-backend .
docker run -p 8000:8000 autism-backend
```

Or with Uvicorn directly:

```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```

### ☁️ 2. Deploy on Google Cloud Run (or Render)

```bash
gcloud run deploy autism-api   --source .   --region europe-west1   --allow-unauthenticated
```

Once deployed, note the public backend URL (e.g., `https://autism-api-abcdefg-ew.a.run.app`)

---

## 🌐 Frontend Web App Setup

### 🛠️ 1. Install Frontend Dependencies

```bash
cd frontend-webapp
npm install
```

### 🔗 2. Connect Frontend to Backend

In `frontend-webapp/src/config.js`, set:

```js
const config = {
  API_BASE_URL: 'https://your-backend-url.onrender.com',
};
```

Or, create a `.env`:

```env
REACT_APP_API_URL=https://autism-api-ew.a.run.app
```

### ▶️ 3. Start Frontend Locally

```bash
npm start
```

---

## 🧪 Live Demo

**🔗 Web App Live at:**  
👉 [https://asd-dusky-ten.vercel.app](https://asd-dusky-ten.vercel.app)

Features:

- Drag & drop or webcam upload
- Real-time inference via API
- Annotated output with bounding boxes
- Region-wise confidence levels
- Final decision via fuzzy logic

---

## 📦 Backend API Endpoints

| Method | Endpoint           | Description                                  |
|--------|--------------------|----------------------------------------------|
| POST   | `/predict/`        | Accepts image, returns annotated output + results |
| GET    | `/annotated/{img}` | Serves processed images with bounding boxes  |
| GET    | `/healthz`         | Health check route                           |

---

## 📂 Model Checkpoints

Stored in `backend-api/model_checkpoint/` and managed using **Git LFS**:

- `eyes_checkpoint.bin` (ViT)
- `nose_checkpoint.bin` (ViT)
- `lips_checkpoint.bin` (ViT)
- `shape_predictor_68_face_landmarks.dat` (Dlib)

Add Git LFS support:

```bash
git lfs install
git lfs track "*.bin"
git lfs track "*.dat"
```

---

## 🧠 Model Design & Pipeline

- **Facial Landmark Detection** via Dlib (68 points)
- **Region-wise Classification** using ViT models
- **Postprocessing** with fuzzy logic decision-making
- **Annotated Outputs** with bounding boxes and labels
- **Logs** saved as CSV and images

---

## 🖼️ Sample Output

📍 Annotated Image Example  
📍 Region Predictions  
📍 Final Diagnosis: `autistic high` or `non-autistic low`


---

## 📊 Logs & Monitoring

- Predictions logged in: `backend-api/prediction_log.csv`
- Annotated outputs stored in: `backend-api/temp_outputs/`
- Cloud logs available on Render or Google Cloud Console

---



## 🧪 Testing the API

```bash
curl -X POST -F "file=@test.jpg" https://your-backend-url/predict/
```

---

