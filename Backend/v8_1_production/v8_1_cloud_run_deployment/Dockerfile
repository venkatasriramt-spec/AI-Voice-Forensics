# Use the official PyTorch image with CUDA 12.1 pre-installed
FROM pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime

# Set the working directory inside the container
WORKDIR /app

# Install system-level dependencies required by librosa, soundfile, and whisper
RUN apt-get update && apt-get install -y ffmpeg libsndfile1 git && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install Python dependencies (Pin setuptools to avoid pkg_resources error)
RUN pip install --no-cache-dir --upgrade pip "setuptools<70.0.0" wheel

# INSTALL WITH NO-BUILD-ISOLATION TO FORCE WHISPER TO USE OUR DOWNGRADED SETUPTOOLS
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

# Pre-Bake HuggingFace (WavLM) & Whisper Models directly into the /app directory
ENV HF_HOME=/app/.cache/huggingface
RUN python3 -c "from transformers import Wav2Vec2FeatureExtractor, WavLMModel; Wav2Vec2FeatureExtractor.from_pretrained('microsoft/wavlm-base-plus'); WavLMModel.from_pretrained('microsoft/wavlm-base-plus')"

# Pre-Bake Whisper
RUN python3 -c "import whisper; whisper.load_model('tiny', download_root='/app/.cache/whisper')"

# Copy your actual application files into the container
COPY . .

# Expose the port Cloud Run expects (8080)
EXPOSE 8080

# Command to run the FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
