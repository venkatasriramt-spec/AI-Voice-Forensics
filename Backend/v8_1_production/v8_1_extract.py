import os
import glob
import random
import torch
import torchaudio
import numpy as np
from transformers import Wav2Vec2FeatureExtractor, WavLMModel
from tqdm import tqdm
import warnings

warnings.filterwarnings("ignore")

from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[1]

# ==========================================
# 1. SETUP DIRECTORIES & CACHE
# ==========================================
CACHE_DIR = REPO_ROOT / "cache" / "v8_1_fused_dna_cache"
CACHE_DIR_REAL = CACHE_DIR / "real"
CACHE_DIR_FAKE = CACHE_DIR / "fake"
CACHE_DIR_REAL.mkdir(parents=True, exist_ok=True)
CACHE_DIR_FAKE.mkdir(parents=True, exist_ok=True)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"⏳ Booting up Frozen WavLM Engine on {device}...")

processor = Wav2Vec2FeatureExtractor.from_pretrained("microsoft/wavlm-base-plus")
wavlm_model = WavLMModel.from_pretrained("microsoft/wavlm-base-plus").to(device)
wavlm_model.eval()

# Initialize LFCC Extractor for Micro-Spectral Artifacts
lfcc_transform = torchaudio.transforms.LFCC(
    sample_rate=16000,
    n_lfcc=40,
    speckwargs={"n_fft": 512, "hop_length": 256, "center": False}
).to(device)

# ==========================================
# 2. DYNAMIC AUGMENTATION (Anti-Shortcut)
# ==========================================
def apply_telephonic_augmentation(waveform, sr):
    """Simulates social media compression and noisy microphones on 30% of data"""
    if random.random() > 0.30:
        return waveform # 70% chance to leave it pristine
        
    aug_type = random.choice(["noise", "lowpass", "both"])
    
    # 1. Inject White Noise (Microphone Static)
    if aug_type in ["noise", "both"]:
        noise_amp = 0.005 * torch.rand(1).item() * torch.max(torch.abs(waveform))
        noise = torch.randn_like(waveform) * noise_amp
        waveform = waveform + noise
        
    # 2. Low-Pass Filter (Social Media/VoIP Compression)
    if aug_type in ["lowpass", "both"]:
        # Cut off frequencies above 4000Hz to simulate a bad call
        waveform = torchaudio.functional.lowpass_biquad(waveform, sr, cutoff_freq=4000.0)
        
    return waveform

# ==========================================
# 3. DUAL-BRANCH EXTRACTION PIPELINE
# ==========================================
def process_v8_1_clip(path):
    waveform, sr = torchaudio.load(path, backend="soundfile")
    if sr != 16000:
        waveform = torchaudio.transforms.Resample(sr, 16000)(waveform)
    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)
        
    # Apply random augmentation to prevent shortcut learning
    waveform = apply_telephonic_augmentation(waveform, 16000)
    
    # --- BRANCH 1: LFCC MICRO-SPECTRAL MATH (80 Features) ---
    lfccs = lfcc_transform(waveform.to(device)).squeeze(0) # Shape: [40, Time]
    lfcc_mean = torch.mean(lfccs, dim=1) 
    lfcc_std = torch.std(lfccs, dim=1)   
    lfcc_vector = torch.cat((lfcc_mean, lfcc_std), dim=0) 
    
    # --- BRANCH 2: WAVLM PARALINGUISTICS (768 Features) ---
    waveform_np = waveform.squeeze().numpy()
    chunk_length = 16000 * 4  # 4 seconds
    stride = 16000 * 2        # 2 seconds overlap
    
    if len(waveform_np) <= chunk_length:
        chunks = [np.pad(waveform_np, (0, chunk_length - len(waveform_np)), "constant")]
    else:
        chunks = [waveform_np[i:i + chunk_length] for i in range(0, len(waveform_np) - chunk_length + 1, stride)]
        if len(waveform_np) % stride != 0 and len(waveform_np) > chunk_length:
            chunks.append(waveform_np[-chunk_length:])

    chunk_embeddings = []
    with torch.no_grad():
        for chunk in chunks:
            inputs = processor(chunk, sampling_rate=16000, return_tensors="pt").input_values.to(device)
            emb = wavlm_model(inputs).last_hidden_state.mean(dim=1).squeeze(0)
            chunk_embeddings.append(emb)

    wavlm_vector = torch.stack(chunk_embeddings).mean(dim=0)
    
    # --- FUSION: Combine Both Branches ---
    super_vector = torch.cat((wavlm_vector.cpu(), lfcc_vector.cpu()), dim=0)
    return super_vector

# ==========================================
# 4. EXECUTE PIPELINE
# ==========================================
BASE_CORPUS = REPO_ROOT / "data" / "multilingual_base_corpus"
if not BASE_CORPUS.exists():
    BASE_CORPUS = REPO_ROOT / "local_data"

real_paths = glob.glob(f"{BASE_CORPUS}/**/Real Audio/*.wav", recursive=True)

fake_paths = []
fake_paths.extend(glob.glob(f"{BASE_CORPUS}/**/Fake Audio/*.wav", recursive=True))

EL_DIR = REPO_ROOT / "data" / "elevenlabs_v3_synthetic_speech"
if not EL_DIR.exists():
    EL_DIR = REPO_ROOT / "local_data_v6_fakes"
fake_paths.extend(glob.glob(f"{EL_DIR}/**/*.wav", recursive=True))

BOOSTER_DIR = REPO_ROOT / "data" / "openai_gcp_booster_pack"
if not BOOSTER_DIR.exists():
    BOOSTER_DIR = REPO_ROOT / "data" / "synthetic_booster_pack"
if not BOOSTER_DIR.exists():
    BOOSTER_DIR = REPO_ROOT / "synthetic_booster_pack"
fake_paths.extend(glob.glob(f"{BOOSTER_DIR}/**/*.wav", recursive=True))

def extract_and_save(paths, cache_dir, desc):
    for path in tqdm(paths, desc=desc):
        safe_filename = path.replace("/", "_").replace("\\", "_").replace(".wav", ".pt")
        save_path = os.path.join(cache_dir, safe_filename)
        
        if os.path.exists(save_path):
            continue
        try:
            if os.path.getsize(path) < 10000: continue
            super_vector = process_v8_1_clip(path)
            torch.save(super_vector, save_path)
        except Exception:
            pass

print(f"\n🚀 Phase 1: Extracting V8.1 Super-Vectors (WavLM + LFCC)...")
extract_and_save(real_paths, CACHE_DIR_REAL, "Processing Real Audio")
extract_and_save(fake_paths, CACHE_DIR_FAKE, "Processing Fake Audio")
print("\n✅ V8.1 Extraction Complete!")