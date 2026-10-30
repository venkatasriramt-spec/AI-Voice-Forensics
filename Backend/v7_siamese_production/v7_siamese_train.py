"""
===============================================================================
SIAMESE WAVLM AUDIO DEEPFAKE DETECTOR (V7)
===============================================================================

Overview:
---------
This script trains a Siamese Neural Network to detect AI-generated audio 
(voice clones/deepfakes). Rather than looking at a single audio file and 
guessing "real or fake," it frames detection as a comparative similarity task.

Core Methodology:
-----------------
1. Dynamic Data Pairing (The "Trap"): 
   The script dynamically maps authentic audio files to their exact deepfake 
   counterparts (same words, same voice, but digitally synthesized).
   - Negative Pairs (Label 0.0): Real Audio vs. Exact Fake Audio.
   - Positive Pairs (Label 1.0): Real Audio vs. Random Different Real Audio.

2. Audio Standardization:
   All audio is forced to a strict 16kHz sample rate and exactly 4.0 seconds 
   in length (padded with zeros if too short, truncated if too long).

3. Siamese Architecture:
   - Base Model: `microsoft/wavlm-base-plus` (lower layers frozen to save VRAM).
   - The network extracts embeddings for both audio clips and computes the 
     mathematical absolute difference between them.
   - A custom classifier analyzes this difference to determine if the variance 
     is natural (two authentic clips) or synthetic (a real vs. a digital clone).

Hardware & Execution Notes:
---------------------------
- OOM Prevention: Designed to run on a single GPU (e.g., NVIDIA L4). It uses a 
  micro-batch size of 4 with 4 gradient accumulation steps to simulate an 
  effective batch size of 16 without running out of memory.
- Headless Mode: Matplotlib is set to 'Agg' backend, allowing the script to 
  run safely in background terminal multiplexers (like TMUX) without crashing 
  due to missing display drivers.

Outputs:
--------
- Model Weights: Saves to `wavlm_siamese_v7.pth`
- Visual Report: Saves a Confusion Matrix and KDE Threat Distribution plot 
  to `v7_siamese_evaluation.png`.

===============================================================================
"""
import os
import glob
import random
import torch
import torch.nn as nn
import torchaudio
import numpy as np
from torch.utils.data import Dataset, DataLoader
from transformers import Wav2Vec2FeatureExtractor, WavLMModel
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.model_selection import train_test_split
import matplotlib
matplotlib.use('Agg')  # Headless mode for TMUX
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm
import warnings

warnings.filterwarnings("ignore")

from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[1]

# ==========================================
# 1. DYNAMIC DATA MAPPING
# ==========================================
print("🔍 Indexing Real and Fake Audio files...")

REAL_BASE_DIR = REPO_ROOT / "data" / "multilingual_base_corpus"
if not REAL_BASE_DIR.exists():
    REAL_BASE_DIR = REPO_ROOT / "local_data"

# Index all authentic real audio files in a dictionary for instant lookup
real_audio_index = {}
real_audio_paths = glob.glob(f"{REAL_BASE_DIR}/**/Real Audio/*.wav", recursive=True)
for path in real_audio_paths:
    real_audio_index[os.path.basename(path)] = path

FAKES_BASE_DIR = REPO_ROOT / "data" / "elevenlabs_v3_synthetic_speech"
if not FAKES_BASE_DIR.exists():
    FAKES_BASE_DIR = REPO_ROOT / "local_data_v6_fakes"

# Scan the fakes and build our mapped pairs
fake_audio_paths = glob.glob(f"{FAKES_BASE_DIR}/**/*.wav", recursive=True)

positive_pairs = [] # Label 1: (Real, Real) -> Similar
negative_pairs = [] # Label 0: (Real, Fake) -> Dissimilar

real_filenames_list = list(real_audio_index.keys())

for fake_path in fake_audio_paths:
    fake_filename = os.path.basename(fake_path)
    real_filename = fake_filename.replace("fake_", "")
    
    # If we find the exact 1:1 real match
    if real_filename in real_audio_index:
        real_path = real_audio_index[real_filename]
        
        # Create a Negative Pair (The Trap): Exact same words/voice, but one is synthetic
        negative_pairs.append((real_path, fake_path, 0.0))
        
        # Create a Positive Pair: The real audio matched with a COMPLETELY random different real audio
        random_real = real_audio_index[random.choice(real_filenames_list)]
        positive_pairs.append((real_path, random_real, 1.0))

