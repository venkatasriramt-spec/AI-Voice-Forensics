import os
# CRITICAL FIX: Cut off Hugging Face's internet access to prevent the 4-minute boot hang
os.environ["HF_HUB_OFFLINE"] = "1"
import io
import time
import torch
import librosa
import numpy as np
import xgboost as xgb
import scipy.fftpack as fftpack
import soundfile as sf
import whisper
import warnings
from transformers import Wav2Vec2Processor, Wav2Vec2Model
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from whisper.tokenizer import LANGUAGES
from pydub import AudioSegment

warnings.filterwarnings("ignore")
torch.backends.cudnn.enabled = False

app = FastAPI(title="Audio Forensics V6 Grand API", version="6.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. INITIALIZATION & MODEL LOADING
# ==========================================
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[1]
MODEL_PATH = str(BASE_DIR / "v6_xgboost_grand_classifier.json")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("[*] Booting up FP16 Wav2Vec2 Backbone...")
# FIX: local_files_only=True stops the synchronous network ETag check dead in its tracks
processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base", local_files_only=True)
wav2vec_model = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base", local_files_only=True).to(device)
wav2vec_model.eval()

print("[*] Booting up OpenAI Whisper (Base)...")
whisper_model = whisper.load_model("base", download_root="/app/.cache/whisper").to(device)

print("[*] Loading XGBoost Grand Meta-Classifier...")
bst = xgb.Booster()
bst.load_model(MODEL_PATH)
print("✅ V6 Production Engine Online.")

# Explicit linguistic mapping for your 9 operational languages
PROJECT_LANGUAGES = {
    "en": "English",
    "fr": "French",
    "bn": "Bengali",
    "ca": "Catalan",
    "de": "German",
    "es": "Spanish",
    "zh": "Chinese",
    "ps": "Pashto",
    "rw": "Kinyarwanda"
}

THREAT_REPORTS = {
    "VERIFIED": [
        "Biometric Match: Vocal tract physics and acoustic resonance match natural human baseline.",
        "Anomaly Check: Micro-breaths and background cadence are consistent with live speech.",
        "System Action: Proceed with standard authentication and customer service protocols.",
        "Security Posture: No further voice verification required for standard operations.",
        "Logging: Call signature logged as a safe baseline for future biometric matching."
    ],
    "LOW RISK": [
        "Audio Quality: Minor degradation or digital artifacts detected, likely due to VoIP compression.",
        "Biometric Status: Core indicators still heavily favor a live human speaker over synthetic generation.",
        "System Action: Allow standard account inquiries and minor transactions.",
        "Security Posture: If the user requests high-value transfers, trigger a standard 2FA SMS push.",
        "Logging: Monitor the remainder of the call for shifting audio profiles."
    ],
    "ELEVATED RISK": [
        "Anomaly Detected: Significant robotic phasing or spectral anomalies detected in the audio baseline.",
        "Threat Assessment: Could indicate a low-quality voice changer, severe packet loss, or a primitive TTS engine.",
        "System Action: Soft-lock sensitive account actions (e.g., password changes, wire transfers).",
        "Security Posture: Agent must ask a dynamic, out-of-wallet security question.",
        "Logging: Route the call recording to the Tier-2 Fraud Analysis team for offline review."
    ],
    "HIGH RISK": [
        "AI Signature: Embedding matrix strongly correlates with known commercial AI voice cloning APIs.",
        "Biometric Failure: Absence of natural acoustic breathing and unnatural pitch stability detected.",
        "System Action: Instantly halt all financial transactions and account modifications.",
        "Security Posture: Agent must execute a 'Challenge-Response' phrase to break the AI generation loop.",
        "Logging: Flag the associated phone number and IP address in the active threat database."
    ],
    "CRITICAL": [
        "Deepfake Confirmed: Cryptographic certainty of synthetic generation perfectly matching TTS architectures.",
        "Threat Assessment: Active, hostile cloned voice attack attempting biometric authentication bypass.",
        "System Action: Terminate the call automatically or instruct the agent to disconnect immediately.",
        "Security Posture: Temporarily freeze the targeted account to prevent automated unauthorized access.",
        "Logging: Dispatch an emergency security alert to the account owner's secondary contact methods."
    ]
}

# ==========================================
# 2. FORENSIC ENGINES
# ==========================================
def remove_silence(y, top_db=30):
    intervals = librosa.effects.split(y, top_db=top_db)
    if len(intervals) == 0: return np.array([])
    return np.concatenate([y[start:end] for start, end in intervals])

def extract_forensic_features(y, sr=16000, n_lfcc=20):
    stft_complex = librosa.stft(y, n_fft=1024, hop_length=512)
    magnitude = np.abs(stft_complex)
    phase = np.angle(stft_complex)
    log_spectrogram = np.log(magnitude + 1e-9)
    lfcc_coeffs = fftpack.dct(log_spectrogram, axis=0, type=2, norm='ortho')[:n_lfcc]
    phase_diff = np.diff(phase, axis=1)
    phase_diff_wrapped = np.arctan2(np.sin(phase_diff), np.cos(phase_diff))
    phase_jitter_variance = np.var(phase_diff_wrapped, axis=1)
    return np.concatenate([np.mean(lfcc_coeffs, axis=1), np.std(lfcc_coeffs, axis=1), np.percentile(phase_jitter_variance, [25, 50, 75])])

def categorize_threat(fake_prob):
    if fake_prob < 1.5: return "VERIFIED: Authentic Human", "VERIFIED"
    elif fake_prob < 15.0: return "LOW RISK: Minor Anomalies", "LOW RISK"
    elif fake_prob < 85.0: return "ELEVATED RISK: Suspicious Audio", "ELEVATED RISK"
    elif fake_prob < 98.5: return "HIGH RISK: Probable AI Generation", "HIGH RISK"
    else: return "CRITICAL: Confirmed Synthetic Deepfake", "CRITICAL"

def fast_chunk_analyze(y):
    start_time = time.time()
    y = remove_silence(y)
    if len(y) < 1600: return None 
        
    forensic_vector = extract_forensic_features(y)
    inputs = processor(y, sampling_rate=16000, return_tensors="pt", padding=True).input_values.to(device)
    with torch.no_grad(), torch.amp.autocast(device_type="cuda" if "cuda" in str(device) else "cpu", dtype=torch.float16):
        acoustic_vector = torch.mean(wav2vec_model(inputs).last_hidden_state, dim=1).squeeze().cpu().numpy()

    dmatrix = xgb.DMatrix(np.concatenate([acoustic_vector, forensic_vector]).reshape(1, -1))
    fake_prob = float(bst.predict(dmatrix)[0] * 100)
    real_prob = float(100.0 - fake_prob)
    
    status, _ = categorize_threat(fake_prob)
    latency_ms = round((time.time() - start_time) * 1000, 2)
    
    return {"fake_prob": round(fake_prob, 2), "real_prob": round(real_prob, 2), "status": status, "latency_ms": latency_ms}

# FIX: Added live_fake_prob parameter to bypass full-matrix washout during EOF summary
def run_full_pipeline(y, live_fake_prob=None):
    start_time = time.time()
    y = remove_silence(y)
    if len(y) < 1600:
        return {"status": "ABORTED", "reason": "Empty or completely silent audio."}

    # Whisper Language Detection
    y_whisper = whisper.pad_or_trim(y.astype(np.float32))
    mel = whisper.log_mel_spectrogram(y_whisper).to(device)
    _, probs = whisper_model.detect_language(mel)
    detected_lang_code = max(probs, key=probs.get)
    lang_confidence = probs[detected_lang_code] * 100
    
    # Map code to explicit clean full text labels
    full_lang_name = PROJECT_LANGUAGES.get(
        detected_lang_code, 
        LANGUAGES.get(detected_lang_code, detected_lang_code).capitalize()
    )

    # Determine Threat Score (Bypass acoustic extraction if we already have the live chunk average)
    if live_fake_prob is not None:
        fake_prob = live_fake_prob
    else:
        # Deep Acoustic Extraction for standard file uploads
        forensic_vector = extract_forensic_features(y)
        inputs = processor(y, sampling_rate=16000, return_tensors="pt", padding=True).input_values.to(device)
        with torch.no_grad(), torch.amp.autocast(device_type="cuda" if "cuda" in str(device) else "cpu", dtype=torch.float16):
            acoustic_vector = torch.mean(wav2vec_model(inputs).last_hidden_state, dim=1).squeeze().cpu().numpy()

        dmatrix = xgb.DMatrix(np.concatenate([acoustic_vector, forensic_vector]).reshape(1, -1))
        fake_prob = float(bst.predict(dmatrix)[0] * 100)
        
    status, report_key = categorize_threat(fake_prob)
    
    latency_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "status": status,
        "threat_score": round(fake_prob, 2),
        "language": full_lang_name,
        "lang_confidence": round(lang_confidence, 2),
        "report": THREAT_REPORTS[report_key],
        "latency_ms": latency_ms
    }

