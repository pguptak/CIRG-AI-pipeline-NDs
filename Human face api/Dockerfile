FROM python:3.9-slim

WORKDIR /app

# Install system dependencies required by OpenCV and dlib
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libgtk2.0-dev \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Clean up build dependencies to reduce image size
RUN apt-get remove -y build-essential cmake && \
    apt-get autoremove -y && rm -rf /root/.cache

COPY main.py .
COPY yolov8n.pt .
COPY shape_predictor_68_face_landmarks.dat .

EXPOSE 8000

CMD ["python", "main.py"]
