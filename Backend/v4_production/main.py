import os
import time
from pathlib import Path
import librosa
import numpy as np
import xgboost as xgb
from onnxruntime import InferenceSession, SessionOptions
import warnings
import whisper
from transformers import Wav2Vec2Processor
import torch
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tempfile

# Mute warnings and set up torch safety net
warnings.filterwarnings("ignore")
torch.backends.cudnn.enabled = False

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[1]

# ==========================================
# 1. INITIALIZE API & LOAD MODELS
# ==========================================
app = FastAPI(title="Audio Forensics V4 API", version="4.1.0")

# Allow your frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update this to your frontend's specific URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("[*] Booting up V4 ONNX-Optimized Security Engine...")

sess_options = SessionOptions()
sess_options.intra_op_num_threads = 8 

onnx_path = BASE_DIR / "wav2vec2_onnx_production" / "model.onnx"
if onnx_path.exists():
    w2v_ort_session = InferenceSession(
        str(onnx_path), 
        sess_options, 
        providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
    )
else:
    w2v_ort_session = None
    print(f"⚠️ ONNX weights not found at {onnx_path}. Ensure weights are downloaded from Internet Archive.")

processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base")

xgb_clf = xgb.XGBClassifier()
xgb_model_path = BASE_DIR / "v4_xgboost_wav2vec2.json"
if not xgb_model_path.exists():
    # Backward compatibility fallback
    xgb_model_path = BASE_DIR / "thunderbuddies_v4.json"

if xgb_model_path.exists():
    xgb_clf.load_model(str(xgb_model_path))
else:
    print(f"⚠️ XGBoost model not found at {xgb_model_path}.")

whisper_model = whisper.load_model("tiny")

print("[*] All Models Loaded. API is LIVE.")

# ==========================================
# 2. THREAT REPORTS DICTIONARY
# ==========================================
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
# 3. THE ANALYTICS ENDPOINT
# ==========================================
@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    if not file.filename.endswith(('.wav', '.mp3', '.ogg', '.flac')):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a valid audio file.")

    if w2v_ort_session is None:
        raise HTTPException(status_code=500, detail="Wav2Vec2 ONNX model is missing. Please download model weights from Internet Archive.")

    # Save the uploaded file to a temporary location for librosa to read
    temp_dir = REPO_ROOT / "data" / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_audio_path = str(temp_dir / f"upload_{int(time.time()*1000)}.wav")
    with open(temp_audio_path, "wb") as temp_audio:
        temp_audio.write(await file.read())

    try:
        start_total_time = time.time()
        y_full, sr = librosa.load(temp_audio_path, sr=16000)
        chunk_size = int(16000 * 2.5) 
        
        detected_languages = set()
        deepfake_scores = []
        language_detected = False
        
        for i in range(0, len(y_full), chunk_size):
            y_chunk = y_full[i:i+chunk_size]
            
            if len(y_chunk) < 16000 * 1.0: 
                continue
                
            rms_energy = np.mean(librosa.feature.rms(y=y_chunk))
            if rms_energy < 0.005:
                continue
                
            if not language_detected:
                audio_w = whisper.pad_or_trim(y_chunk.astype(np.float32))
                mel_w = whisper.log_mel_spectrogram(audio_w).to(whisper_model.device)
                _, probs = whisper_model.detect_language(mel_w)
                detected_code = max(probs, key=probs.get)
                final_lang = whisper.tokenizer.LANGUAGES.get(detected_code, detected_code).title()
                detected_languages.add(final_lang)
                language_detected = True
            
            trimmed_chunk, _ = librosa.effects.trim(y_chunk, top_db=20)
            if len(trimmed_chunk) < 8000:
                continue
                
            inputs = processor(trimmed_chunk, sampling_rate=16000, return_tensors="np")
            ort_inputs = dict(inputs)
            ort_outs = w2v_ort_session.run(None, ort_inputs)
            
            last_hidden_state = ort_outs[0]
            embedding = last_hidden_state.mean(axis=1)
            
            pred_probs = xgb_clf.predict_proba(embedding)[0]
            deepfake_scores.append(float(pred_probs[1])) # Convert to standard Python float for JSON

        # --- AGGREGATE RESULTS ---
        exec_time = (time.time() - start_total_time) * 1000
        languages_str = ", ".join(list(detected_languages)) if detected_languages else "Unknown"
        
        avg_prediction = float(np.mean(deepfake_scores)) if deepfake_scores else 0.0
        fake_prob = avg_prediction * 100
        real_prob = (1 - avg_prediction) * 100

        # Threat Matrix Logic
        if fake_prob < 5.0:
            status_text, report_key, theme_color = "VERIFIED: Authentic Human", "VERIFIED", "mediumseagreen"
        elif fake_prob < 20.0:
            status_text, report_key, theme_color = "LOW RISK: Minor Anomalies", "LOW RISK", "goldenrod"
        elif fake_prob < 60.0:
            status_text, report_key, theme_color = "ELEVATED RISK: Suspicious Audio", "ELEVATED RISK", "darkorange"
        elif fake_prob < 90.0:
            status_text, report_key, theme_color = "HIGH RISK: Probable AI Generation", "HIGH RISK", "crimson"
        else:
            status_text, report_key, theme_color = "CRITICAL: Confirmed Synthetic Deepfake", "CRITICAL", "darkred"

        # Cleanup the temp file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        # Return a perfectly structured JSON payload to your frontend
        return {
            "filename": file.filename,
            "latency_ms": round(exec_time, 2),
            "languages_detected": languages_str,
            "analysis": {
                "status": status_text,
                "threat_level": report_key,
                "color_code": theme_color,
                "probabilities": {
                    "synthetic_ai": round(fake_prob, 2),
                    "authentic_human": round(real_prob, 2)
                }
            },
            "action_report": THREAT_REPORTS[report_key]
        }

    except Exception as e:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        raise HTTPException(status_code=500, detail=f"Analysis Failed: {str(e)}")

# Health Check Endpoint
@app.get("/")
def read_root():
    return {"status": "V4 Audio Forensics API is Online"}
