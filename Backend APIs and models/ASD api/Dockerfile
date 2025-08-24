FROM python:3.10-slim

WORKDIR /app

# Install OS-level dependencies (only once)
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    ffmpeg \
 && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first to cache them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only app code after dependencies are installed
COPY . .

EXPOSE 10000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
