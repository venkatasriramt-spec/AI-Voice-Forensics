import os
import glob
import random
import io
import numpy as np
import soundfile as sf
import librosa
import scipy.signal as signal
import scipy.fftpack as fftpack
import torch
import xgboost as xgb
from transformers import Wav2Vec2Processor, Wav2Vec2Model
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm
import warnings

warnings.filterwarnings("ignore")

# ==========================================
# 1. INITIALIZATION & AUGMENTATION
# ==========================================
print("⏳ Booting up FP16 Wav2Vec2 Backbone...")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base")
wav2vec_model = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base").to(device)
wav2vec_model.eval()

def augment_audio(y, sr=16000):
    """Injects chaos and VoIP compression to authentic audio to prevent model overconfidence."""
    # 50% chance: Microphone static
    if random.random() < 0.5:
        noise_amp = 0.005 * np.random.uniform() * np.amax(y)
        y = y + noise_amp * np.random.normal(size=y.shape[0])
    
    # 30% chance: Quiet caller
    if random.random() < 0.3:
        y = y * random.uniform(0.5, 0.9)
        
    # 30% chance: VoIP Telephonic Bandpass Filter (Mimics AI compression)
    if random.random() < 0.3:
        b, a = signal.butter(5, [300.0 / (sr / 2), 3400.0 / (sr / 2)], btype='band')
        y = signal.lfilter(b, a, y)
        
    return y

# ==========================================
# 2. FORENSIC MATH & HIGH-SPEED EXTRACTION
# ==========================================
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

def process_audio_file(file_path, apply_augmentation=False):
    try:
        # High-Speed I/O using Soundfile
        y, sr = sf.read(file_path)
        if sr != 16000:
            y = librosa.resample(y, orig_sr=sr, target_sr=16000)
        if len(y.shape) > 1:
            y = y.mean(axis=1) # Convert to mono
            
        if apply_augmentation:
            y = augment_audio(y)
            
        forensic_vector = extract_forensic_features(y, sr=16000)
        
        inputs = processor(y, sampling_rate=16000, return_tensors="pt", padding=True)
        
        # Hardware Acceleration: Mixed Precision (FP16)
        with torch.no_grad(), torch.amp.autocast(device_type="cuda", dtype=torch.float16):
            hidden_states = wav2vec_model(inputs.input_values.to(device)).last_hidden_state
            acoustic_vector = torch.mean(hidden_states, dim=1).squeeze().cpu().numpy()
            
        return np.concatenate([acoustic_vector, forensic_vector])
    except Exception as e:
        return None

from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[1]

# ==========================================
# 3. GRAND SCALE DATA INGESTION
# ==========================================
all_files = []

# --- A. Ingest Multilingual Base Corpus (45k Real, 45k Fake) ---
LOCAL_DIR = REPO_ROOT / "data" / "multilingual_base_corpus"
if not LOCAL_DIR.exists():
    LOCAL_DIR = REPO_ROOT / "local_data"

if LOCAL_DIR.exists():
    for root, dirs, files in os.walk(str(LOCAL_DIR)):
        for file in files:
            if file.lower().endswith(".wav"):
                path = os.path.join(root, file)
                if "real audio" in root.lower():
                    all_files.append((path, 0, True))  # Real: Label 0, Augment=True
                elif "fake audio" in root.lower():
                    all_files.append((path, 1, False)) # Fake: Label 1, Augment=False

# --- B. Ingest ElevenLabs v3 Synthetic Speech (7,700 Fakes) ---
V6_FAKES_DIR = REPO_ROOT / "data" / "elevenlabs_v3_synthetic_speech"
if not V6_FAKES_DIR.exists():
    V6_FAKES_DIR = REPO_ROOT / "local_data_v6_fakes"

if V6_FAKES_DIR.exists():
    for root, dirs, files in os.walk(str(V6_FAKES_DIR)):
        for file in files:
            if file.lower().endswith(".wav"):
                all_files.append((os.path.join(root, file), 1, False))

# --- C. Ingest Booster Pack (130 Multi-Engine Fakes) ---
BOOSTER_DIR = REPO_ROOT / "data" / "openai_gcp_booster_pack"
if not BOOSTER_DIR.exists():
    BOOSTER_DIR = REPO_ROOT / "data" / "synthetic_booster_pack"
if not BOOSTER_DIR.exists():
    BOOSTER_DIR = REPO_ROOT / "synthetic_booster_pack"

