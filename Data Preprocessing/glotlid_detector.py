import pandas as pd
import fasttext
import os
import subprocess
from huggingface_hub import hf_hub_download

# --- Configurations ---
BUCKET_PATH = "gs://mozilla-voice-data-lake-2026/real voice"

# GlotLID uses ISO 639-3 codes (3 letters).
# We map Chinese to both 'zho' and 'cmn' as it can be classified as either Mandarin or general Chinese.
LANGUAGES = {
    'English': {'codes': ['eng'], 'file': 'english_audio.tar.gz'},
    'French': {'codes': ['fra'], 'file': 'french_audio.tar.gz'},
    'German': {'codes': ['deu'], 'file': 'german_audio.tar.gz'},
    'Spanish': {'codes': ['spa'], 'file': 'spanish_audio.tar.gz'},
    'Catalan': {'codes': ['cat'], 'file': 'catalan_audio.tar.gz'},
    'Esperanto': {'codes': ['epo'], 'file': 'esperanto_audio.tar.gz'},
    'Chinese': {'codes': ['zho', 'cmn'], 'file': 'chinese_audio.tar.gz'}, 
    'Bengali': {'codes': ['ben'], 'file': 'bengali_audio.tar.gz'},
    'Belarusian': {'codes': ['bel'], 'file': 'belarusian_audio.tar.gz'},
    'Pashto': {'codes': ['pus','pbu','pbt'], 'file': 'pashto_audio.tar.gz'},
    'Kinyarwanda': {'codes': ['kin'], 'file': 'kinyarwanda_audio.tar.gz'}
}

def setup_glotlid():
    """Downloads the GlotLID model (~800MB) from Hugging Face if not cached."""
    print("Fetching GlotLID model (this may take a minute on the first run)...")
    # This automatically downloads and caches the model file locally
    model_path = hf_hub_download(repo_id="cis-lmu/glotlid", filename="model.bin")
    return fasttext.load_model(model_path)

def process_language(lang_name, lang_info, model):
    print(f"\n{'='*50}")
    print(f"--- Processing {lang_name} ---")
    print(f"{'='*50}")
    
    tar_file = lang_info['file']
    expected_codes = lang_info['codes']
    gcs_uri = f"{BUCKET_PATH}/{tar_file}"
    extracted_tsv = f"{lang_name}_glotlid_temp.tsv"
    
    # 1. Smart Extraction
    print(f"Extracting TSV from {tar_file} via stream...")
    cmd = f'gsutil cat "{gcs_uri}" | tar -xzO --wildcards "*/validated_sentences.tsv" > "{extracted_tsv}"'
    
    try:
        subprocess.run(cmd, shell=True, check=True, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        print(f"Failed to extract from {tar_file}.")
        print(f"Error Details: {e.stderr.decode('utf-8', errors='ignore')}")
        return

    # 2. Load and Clean Data
    print("Analyzing sentences with GlotLID...")
    try:
        df = pd.read_csv(extracted_tsv, sep='\t', usecols=['sentence'])
    except Exception as e:
        print(f"Failed to read the extracted TSV: {e}")
        if os.path.exists(extracted_tsv): os.remove(extracted_tsv)
        return

    invalid_count = 0
    invalid_examples = []
    sentences = [str(s).replace('\n', ' ') for s in df['sentence'].tolist()]
    
    # 3. Batch Prediction
    predictions, _ = model.predict(sentences)

    for i, pred in enumerate(predictions):
        # GlotLID outputs in the format '__label__eng_Latn'
        full_label = pred[0].replace('__label__', '')
        # We only want the 3-letter language code, not the script (e.g., 'eng' from 'eng_Latn')
        detected_lang = full_label.split('_')[0] 
        
        if detected_lang not in expected_codes:
            invalid_count += 1
            if len(invalid_examples) < 5:
                invalid_examples.append(f"[{detected_lang}] {sentences[i][:100]}...")

    # 4. Output Results
    total_rows = len(sentences)
    print(f"Total Sentences: {total_rows:,}")
    print(f"Invalid Rows Found: {invalid_count:,}")
    if total_rows > 0:
        print(f"Error Rate: {(invalid_count/total_rows)*100:.2f}%")
    
    if invalid_examples:
        print("\nSample Invalid Sentences (Format: [Detected Lang] Sentence):")
        for ex in invalid_examples:
            print(f"  - {ex}")
            
    # 5. Cleanup
    if os.path.exists(extracted_tsv):
        os.remove(extracted_tsv)
        print("\nCleaned up temporary TSV file.")

def main():
    model = setup_glotlid()
    for lang_name, lang_info in LANGUAGES.items():
        process_language(lang_name, lang_info, model)
    print("\nAll languages processed successfully with GlotLID.")

if __name__ == "__main__":
    main()