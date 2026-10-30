# Use the official Python image
FROM python:3.10-slim

# Install system dependencies required for audio processing (ffmpeg)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all your models and code into the container
# (Make sure thunderbuddies_v4.json and wav2vec2_onnx_production/ are in the same folder!)
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Command to run the API using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]