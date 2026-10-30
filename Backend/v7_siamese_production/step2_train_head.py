import os
import glob
import random
import torch
import torch.nn as nn
import numpy as np
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.model_selection import train_test_split
import matplotlib
matplotlib.use('Agg') 
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[1]

CACHE_DIR = REPO_ROOT / "cache" / "v7_wavlm_dna_cache"
if not CACHE_DIR.exists():
    CACHE_DIR = REPO_ROOT / "wavlm_dna_cache"

print(f"🔍 Loading pre-computed DNA vectors into RAM from {CACHE_DIR}...")

# 1. LOAD INTO RAM & MAP PAIRS
all_pt_files = glob.glob(f"{CACHE_DIR}/*.pt")
real_dna_index = {}

# Separate reals and fakes based on filename
for pt_path in all_pt_files:
    filename = os.path.basename(pt_path)
    if not filename.startswith("fake_"):
        real_dna_index[filename] = torch.load(pt_path)

positive_pairs = []
negative_pairs = []
real_filenames_list = list(real_dna_index.keys())

for pt_path in all_pt_files:
    filename = os.path.basename(pt_path)
    if filename.startswith("fake_"):
        real_filename = filename.replace("fake_", "")
        
        if real_filename in real_dna_index:
            # Pre-load the tensors directly into memory
            fake_tensor = torch.load(pt_path)
            real_tensor = real_dna_index[real_filename]
            random_real_tensor = real_dna_index[random.choice(real_filenames_list)]
            
            negative_pairs.append((real_tensor, fake_tensor, 0.0))
            positive_pairs.append((real_tensor, random_real_tensor, 1.0))

all_pairs = positive_pairs + negative_pairs
random.seed(42)
random.shuffle(all_pairs)
print(f"✅ Mapped {len(negative_pairs)} Negative & {len(positive_pairs)} Positive pairs in Memory.")

train_pairs, test_pairs = train_test_split(all_pairs, test_size=0.15, random_state=42)

# 2. IN-MEMORY DATASET
class CachedSiameseDataset(Dataset):
    def __init__(self, data_pairs):
        self.data_pairs = data_pairs

    def __len__(self):
        return len(self.data_pairs)

    def __getitem__(self, idx):
        emb1, emb2, label = self.data_pairs[idx]
        return emb1, emb2, torch.tensor(label, dtype=torch.float32)

# Massive batch sizes because RAM and VRAM are practically empty
train_loader = DataLoader(CachedSiameseDataset(train_pairs), batch_size=256, shuffle=True)
test_loader = DataLoader(CachedSiameseDataset(test_pairs), batch_size=256, shuffle=False)

# 3. SIAMESE HEAD ARCHITECTURE
class SiameseHead(nn.Module):
    def __init__(self):
        super().__init__()
        self.classifier = nn.Sequential(
            nn.Linear(768, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 1)
        )

    def forward(self, emb1, emb2):
        # We only pass the pre-computed embeddings, completely skipping WavLM!
        diff = torch.abs(emb1 - emb2)
        return self.classifier(diff)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = SiameseHead().to(device)

criterion = nn.BCEWithLogitsLoss()
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)

# 4. LIGHTNING FAST TRAINING
EPOCHS = 30 # Increased to let the model reach peak accuracy!

print("\n⚡ Starting Hyper-Speed Siamese Training...")
for epoch in range(EPOCHS):
    model.train()
    total_loss = 0
    
    for emb1, emb2, labels in train_loader:
        emb1, emb2, labels = emb1.to(device), emb2.to(device), labels.to(device).unsqueeze(1)
        
        optimizer.zero_grad()
        outputs = model(emb1, emb2)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
    print(f"Epoch {epoch+1}/{EPOCHS} - Loss: {total_loss/len(train_loader):.4f}")

# 5. EVALUATION
print("\n📊 Running Evaluation...")
model.eval()
all_preds, all_labels, all_probs = [], [], []

with torch.no_grad():
    for emb1, emb2, labels in test_loader:
        emb1, emb2, labels = emb1.to(device), emb2.to(device), labels.numpy()
        
        logits = model(emb1, emb2)
        probs = torch.sigmoid(logits).cpu().numpy()
        
        all_preds.extend((probs > 0.5).astype(int))
        all_labels.extend(labels)
        all_probs.extend(probs)

threat_probs = 1.0 - np.array(all_probs).flatten()
all_labels = np.array(all_labels).flatten()

print("\n" + "="*50)
print(f"Accuracy: {accuracy_score(all_labels, all_preds) * 100:.2f}%\n")
print(classification_report(all_labels, all_preds, target_names=["Deepfake", "Authentic"]))

plt.figure(figsize=(14, 6))
plt.subplot(1, 2, 1)
sns.heatmap(confusion_matrix(all_labels, np.array(all_preds).flatten()), annot=True, fmt='d', cmap='Purples')
plt.title('V7 Cache Confusion Matrix')

plt.subplot(1, 2, 2)
sns.kdeplot(threat_probs[all_labels == 1], fill=True, color="mediumseagreen", label="Authentic")
sns.kdeplot(threat_probs[all_labels == 0], fill=True, color="crimson", label="Deepfake")
plt.title('Threat Signature Analysis')
plt.legend()

plt.tight_layout()
eval_plot_path = BASE_DIR / "v7_siamese_evaluation.png"
plt.savefig(str(eval_plot_path), dpi=300, bbox_inches='tight')

weights_path = BASE_DIR / "wavlm_siamese_head_only.pth"
torch.save(model.state_dict(), str(weights_path))
print(f"✅ Weights saved to '{weights_path.name}'.")