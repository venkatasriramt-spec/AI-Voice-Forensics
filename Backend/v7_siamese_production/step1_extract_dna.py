import os
import glob
import torch
import torchaudio
import numpy as np
from pathlib import Path
from transformers import Wav2Vec2FeatureExtractor, WavLMModel
from tqdm import tqdm
import warnings

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[1]

# ==========================================
# 1. SETUP DIRECTORIES
# ==========================================
CACHE_DIR = REPO_ROOT / "cache" / "v7_wavlm_dna_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

print("⏳ Loading Frozen WavLM Engine...")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
processor = Wav2Vec2FeatureExtractor.from_pretrained("microsoft/wavlm-base-plus")
model = WavLMModel.from_pretrained("microsoft/wavlm-base-plus").to(device)
model.eval() # Freeze the model

# ==========================================
# 2. ULTRA-STRICT 1:1 LANGUAGE & DATA FILTERING
# ==========================================
print("🔍 Cross-referencing directories for strict 1:1 pairs by Language Folder...")

real_audio_index = {}

REAL_BASE_DIR = REPO_ROOT / "data" / "multilingual_base_corpus"
if not REAL_BASE_DIR.exists():
    REAL_BASE_DIR = REPO_ROOT / "local_data"

# Map all available Real files using "language_lower/filename" as the strict key
for path in glob.glob(f"{REAL_BASE_DIR}/**/Real Audio/*.wav", recursive=True):
    p = Path(path)
    try:
        folder_token = REAL_BASE_DIR.name
        base_idx = p.parts.index(folder_token)
        lang_folder = p.parts[base_idx + 1].lower()
        filename = p.name
        
        strict_key = f"{lang_folder}/{filename}"
        real_audio_index[strict_key] = str(p)
    except ValueError:
        continue

FAKES_BASE_DIR = REPO_ROOT / "data" / "elevenlabs_v3_synthetic_speech"
if not FAKES_BASE_DIR.exists():
    FAKES_BASE_DIR = REPO_ROOT / "local_data_v6_fakes"

fake_audio_paths = glob.glob(f"{FAKES_BASE_DIR}/**/*.wav", recursive=True)
valid_paths = set()

for fake_path in fake_audio_paths:
    if os.path.getsize(fake_path) < 10000:
        continue
        
    p = Path(fake_path)
    try:
        folder_token = FAKES_BASE_DIR.name
        base_idx = p.parts.index(folder_token)
        lang_folder = p.parts[base_idx + 1].lower() 
        fake_filename = p.name
        real_filename = fake_filename.replace("fake_", "")
        
        # Build the strict key we expect to find in the real index
        expected_strict_key = f"{lang_folder}/{real_filename}"
        
        # ONLY add to the queue if both the filename AND the language folder match
        if expected_strict_key in real_audio_index:
            valid_paths.add(fake_path)
            valid_paths.add(real_audio_index[expected_strict_key])
            
    except ValueError:
        continue

all_paths = list(valid_paths)
print(f"✅ Found {len(all_paths)} perfectly matched audio files to process.")

# ==========================================
# 3. WHOLE-CLIP DNA EXTRACTION
# ==========================================
def process_whole_clip(path):
    """Uses a Sliding Window to extract DNA from the ENTIRE audio clip"""
    waveform, sr = torchaudio.load(path, backend="soundfile")
    if sr != 16000:
        waveform = torchaudio.transforms.Resample(sr, 16000)(waveform)
    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)
    waveform = waveform.squeeze().numpy()

    chunk_length = 16000 * 4  # 4 seconds
    stride = 16000 * 2        # 2 seconds overlap
    
    if len(waveform) <= chunk_length:
        chunks = [np.pad(waveform, (0, chunk_length - len(waveform)), "constant")]
    else:
        chunks = [waveform[i:i + chunk_length] for i in range(0, len(waveform) - chunk_length + 1, stride)]
        if len(waveform) % stride != 0 and len(waveform) > chunk_length:
            chunks.append(waveform[-chunk_length:])

    chunk_embeddings = []
    with torch.no_grad(): # NO GRADIENTS - Massive speed and memory savings
        for chunk in chunks:
            inputs = processor(chunk, sampling_rate=16000, return_tensors="pt").input_values.to(device)
            # Extract 768-D vector for this chunk
            emb = model(inputs).last_hidden_state.mean(dim=1).squeeze(0)
            chunk_embeddings.append(emb)

    # Average all chunks to create the ultimate Master DNA for the whole clip
    master_dna = torch.stack(chunk_embeddings).mean(dim=0)
    return master_dna.cpu()

print("🚀 Commencing Compute Phase (Extracting DNA)...")
for path in tqdm(all_paths, desc="Processing Audio"):
    filename = os.path.basename(path)
    save_path = os.path.join(CACHE_DIR, filename.replace(".wav", ".pt"))
    
    # Skip if already processed
    if os.path.exists(save_path):
        continue
        
    try:
        dna_tensor = process_whole_clip(path)
        torch.save(dna_tensor, save_path)
    except Exception as e:
        print(f"\n⚠️ Skipped Corrupted File: {filename}")

print("\n✅ Compute Phase Complete! All DNA vectors saved to /wavlm_dna_cache")