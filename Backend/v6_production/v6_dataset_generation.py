import os
import glob
import shutil
from tqdm.auto import tqdm

from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[1]

# ---------------------------------------------------------
# 1. Folder Configurations
# ---------------------------------------------------------
FAKES_DIR = REPO_ROOT / "data" / "elevenlabs_v3_synthetic_speech"
if not FAKES_DIR.exists():
    FAKES_DIR = REPO_ROOT / "local_data_v6_fakes"

ORIGINAL_DIR = REPO_ROOT / "data" / "multilingual_base_corpus"
if not ORIGINAL_DIR.exists():
    ORIGINAL_DIR = REPO_ROOT / "local_data"

NEW_DATASET_DIR = REPO_ROOT / "data" / "v6_experiment_data"

# The languages you actively generated fakes for
LANGUAGES = ["English", "German", "French", "Spanish", "Chinese", "Catalan", "Bengali"]

print(f"Creating 1:1 contrastive dataset in '{NEW_DATASET_DIR}'...\n")

# ---------------------------------------------------------
# 2. Execution Loop
# ---------------------------------------------------------
for lang in LANGUAGES:
    print(f"=== Isolating pairs for: {lang} ===")
    
    # Define where to pull from
    source_fake_dir = os.path.join(FAKES_DIR, lang.lower(), "fake")
    source_real_dir = os.path.join(ORIGINAL_DIR, lang, "Real Audio")
    
    # Define where to push to
    target_fake_dir = os.path.join(NEW_DATASET_DIR, lang.lower(), "fake")
    target_real_dir = os.path.join(NEW_DATASET_DIR, lang.lower(), "real")
    
    # Create the new clean directories
    os.makedirs(target_fake_dir, exist_ok=True)
    os.makedirs(target_real_dir, exist_ok=True)
    
    # Grab all the successfully generated fakes
    fake_files = glob.glob(os.path.join(source_fake_dir, "*.wav"))
    
    if not fake_files:
        print(f"⚠️ No fake files found in {source_fake_dir}. Skipping.\n")
        continue
        
    # Copy both the fake and its exact matching real file
    for fake_path in tqdm(fake_files, desc=f"Mapping {lang}", unit="pair"):
        # The fake filename looks like "fake_filename.wav"
        fake_filename = os.path.basename(fake_path)
        
        # Strip the "fake_" prefix to find the original real filename
        real_filename = fake_filename.replace("fake_", "", 1)
        
        # Construct the path to where the real file should be
        real_path = os.path.join(source_real_dir, real_filename)
        
        # Construct destination paths
        dest_fake_path = os.path.join(target_fake_dir, fake_filename)
        dest_real_path = os.path.join(target_real_dir, real_filename)
        
        # 1. Copy the Fake File (if not already copied)
        if not os.path.exists(dest_fake_path):
            shutil.copy2(fake_path, dest_fake_path)
            
        # 2. Copy the Real File
        if os.path.exists(real_path):
            if not os.path.exists(dest_real_path):
                shutil.copy2(real_path, dest_real_path)
        else:
            # A safety net just in case the original file was manually deleted
            tqdm.write(f"❌ ERROR: Could not find original real file for {fake_filename}")

    print("\n")

print(f"✅ Success! Your perfectly balanced 1:1 dataset is ready in '{NEW_DATASET_DIR}'.")