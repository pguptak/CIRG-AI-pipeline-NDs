# Dockerfile

# 1. Use an official Python runtime as a parent image
FROM python:3.9-slim

# 2. Set the working directory in the container
WORKDIR /app

# 3. Install system dependencies required by OpenCV
# Install system dependencies required by OpenCV
RUN apt-get update && apt-get install -y \
    libgtk2.0-dev \
    libsm6 \
    libxext6 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*


# 4. Copy the dependencies file and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy your application code and model files into the container
COPY main.py .
COPY *.pb .
COPY *.pbtxt .
COPY *.prototxt .
COPY *.caffemodel .

# 6. Expose the port the app runs on
EXPOSE 8000

# 7. Define the command to run your app using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
