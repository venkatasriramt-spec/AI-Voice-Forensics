import os
import glob
import torch
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

# ==========================================
# 1. LOAD EMBEDDINGS INTO MEMORY
# ==========================================
CACHE_DIR_REAL = "wavlm_dna_cache/real"
CACHE_DIR_FAKE = "wavlm_dna_cache/fake"

print("⏳ Loading Pre-Computed WavLM Vectors into Memory...")

X_data = []
y_labels = []

# Load Real (Label 0)
real_files = glob.glob(f"{CACHE_DIR_REAL}/*.pt")
for pt_file in tqdm(real_files, desc="Loading Authentic Human DNA"):
    tensor = torch.load(pt_file)
    X_data.append(tensor.numpy())
    y_labels.append(0)

# Load Fake (Label 1)
fake_files = glob.glob(f"{CACHE_DIR_FAKE}/*.pt")
for pt_file in tqdm(fake_files, desc="Loading Synthetic AI DNA"):
    tensor = torch.load(pt_file)
    X_data.append(tensor.numpy())
    y_labels.append(1)

X = np.array(X_data)
y = np.array(y_labels)

print(f"\n📊 Final Matrix Built: {X.shape[0]} valid clips vectorized into {X.shape[1]} (WavLM) features.")

# ==========================================
# 2. XGBOOST TRAINING
# ==========================================
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, stratify=y, random_state=42)

print("\n🔥 Igniting XGBoost Meta-Classifier (Version 8)...")
# We let XGBoost build deep, highly complex trees to map the 768-D space natively
xgb_classifier = xgb.XGBClassifier(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    tree_method="hist", 
    device="cuda" if torch.cuda.is_available() else "cpu",
    random_state=42
)

xgb_classifier.fit(X_train, y_train)

# ==========================================
# 3. EVALUATION & METRICS
# ==========================================
y_pred = xgb_classifier.predict(X_test)
y_proba = xgb_classifier.predict_proba(X_test)[:, 1]

print("\n" + "="*50)
print("     GRAND MODEL VERSION 8 EVALUATION            ")
print("="*50)
print(f"Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%\n")
print(classification_report(y_test, y_pred, target_names=["Authentic Human (0)", "Synthetic AI (1)"]))

# ==========================================
# 4. PLOTTING & SAVING FOR TMUX
# ==========================================
print("\n🎨 Generating Visualizations...")
os.makedirs("v8_production", exist_ok=True)

plt.figure(figsize=(16, 6))

# Plot 1: Confusion Matrix
plt.subplot(1, 2, 1)
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
            xticklabels=["Human", "Synthetic"], 
            yticklabels=["Human", "Synthetic"],
            annot_kws={"size": 14})
plt.title('V8 Confusion Matrix (WavLM Pure)', fontsize=16)
plt.ylabel('Actual', fontsize=12)
plt.xlabel('Predicted', fontsize=12)

# Plot 2: KDE Probability Distribution
plt.subplot(1, 2, 2)
sns.kdeplot(y_proba[y_test == 0], fill=True, color="mediumseagreen", label="Authentic Human (0)", alpha=0.6)
sns.kdeplot(y_proba[y_test == 1], fill=True, color="crimson", label="Synthetic Audio (1)", alpha=0.6)
plt.axvline(0.5, color='black', linestyle='--', label='Decision Boundary')
plt.title('KDE Plot: Model Confidence Isolation', fontsize=16)
plt.xlabel('Probability of being Synthetic', fontsize=12)
plt.ylabel('Density', fontsize=12)
plt.legend()

plt.tight_layout()

# Save the plots to a file instead of displaying them (Crucial for Tmux/Headless Servers)
plot_path = "v8_production/v8_evaluation_plots.png"
plt.savefig(plot_path, dpi=300, bbox_inches='tight')
print(f"✅ Plots successfully rendered and saved to: {plot_path}")

# Save the actual XGBoost Model
model_path = "v8_production/v8_xgboost_wavlm.json"
xgb_classifier.save_model(model_path)
print(f"✅ Model successfully saved to: {model_path}")