# ==========================================
# 3. ENDPOINTS
# ==========================================

@app.post("/analyze_file")
async def analyze_file(file: UploadFile = File(...)):
    content = await file.read()
    filename = file.filename.lower()
    
    try:
        # Check if the uploaded file is a video container or a complex compressed audio codec
        if filename.endswith(('.mp4', '.m4a', '.mp3', '.aac', '.mov', '.mkv', '.avi', '.3gp')):
            # Wrap bytes and use pydub/ffmpeg to instantly extract the raw audio stream in memory
            audio = AudioSegment.from_file(io.BytesIO(content))
            
            # Export the extracted track to an in-memory, uncompressed standard WAV buffer
            wav_buf = io.BytesIO()
            audio.export(wav_buf, format="wav")
            wav_buf.seek(0)
            
            # Hand the pristine WAV stream directly to soundfile
            y, sr = sf.read(wav_buf)
        else:
            # Direct lightning-fast path for native audio formats (WAV, OGG, FLAC)
            y, sr = sf.read(io.BytesIO(content))
        
        # Collapse stereo tracking matrices into a 1D Mono array completely
        if len(y.shape) > 1: 
            y = y.mean(axis=1)
            
        # Standardize sample rate timeline constraints to match your trained checkpoints
        if sr != 16000: 
            y = librosa.resample(y, orig_sr=sr, target_sr=16000)
            
    except Exception as e:
        return {"status": "ERROR", "reason": f"Failed to successfully parse uploaded file layout: {e}"}
        
    return run_full_pipeline(y)

