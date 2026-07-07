'''
This code is a multilingual synthetic voice dataset generation pipeline designed for audio deepfake detection / voice forensics model training.

It downloads real speech data from a Mozilla Voice dataset stored in Google Cloud Storage, extracts real audio samples, generates AI-created fake speech using multiple Text-to-Speech (TTS) engines, and stores both real and fake audio in a structured dataset format.

'''

import pandas as pd
import fasttext
import os
import subprocess
import time
import torch
import scipy.io.wavfile
import asyncio
import threading
import edge_tts
from google.cloud import storage
from huggingface_hub import hf_hub_download
from transformers import VitsModel, AutoTokenizer

# --- PYTORCH 2.6 HOTFIX FOR COQUI TTS ---
_original_load = torch.load
def _patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_load(*args, **kwargs)
torch.load = _patched_load
# ----------------------------------------
from TTS.api import TTS

# --- Auto-accept Coqui XTTS Terms of Service ---
os.environ["COQUI_TOS_AGREED"] = "1"

# --- Configurations ---
OLD_BUCKET = "gs://mozilla-voice-data-lake-2026/real_voices_backup_compressed"
NEW_BUCKET = "gs://processed-voice-data-lake-2026"
LOCAL_EXTRACT_DIR = "./temp_extract"
XTTS_SPEAKER = "Ana Florence" 

LANGUAGES = {
    'French': {'glotlid': ['fra'], 'tar': 'french_audio.tar.gz', 'engine': 'xtts', 'tts_code': 'fr'},
    'German': {'glotlid': ['deu'], 'tar': 'german_audio.tar.gz', 'engine': 'xtts', 'tts_code': 'de'},
    'Spanish': {'glotlid': ['spa'], 'tar': 'spanish_audio.tar.gz', 'engine': 'xtts', 'tts_code': 'es'},
    'Catalan': {'glotlid': ['cat'], 'tar': 'catalan_audio.tar.gz', 'engine': 'mms', 'mms_id': 'facebook/mms-tts-cat'},
    'Bengali': {'glotlid': ['ben'], 'tar': 'bengali_audio.tar.gz', 'engine': 'mms', 'mms_id': 'facebook/mms-tts-ben'},
    'Kinyarwanda': {'glotlid': ['kin'], 'tar': 'kinyarwanda_audio.tar.gz', 'engine': 'mms', 'mms_id': 'facebook/mms-tts-kin'},
    
    'Chinese': {'glotlid': ['zho', 'cmn'], 'tar': 'chinese_audio.tar.gz', 'engine': 'edge', 'voice': 'zh-CN-XiaoxiaoNeural'},
    'Pashto': {'glotlid': ['pus', 'pbt', 'pbu'], 'tar': 'pashto_audio.tar.gz', 'engine': 'edge', 'voice': 'ps-AF-LatifaNeural'}
}

# --- Initialization ---
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Hardware accelerated on: {device.upper()}")

print("Loading GlotLID model...")
glotlid_path = hf_hub_download(repo_id="cis-lmu/glotlid", filename="model.bin")
glotlid_model = fasttext.load_model(glotlid_path)

# We load XTTS just in case, though it won't be used for Edge languages
print("Loading XTTSv2 model to VRAM...")
xtts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

def download_and_extract(tar_filename):
    os.makedirs(LOCAL_EXTRACT_DIR, exist_ok=True)
    gcs_uri = f"{OLD_BUCKET}/{tar_filename}"
    local_tar = os.path.join(LOCAL_EXTRACT_DIR, tar_filename)
    
    print(f"  -> Downloading {tar_filename} to disk...")
    subprocess.run(f'gsutil cp "{gcs_uri}" "{local_tar}"', shell=True, check=True)
    
    print("  -> Unzipping 'clips' and 'validated_sentences.tsv'...")
    extract_cmd = f'tar -xzf "{local_tar}" -C "{LOCAL_EXTRACT_DIR}" --wildcards "*/clips" "*/validated_sentences.tsv"'
    subprocess.run(extract_cmd, shell=True, check=True)
    
    os.remove(local_tar)

def find_extracted_paths():
    clips_dir = None
    tsv_path = None
    for root, dirs, files in os.walk(LOCAL_EXTRACT_DIR):
        if 'clips' in dirs:
            clips_dir = os.path.join(root, 'clips')
        if 'validated_sentences.tsv' in files:
            tsv_path = os.path.join(root, 'validated_sentences.tsv')
    return clips_dir, tsv_path

def background_upload_task(clips_dir, target_uri, selected_files):
    chunk_size = 1000
    for i in range(0, len(selected_files), chunk_size):
        chunk = selected_files[i:i + chunk_size]
        file_paths = " ".join([f'"{os.path.join(clips_dir, fname)}"' for fname in chunk])
        subprocess.run(f'gsutil -m cp {file_paths} "{target_uri}"', shell=True, stdout=subprocess.DEVNULL)