# Combine and shuffle
all_pairs = positive_pairs + negative_pairs
random.seed(42)
random.shuffle(all_pairs)

print(f"✅ Dynamically mapped {len(negative_pairs)} Negative pairs and {len(positive_pairs)} Positive pairs.")
print(f"Total dataset size: {len(all_pairs)} pairs.")

# Train/Test Split
train_pairs, test_pairs = train_test_split(all_pairs, test_size=0.15, random_state=42)

# ==========================================
# 2. DATASET & DATALOADER
# ==========================================
class DynamicSiameseDataset(Dataset):
    def __init__(self, paired_data, target_sr=16000, max_duration=4.0):
        self.paired_data = paired_data
        self.target_sr = target_sr
        self.max_length = int(target_sr * max_duration)
        # WavLM uses the same feature extractor as Wav2Vec2
        self.processor = Wav2Vec2FeatureExtractor.from_pretrained("microsoft/wavlm-base-plus")

    def __len__(self):
        return len(self.paired_data)
        
    def load_and_pad(self, path):
        waveform, sr = torchaudio.load(path, backend="soundfile")
        if sr != self.target_sr:
            waveform = torchaudio.transforms.Resample(sr, self.target_sr)(waveform)
        # Convert stereo to mono
        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)
            
        waveform = waveform.squeeze().numpy()
        
        # Pad or truncate to max_length
        if len(waveform) > self.max_length:
            waveform = waveform[:self.max_length]
        else:
            waveform = np.pad(waveform, (0, self.max_length - len(waveform)), "constant")
            
        return waveform

    def __getitem__(self, idx):
        try:
            path1, path2, label = self.paired_data[idx]
            
            wave1 = self.load_and_pad(path1)
            wave2 = self.load_and_pad(path2)
            
            # Process arrays to tensors
            inputs1 = self.processor(wave1, sampling_rate=self.target_sr, return_tensors="pt").input_values.squeeze(0)
            inputs2 = self.processor(wave2, sampling_rate=self.target_sr, return_tensors="pt").input_values.squeeze(0)
            
            return inputs1, inputs2, torch.tensor(label, dtype=torch.float32)
            
        except Exception as e:
            # If the audio file is corrupted, zero-bytes, or not a real WAV:
            # 1. Print a small warning to the console
            print(f"\n⚠️ WARNING: Skipping corrupted audio file at index {idx}.")
            
            # 2. PyTorch Hack: Recursively call this exact function with a random new index!
            # This ensures the GPU still gets a full batch of data and doesn't crash.
            import random
            random_idx = random.randint(0, len(self.paired_data) - 1)
            return self.__getitem__(random_idx)

# WARNING: Batch size kept very small (2) to prevent OOM on a single L4 GPU
train_loader = DataLoader(DynamicSiameseDataset(train_pairs), batch_size=4, shuffle=True, num_workers=16, pin_memory=True)
test_loader = DataLoader(DynamicSiameseDataset(test_pairs), batch_size=4, shuffle=False, num_workers=16, pin_memory=True)

# ==========================================
# 3. SIAMESE WAVLM ARCHITECTURE
# ==========================================
class SiameseWavLM(nn.Module):
    def __init__(self):
        super().__init__()
        self.wavlm = WavLMModel.from_pretrained("microsoft/wavlm-base-plus")
        
        # Freeze lower layers of WavLM to save VRAM and prevent overfitting
        for param in self.wavlm.feature_extractor.parameters():
            param.requires_grad = False
            
        self.classifier = nn.Sequential(
            nn.Linear(768, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 1) # Outputs a single logit for BCE Loss
        )

    def forward(self, x1, x2):
        # Extract embeddings
        emb1 = self.wavlm(x1).last_hidden_state.mean(dim=1)
        emb2 = self.wavlm(x2).last_hidden_state.mean(dim=1)
        
        # Calculate the absolute mathematical difference between the two voices
        diff = torch.abs(emb1 - emb2)
        
        # Pass difference to classifier to predict similarity
        logits = self.classifier(diff)
        return logits

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"🚀 Pushing model to {device}...")
model = SiameseWavLM().to(device)

