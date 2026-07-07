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

# ==========================================
# 1. SETUP DIRECTORIES & CACHE
# ==========================================
CACHE_DIR_REAL = "wavlm_dna_cache/real"
CACHE_DIR_FAKE = "wavlm_dna_cache/fake"
os.makedirs(CACHE_DIR_REAL, exist_ok=True)
os.makedirs(CACHE_DIR_FAKE, exist_ok=True)

print("⏳ Loading Frozen WavLM Engine...")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
processor = Wav2Vec2FeatureExtractor.from_pretrained("microsoft/wavlm-base-plus")
model = WavLMModel.from_pretrained("microsoft/wavlm-base-plus").to(device)
model.eval() # Freeze the model

# ==========================================
# 2. COLLECT ALL DATASETS
# ==========================================
print("🔍 Scanning directories for all available audio...")

real_paths = glob.glob("local_data/**/Real Audio/*.wav", recursive=True)

fake_paths = []
fake_paths.extend(glob.glob("local_data/**/Fake Audio/*.wav", recursive=True))
fake_paths.extend(glob.glob("local_data_v6_fakes/**/*.wav", recursive=True))
fake_paths.extend(glob.glob("synthetic_booster_pack/**/*.wav", recursive=True))

print(f"✅ Found {len(real_paths)} Authentic Human clips.")
print(f"✅ Found {len(fake_paths)} Synthetic AI clips.")

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
            emb = model(inputs).last_hidden_state.mean(dim=1).squeeze(0)
            chunk_embeddings.append(emb)

    # Average all chunks to create the ultimate Master DNA for the whole clip
    master_dna = torch.stack(chunk_embeddings).mean(dim=0)
    return master_dna.cpu()

# ==========================================
# 4. EXECUTE PIPELINE
# ==========================================
def extract_and_save(paths, cache_dir, desc):
    for path in tqdm(paths, desc=desc):
        # Create a safe, unique filename based on the path so we don't overwrite files with same names
        safe_filename = path.replace("/", "_").replace("\\", "_").replace(".wav", ".pt")
        save_path = os.path.join(cache_dir, safe_filename)
        
        if os.path.exists(save_path):
            continue
            
        try:
            # Skip corrupted/empty files
            if os.path.getsize(path) < 10000:
                continue
                
            dna_tensor = process_whole_clip(path)
            torch.save(dna_tensor, save_path)
            
        except Exception as e:
            pass # Failsafes for corrupted audio files

print("\n🚀 Commencing Compute Phase (Extracting Human DNA)...")
extract_and_save(real_paths, CACHE_DIR_REAL, "Processing Real")

print("\n🚀 Commencing Compute Phase (Extracting Synthetic DNA)...")
extract_and_save(fake_paths, CACHE_DIR_FAKE, "Processing Fake")

print("\n✅ Phase 1 Complete! All DNA vectors cached safely.")