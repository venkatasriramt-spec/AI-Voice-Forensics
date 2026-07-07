# Keep the same runtime family first, since your backend was built around Torch + torchaudio + Whisper + WavLM
FROM pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime

WORKDIR /app

# System dependencies needed by librosa / soundfile / whisper
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt .

# Safer Python packaging setup
RUN pip install --no-cache-dir --upgrade pip "setuptools<70.0.0" wheel

# Install Python dependencies
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

# Cache locations for HF/transformers/whisper downloads
ENV HF_HOME=/app/.cache/huggingface
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
ENV XDG_CACHE_HOME=/app/.cache

# Pre-download WavLM assets during image build
RUN python3 -c "from transformers import Wav2Vec2FeatureExtractor, WavLMModel; Wav2Vec2FeatureExtractor.from_pretrained('microsoft/wavlm-base-plus'); WavLMModel.from_pretrained('microsoft/wavlm-base-plus')"

# Pre-download Whisper tiny model during image build
RUN python3 -c "import whisper; whisper.load_model('tiny', download_root='/app/.cache/whisper')"

# Copy app files
COPY . .

# Hugging Face Docker Spaces expect the app on port 7860
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]