criterion = nn.BCEWithLogitsLoss()
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-5)

# ==========================================
# 4. TRAINING LOOP WITH GRADIENT ACCUMULATION
# ==========================================
EPOCHS = 3
accumulation_steps = 4 # Simulates a batch size of 8 while only using VRAM for 2

print("\n🔥 Starting Siamese Training...")
for epoch in range(EPOCHS):
    model.train()
    total_loss = 0
    
    progress_bar = tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS}")
    for i, (x1, x2, labels) in enumerate(progress_bar):
        x1, x2, labels = x1.to(device), x2.to(device), labels.to(device).unsqueeze(1)
        
        outputs = model(x1, x2)
        loss = criterion(outputs, labels)
        loss = loss / accumulation_steps
        loss.backward()
        
        if (i + 1) % accumulation_steps == 0:
            optimizer.step()
            optimizer.zero_grad()
            
        total_loss += loss.item() * accumulation_steps
        progress_bar.set_postfix(loss=total_loss/(i+1))

# ==========================================
# 5. EVALUATION & VISUALIZATION (HEADLESS)
# ==========================================
print("\n📊 Running Evaluation...")
model.eval()
all_preds = []
all_labels = []
all_probs = []

with torch.no_grad():
    for x1, x2, labels in tqdm(test_loader, desc="Testing"):
        x1, x2, labels = x1.to(device), x2.to(device), labels.numpy()
        
        logits = model(x1, x2)
        probs = torch.sigmoid(logits).cpu().numpy() # Probability they are SIMILAR (Label 1)
        
        preds = (probs > 0.5).astype(int)
        
        all_preds.extend(preds)
        all_labels.extend(labels)
        all_probs.extend(probs)

all_labels = np.array(all_labels).flatten()
all_preds = np.array(all_preds).flatten()
all_probs = np.array(all_probs).flatten()

# Note: The model predicts "Similarity" (1 = Real/Real, 0 = Real/Fake).
# To convert this into a "Threat Score" (Probability of being Fake), we invert it:
threat_probs = 1.0 - all_probs

print("\n" + "="*50)
print("     VERSION 7 (SIAMESE) EVALUATION REPORT      ")
print("="*50)
print(f"Accuracy: {accuracy_score(all_labels, all_preds) * 100:.2f}%\n")
print(classification_report(all_labels, all_preds, target_names=["Dissimilar (Deepfake Trap)", "Similar (Authentic Pairs)"]))

# Save Plot to Disk for TMUX
plt.figure(figsize=(14, 6))

# Subplot 1: Confusion Matrix
plt.subplot(1, 2, 1)
cm = confusion_matrix(all_labels, all_preds)
sns.heatmap(cm, annot=True, fmt='d', cmap='Purples', 
            xticklabels=["Predicted Deepfake", "Predicted Authentic"], 
            yticklabels=["Actual Deepfake", "Actual Authentic"])
plt.title('V7 Siamese Confusion Matrix')

# Subplot 2: KDE Threat Plot
plt.subplot(1, 2, 2)
# Threat score distribution for Authentic pairs (Should be near 0.0)
sns.kdeplot(threat_probs[all_labels == 1], fill=True, color="mediumseagreen", label="Authentic Pair")
# Threat score distribution for Deepfake pairs (Should be near 1.0)
sns.kdeplot(threat_probs[all_labels == 0], fill=True, color="crimson", label="Deepfake Trap Pair")
plt.title('KDE Plot: Synthetic Threat Identification')
plt.xlabel("Probability of being AI Generated")
plt.ylabel("Density")
plt.legend()

plt.tight_layout()
plot_out = str(BASE_DIR / "v7_siamese_evaluation.png")
plt.savefig(plot_out, dpi=300, bbox_inches='tight')
print(f"\n✅ Success! Evaluation plots safely saved to '{plot_out}'.")

# Save model weights
model_out = str(BASE_DIR / "wavlm_siamese_v7.pth")
torch.save(model.state_dict(), model_out)
print(f"✅ Model weights saved to '{model_out}'.")