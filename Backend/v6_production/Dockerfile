# Use the official PyTorch image with CUDA 12.1 pre-installed
FROM pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime

# Set the working directory inside the container
WORKDIR /app

# Install system-level dependencies required by librosa, soundfile, and whisper
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# FIX 1: Pin setuptools to a version before 70.0.0 (which removed pkg_resources)
RUN pip install --no-cache-dir --upgrade pip "setuptools<70.0.0" wheel

# FIX 2: Use --no-build-isolation so Whisper is forced to use our downgraded setuptools
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

# Pre-Bake HuggingFace & Whisper Models directly into the /app directory
ENV HF_HOME=/app/.cache/huggingface
RUN python3 -c "from transformers import Wav2Vec2Processor, Wav2Vec2Model; Wav2Vec2Processor.from_pretrained('facebook/wav2vec2-base'); Wav2Vec2Model.from_pretrained('facebook/wav2vec2-base')"

# Force Whisper to download to /app/.cache/whisper
RUN python3 -c "import whisper; whisper.load_model('base', download_root='/app/.cache/whisper')"

# Copy your actual application files into the container
COPY . .

# Expose the port Cloud Run expects (8080)
EXPOSE 8080

# Command to run the FastAPI server, binding to the dynamic PORT environment variable
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]