if BOOSTER_DIR.exists():
    for file in glob.glob(os.path.join(str(BOOSTER_DIR), "*.wav")):
        all_files.append((file, 1, False))

# Shuffle completely to prevent sequential bias during extraction
random.shuffle(all_files)
print(f"\n🚀 Indexing Grand Data Lake... Found {len(all_files)} total clips.")

# ==========================================
# 4. EXTRACTION & CHECKPOINTING
# ==========================================
CACHE_DIR = REPO_ROOT / "cache" / "v6_features"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
FEATURE_FILE = str(CACHE_DIR / "v6_features.npy")
LABEL_FILE = str(CACHE_DIR / "v6_labels.npy")

# Fallback check in repo root if already downloaded there
if not os.path.exists(FEATURE_FILE) and os.path.exists(str(REPO_ROOT / "v6_features.npy")):
    FEATURE_FILE = str(REPO_ROOT / "v6_features.npy")
    LABEL_FILE = str(REPO_ROOT / "v6_labels.npy")

if os.path.exists(FEATURE_FILE) and os.path.exists(LABEL_FILE):
    print("\n✅ Found existing extracted features! Loading from disk (skipping extraction)...")
    X = np.load(FEATURE_FILE)
    y = np.load(LABEL_FILE)
else:
    print("\n⏳ Extracting Features with Dynamic Augmentation (This will take a while)...")
    X_data, y_labels = [], []
    
    for file_path, label, do_aug in tqdm(all_files, desc="Processing ~100k Clips"):
        features = process_audio_file(file_path, apply_augmentation=do_aug)
        if features is not None:
            X_data.append(features)
            y_labels.append(label)

    X = np.array(X_data)
    y = np.array(y_labels)
    
    print("\n💾 Saving feature matrices to disk as checkpoints...")
    np.save(FEATURE_FILE, X)
    np.save(LABEL_FILE, y)
    print("✅ Extraction Complete & Checkpointed!")

print(f"Feature matrix compilation complete. Array shape: {X.shape}")

# ==========================================
# 5. CONSERVATIVE META-CLASSIFIER
# ==========================================
print("\n🧠 Training V6 Grand XGBoost Model...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)

xgb_classifier = xgb.XGBClassifier(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.03,
    subsample=0.8,
    colsample_bytree=0.8,
    gamma=2.0,           
    reg_alpha=1.0,       
    reg_lambda=15.0,        # SEVERE L2 Reg: Prevents overconfidence
    min_child_weight=10,    # Prevents isolating rare micro-features
    eval_metric="logloss",
    tree_method="hist",
    device="cuda" if torch.cuda.is_available() else "cpu",
    random_state=42
)
xgb_classifier.fit(X_train, y_train)

# ==========================================
# 6. EVALUATION, PLOTS & SAVING
# ==========================================
y_pred = xgb_classifier.predict(X_test)
y_proba = xgb_classifier.predict_proba(X_test)[:, 1]

print("\n" + "="*50)
print("     GRAND MODEL VERSION 6 EVALUATION            ")
print("="*50)
print(f"Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")
print(classification_report(y_test, y_pred, target_names=["Authentic Human (0)", "Synthetic (1)"]))

plt.figure(figsize=(14, 5))

plt.subplot(1, 2, 1)
sns.heatmap(confusion_matrix(y_test, y_pred), annot=True, fmt='d', cmap='Blues', xticklabels=["Human", "Synthetic"], yticklabels=["Human", "Synthetic"])
plt.title('V6 Grand Confusion Matrix')

plt.subplot(1, 2, 2)
sns.kdeplot(y_proba[y_test == 0], fill=True, color="mediumseagreen", label="Authentic Human (0)")
sns.kdeplot(y_proba[y_test == 1], fill=True, color="crimson", label="Synthetic Audio (1)")
plt.title('KDE Plot: Probability Distribution (Hesitation Enabled)')
plt.xlabel('AI Vocoder Probability')
plt.legend()
plt.tight_layout()

PLOT_OUT = str(BASE_DIR / "v6_grand_evaluation_plots.png")
plt.savefig(PLOT_OUT)
print(f"📊 Visualizations saved to: {PLOT_OUT}")

MODEL_OUT = str(BASE_DIR / "v6_xgboost_grand_classifier.json")
xgb_classifier.save_model(MODEL_OUT)
print(f"✅ Grand Pipeline Complete! Model saved to: {MODEL_OUT}")