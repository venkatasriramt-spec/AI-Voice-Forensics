import io
import base64
from pathlib import Path
import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, WebSocket, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import matplotlib.pyplot as plt
import librosa

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[1]
ONNX_MODEL_PATH = BASE_DIR / "v3_crnn.onnx"
if not ONNX_MODEL_PATH.exists():
    legacy_path = BASE_DIR / "thunderbuddies_v3.onnx"
    if legacy_path.exists():
        ONNX_MODEL_PATH = legacy_path

app = FastAPI(title="Audio Forensics - Model V3 Inference Engine")

# Allow your frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Load ONNX globally so it's instantly available
sess_options = ort.SessionOptions()
sess_options.intra_op_num_threads = 32

if ONNX_MODEL_PATH.exists():
    onnx_session = ort.InferenceSession(str(ONNX_MODEL_PATH), sess_options)
    input_name = onnx_session.get_inputs()[0].name
    output_name = onnx_session.get_outputs()[0].name
else:
    onnx_session = None
    input_name = None
    output_name = None
    print(f"⚠️ Model weight not found at {ONNX_MODEL_PATH}. Download from Internet Archive before serving.")

def process_chunk(audio_array, sr=16000):
    if onnx_session is None:
        return {"error": f"Model weight {ONNX_MODEL_PATH.name} not found. Please place weights in Backend/v3_production/."}

    # 1. Generate Spectrogram Data
    mel_spec = librosa.feature.melspectrogram(y=audio_array, sr=sr, n_mels=128, fmax=8000)
    mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

    # 2. Draw the Image to Memory
    fig, ax = plt.subplots(figsize=(4, 2))
    ax.imshow(mel_spec_db, aspect='auto', origin='lower', cmap='viridis')
    plt.axis('off')

    img_buffer = io.BytesIO()
    plt.savefig(img_buffer, format='png', bbox_inches='tight', pad_inches=0)
    plt.close(fig)

    base64_img = base64.b64encode(img_buffer.getvalue()).decode('utf-8')

    # 3. ONNX Prediction Preparation
    spec = np.expand_dims(mel_spec_db, axis=0) 
    spec = np.expand_dims(spec, axis=0) 

    TARGET_WIDTH = 80
    current_width = spec.shape[3]
    if current_width < TARGET_WIDTH:
        pad_width = TARGET_WIDTH - current_width
        spec = np.pad(spec, ((0,0), (0,0), (0,0), (0, pad_width)), mode='constant', constant_values=-80.0)
    elif current_width > TARGET_WIDTH:
        spec = spec[:, :, :, :TARGET_WIDTH]

    payload = spec.astype(np.float32)

    # 4. Actual ONNX Inference
    prediction = onnx_session.run([output_name], {input_name: payload})[0][0][0]

    return {"probability": float(prediction), "image_base64": f"data:image/png;base64,{base64_img}"}

@app.post("/analyze_file")
async def analyze_file(file: UploadFile):
    content = await file.read()
    temp_dir = REPO_ROOT / "data" / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / "temp_upload.wav"
    with open(temp_path, "wb") as f:
        f.write(content)

    y, sr = librosa.load(temp_path, sr=16000, duration=2.5)
    return process_chunk(y, sr)

@app.websocket("/live_stream")
async def live_stream(websocket: WebSocket):
    await websocket.accept()
    audio_buffer = np.array([])

    try:
        while True:
            data = await websocket.receive_bytes()
            chunk = np.frombuffer(data, dtype=np.float32)
            audio_buffer = np.concatenate((audio_buffer, chunk))

            if len(audio_buffer) >= 40000:
                analysis_window = audio_buffer[-40000:]
                result = process_chunk(analysis_window)
                await websocket.send_json(result)
                audio_buffer = audio_buffer[-24000:] 
    except Exception as e:
        print(f"Stream disconnected: {e}")
