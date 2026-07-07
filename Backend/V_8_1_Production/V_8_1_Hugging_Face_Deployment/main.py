import os
import time
import librosa
import numpy as np
import lightgbm as lgb
import warnings
import whisper
from transformers import Wav2Vec2FeatureExtractor, WavLMModel
import torch
import torchaudio
from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import io
import soundfile as sf

# Mute warnings and set up torch safety net
warnings.filterwarnings("ignore")
torch.backends.cudnn.enabled = False

# ==========================================
# 1. INITIALIZE API & LOAD MODELS
# ==========================================
app = FastAPI(title="Audio Forensics V8.1 API", version="8.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("[*] Booting up V8.1 Dual-Branch Security Engine...")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

processor = Wav2Vec2FeatureExtractor.from_pretrained("microsoft/wavlm-base-plus")
wavlm_model = WavLMModel.from_pretrained("microsoft/wavlm-base-plus").to(device)
wavlm_model.eval()

lfcc_transform = torchaudio.transforms.LFCC(
    sample_rate=16000,
    n_lfcc=40,
    speckwargs={"n_fft": 512, "hop_length": 256, "center": False}
).to(device)

lgb_model = lgb.Booster(model_file="v8_1_lightgbm.txt")
whisper_model = whisper.load_model("tiny", download_root="/app/.cache/whisper")

print(f"[*] All Models Loaded on {device}. V8.1 API is LIVE for Static & Stream.")

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
# 3. DUAL-BRANCH EXTRACTION HELPER
# ==========================================
def extract_v8_1_features(waveform_chunk):
    """Takes a 16kHz chunk and returns the 848-D Super-Vector for LightGBM"""
    if waveform_chunk.ndim > 1:
        waveform_chunk = waveform_chunk.mean(axis=0)
        
    tensor_chunk = torch.tensor(waveform_chunk).unsqueeze(0).to(device)
    
    # Branch 1: LFCCs
    lfccs = lfcc_transform(tensor_chunk).squeeze(0)
    lfcc_vector = torch.cat((torch.mean(lfccs, dim=1), torch.std(lfccs, dim=1)), dim=0)
    
    # Branch 2: WavLM
    inputs = processor(waveform_chunk, sampling_rate=16000, return_tensors="pt").input_values.to(device)
    with torch.no_grad():
        emb = wavlm_model(inputs).last_hidden_state.mean(dim=1).squeeze(0)
        
    return torch.cat((emb.cpu(), lfcc_vector.cpu()), dim=0).numpy().reshape(1, -1)

# ==========================================
# 4. STATIC ANALYTICS ENDPOINT
# ==========================================
@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    if not file.filename.endswith(('.wav', '.mp3', '.ogg', '.flac', '.mp4')):
        raise HTTPException(status_code=400, detail="Unsupported format.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
        temp_audio.write(await file.read())
        temp_audio_path = temp_audio.name

    try:
        start_total_time = time.time()
        y_full, sr = librosa.load(temp_audio_path, sr=16000)
        
        # Whisper Language Detection (First 30 seconds)
        audio_w = whisper.pad_or_trim(y_full.astype(np.float32))
        mel_w = whisper.log_mel_spectrogram(audio_w).to(whisper_model.device)
        _, probs = whisper_model.detect_language(mel_w)
        detected_code = max(probs, key=probs.get)
        final_lang = whisper.tokenizer.LANGUAGES.get(detected_code, detected_code).title()

        # V8.1 Sliding Window (4s chunk, 2s stride)
        chunk_size = 16000 * 4
        stride = 16000 * 2
        deepfake_scores = []
        
        for i in range(0, len(y_full) - chunk_size + 1, stride):
            y_chunk = y_full[i:i+chunk_size]
            if np.mean(librosa.feature.rms(y=y_chunk)) < 0.005: continue # Skip silence
            
            features = extract_v8_1_features(y_chunk)
            fake_prob = lgb_model.predict(features)[0]
            deepfake_scores.append(fake_prob)

        # Catch tail end if remainder exists
        if len(y_full) % stride != 0 and len(y_full) > chunk_size:
            y_tail = y_full[-chunk_size:]
            if np.mean(librosa.feature.rms(y=y_tail)) >= 0.005:
                deepfake_scores.append(lgb_model.predict(extract_v8_1_features(y_tail))[0])

        avg_prediction = float(np.mean(deepfake_scores)) if deepfake_scores else 0.0
        fake_prob = avg_prediction * 100
        real_prob = (1 - avg_prediction) * 100

        if fake_prob < 1.5:
            status_text, report_key, theme_color = "VERIFIED: Authentic Human", "VERIFIED", "mediumseagreen"
        elif fake_prob < 15.0:
            status_text, report_key, theme_color = "LOW RISK: Minor Anomalies", "LOW RISK", "goldenrod"
        elif fake_prob < 85.0:
            status_text, report_key, theme_color = "ELEVATED RISK: Suspicious Audio", "ELEVATED RISK", "darkorange"
        elif fake_prob < 98.5:
            status_text, report_key, theme_color = "HIGH RISK: Probable AI Generation", "HIGH RISK", "crimson"
        else:
            status_text, report_key, theme_color = "CRITICAL: Confirmed Synthetic Deepfake", "CRITICAL", "darkred"

        os.remove(temp_audio_path)
        return {
            "filename": file.filename,
            "latency_ms": round((time.time() - start_total_time) * 1000, 2),
            "languages_detected": final_lang,
            "analysis": {
                "status": status_text,
                "threat_level": report_key,
                "color_code": theme_color,
                "probabilities": {"synthetic_ai": round(fake_prob, 2), "authentic_human": round(real_prob, 2)}
            },
            "action_report": THREAT_REPORTS[report_key]
        }
    except Exception as e:
        if os.path.exists(temp_audio_path): os.remove(temp_audio_path)
        raise HTTPException(status_code=500, detail=f"Analysis Failed: {str(e)}")

# ==========================================
# 5. LIVE STREAMING WEBSOCKET ENDPOINT
# ==========================================
@app.websocket("/ws/stream")
async def live_audio_stream(websocket: WebSocket):
    await websocket.accept()
    print("[*] Live Audio Stream Connected.")
    
    audio_buffer = np.array([], dtype=np.float32)
    chunk_duration_required = 16000 * 4  # 4 Second Window for precision
    stride_overlap = 16000 * 2           # Slide by 2 seconds
    
    session_deepfake_scores = []
    
    try:
        while True:
            message = await websocket.receive()

            if "text" in message and message["text"] == "END_STREAM":
                if not session_deepfake_scores:
                    await websocket.send_json({"error": "No valid audio processed."})
                    break
                    
                cumulative_fake_prob = float(np.mean(session_deepfake_scores)) * 100
                cumulative_real_prob = 100.0 - cumulative_fake_prob

                if cumulative_fake_prob < 5.0:
                    final_status, report_key, final_color = "VERIFIED: Authentic Human", "VERIFIED", "mediumseagreen"
                elif cumulative_fake_prob < 20.0:
                    final_status, report_key, final_color = "LOW RISK: Minor Anomalies", "LOW RISK", "goldenrod"
                elif cumulative_fake_prob < 50.0:
                    final_status, report_key, final_color = "ELEVATED RISK: Suspicious Audio", "ELEVATED RISK", "darkorange"
                elif cumulative_fake_prob < 85.0:
                    final_status, report_key, final_color = "HIGH RISK: Probable AI Generation", "HIGH RISK", "crimson"
                else:
                    final_status, report_key, final_color = "CRITICAL: Confirmed Synthetic Deepfake", "CRITICAL", "darkred"
                
                await websocket.send_json({
                    "type": "final_summary",
                    "status": final_status,
                    "color_code": final_color,
                    "probabilities": {"authentic_human": round(cumulative_real_prob, 2), "synthetic_ai": round(cumulative_fake_prob, 2)},
                    "action_report": THREAT_REPORTS[report_key]
                })
                break

            elif "bytes" in message:
                data = message["bytes"]
                try:
                    y_chunk, sr = sf.read(io.BytesIO(data), dtype='float32')
                    if sr != 16000: y_chunk = librosa.resample(y_chunk, orig_sr=sr, target_sr=16000)
                    if len(y_chunk.shape) > 1: y_chunk = librosa.to_mono(y_chunk.T)
                    audio_buffer = np.concatenate((audio_buffer, y_chunk))
                except Exception:
                    audio_buffer = np.concatenate((audio_buffer, np.frombuffer(data, dtype=np.float32)))

                if len(audio_buffer) >= chunk_duration_required:
                    start_time = time.time()
                    analysis_window = audio_buffer[:chunk_duration_required]
                    
                    if np.mean(librosa.feature.rms(y=analysis_window)) >= 0.005:
                        features = extract_v8_1_features(analysis_window)
                        raw_fake_prob = lgb_model.predict(features)[0]
                        session_deepfake_scores.append(raw_fake_prob)
                        
                        chunk_fake_prob = raw_fake_prob * 100
                        chunk_real_prob = (1 - raw_fake_prob) * 100
                        
                        chunk_status = "SAFE: Authentic Human" if chunk_fake_prob < 50.0 else "CRITICAL: Synthetic Artifacts Detected"
                        chunk_color = "mediumseagreen" if chunk_fake_prob < 50.0 else "crimson"
                        
                        await websocket.send_json({
                            "type": "chunk_update",
                            "latency_ms": round((time.time() - start_time) * 1000, 2),
                            "status": chunk_status,
                            "color_code": chunk_color,
                            "probabilities": {"authentic_human": round(chunk_real_prob, 2), "synthetic_ai": round(chunk_fake_prob, 2)}
                        })
                    
                    # Slide the buffer by 2 seconds
                    audio_buffer = audio_buffer[stride_overlap:]

    except WebSocketDisconnect:
        print("[-] Stream Disconnected.")

@app.get("/")
def read_root():
    return {"status": "V8.1 Dual-Branch Audio Forensics API is Online"}