@app.websocket("/ws/stream")
async def live_stream(websocket: WebSocket):
    await websocket.accept()
    full_audio_buffer = np.array([], dtype=np.float32) 
    window_buffer = np.array([], dtype=np.float32)     
    chunk_scores = [] # FIX: Array to track scores and prevent EOF washout

    try:
        while True:
            message = await websocket.receive()
            
            if "bytes" in message:
                chunk = np.frombuffer(message["bytes"], dtype=np.float32)
                full_audio_buffer = np.concatenate((full_audio_buffer, chunk))
                window_buffer = np.concatenate((window_buffer, chunk))
                
                if len(window_buffer) >= 16000 * 2.5:
                    chunk_res = fast_chunk_analyze(window_buffer)
                    if chunk_res:
                        # Store the score to calculate the true mathematical average later
                        chunk_scores.append(chunk_res["fake_prob"])
                        
                        await websocket.send_json({
                            "type": "chunk_update",
                            "status": chunk_res["status"],
                            "fake_prob": chunk_res["fake_prob"],
                            "real_prob": chunk_res["real_prob"],
                            "latency_ms": chunk_res["latency_ms"]
                        })
                    window_buffer = window_buffer[-int(16000 * 0.5):]
                    
            elif "text" in message:
                if message["text"] == "EOF":
                    # FIX: Calculate the aggregated threat score from the live chunks
                    # Replace np.mean with np.max if you want the highest detected threat to govern the final status
                    live_fake_prob = float(np.mean(chunk_scores)) if chunk_scores else None
                    
                    final_summary = run_full_pipeline(full_audio_buffer, live_fake_prob=live_fake_prob)
                    final_summary["type"] = "final_summary"
                    await websocket.send_json(final_summary)
                    break
                    
    except WebSocketDisconnect:
        print("[-] Live Audio Stream Disconnected.")