def upload_first_5000_real_audio(clips_dir, lang_name, num_samples=5000):
    target_uri = f"{NEW_BUCKET}/{lang_name}/Real Audio/"
    print(f"  -> [BACKGROUND TASK STARTED] Syncing the first {num_samples} Real Audio files...")
    
    all_files = [f for f in os.listdir(clips_dir) if f.endswith('.mp3')]
    selected_files = all_files[:num_samples]
    
    thread = threading.Thread(target=background_upload_task, args=(clips_dir, target_uri, selected_files))
    thread.start()
    return thread

def get_valid_sentences(tsv_path, expected_codes, num_samples=5000): 
    try:
        df = pd.read_csv(tsv_path, sep='\t', usecols=['sentence'])
    except Exception as e:
        print(f"  -> FATAL ERROR reading TSV: {e}")
        return []
        
    sentences = [str(s).replace('\n', ' ') for s in df['sentence'].tolist()]
    valid_sentences = []
    predictions, _ = glotlid_model.predict(sentences)
    
    for i, pred in enumerate(predictions):
        detected_lang = pred[0].replace('__label__', '').split('_')[0] 
        if detected_lang in expected_codes:
            valid_sentences.append(sentences[i])
            if len(valid_sentences) == num_samples:
                break
            
    return valid_sentences

# FIXED: Added robust retry logic to survive Microsoft Server drops
async def generate_edge_tts(text, voice, output_path):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(output_path)
            return  # Success
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"      [!] API connection dropped. Retrying in 5 seconds... (Attempt {attempt+1}/{max_retries})")
                await asyncio.sleep(5)
            else:
                print(f"      [X] Fatal Error after 3 attempts: {e}")
                raise e

def generate_fake_audio(valid_sentences, lang_name, lang_info):
    os.makedirs("temp_fakes", exist_ok=True)
    engine = lang_info['engine']
    
    print(f"  -> [FOREGROUND TASK STARTED] Generating {len(valid_sentences)} Fake Audio clips using {engine.upper()}...")
    
    mms_model, tokenizer = None, None
    if engine == 'mms':
        tokenizer = AutoTokenizer.from_pretrained(lang_info['mms_id'])
        mms_model = VitsModel.from_pretrained(lang_info['mms_id']).to(device)

    for i, sentence in enumerate(valid_sentences):
        file_ext = "mp3" if engine == 'edge' else "wav"
        file_name = f"fake_{lang_name.lower()}_{engine}_{i+1}.{file_ext}"
        local_path = os.path.join("temp_fakes", file_name)
        
        if engine == 'xtts':
            xtts_model.tts_to_file(
                text=sentence, 
                speaker=XTTS_SPEAKER, 
                language=lang_info['tts_code'], 
                file_path=local_path
            )
            
        elif engine == 'mms':
            inputs = tokenizer(sentence, return_tensors="pt").to(device)
            with torch.no_grad():
                output = mms_model(**inputs).waveform
            audio_data = output[0].cpu().numpy()
            scipy.io.wavfile.write(local_path, rate=mms_model.config.sampling_rate, data=audio_data)
            
        elif engine == 'edge':
            asyncio.run(generate_edge_tts(sentence, lang_info['voice'], local_path))
            time.sleep(0.5) # Sleep half a second to prevent rate-limiting

        target_uri = f"{NEW_BUCKET}/{lang_name}/Fake Audio/{file_name}"
        subprocess.run(f'gsutil cp "{local_path}" "{target_uri}"', shell=True, check=True, stdout=subprocess.DEVNULL)
        os.remove(local_path)
        
    if engine == 'mms':
        del mms_model
        del tokenizer
        torch.cuda.empty_cache()

def cleanup_disk():
    print("  -> Cleaning up local VM disk...")
    subprocess.run(f'rm -rf "{LOCAL_EXTRACT_DIR}"', shell=True)

def main():
    for lang_name, lang_info in LANGUAGES.items():
        print(f"\n{'='*60}\n=== Processing {lang_name} ===\n{'='*60}")
        
        download_and_extract(lang_info['tar'])
        clips_dir, tsv_path = find_extracted_paths()
        
        if not clips_dir or not tsv_path:
            print("  -> ERROR: Could not locate 'clips' or 'validated_sentences.tsv'. Skipping.")
            cleanup_disk()
            continue

        print("  -> Filtering sentences with GlotLID...")
        valid_sentences = get_valid_sentences(tsv_path, lang_info['glotlid'])
        
        upload_thread = upload_first_5000_real_audio(clips_dir, lang_name)
        
        generate_fake_audio(valid_sentences, lang_name, lang_info)
        
        print("  -> Fake Audio complete. Waiting for Real Audio background upload to finish...")
        upload_thread.join()  
        print("  -> [BACKGROUND TASK COMPLETE] Real Audio uploaded successfully.")
            
        cleanup_disk()

    print("\n" + "="*60 + "\nPIPELINE COMPLETE.\n" + "="*60)

if __name__ == "__main__":
    main()