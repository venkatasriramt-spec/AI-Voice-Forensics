
'''
This script is a Google Cloud Storage audio preprocessing pipeline. Its purpose is to scan a GCP bucket, find audio files (real/fake voice data), convert them into standardized WAV format (16 kHz, mono), upload the converted files back, and delete the originals.

In simpler words:

It cleans and normalizes an audio dataset stored in Google Cloud so it can be used for things like speech recognition, voice deepfake detection, audio forensics, or ML model training.

'''

import os
import tempfile
import concurrent.futures
import subprocess
from google.cloud import storage
from tqdm import tqdm

# Configuration
PROJECT_ID = "audio-forensics-494616"
BUCKET_NAME = "processed-voice-data-lake-2026"
TARGET_SAMPLE_RATE = "16000"
CHANNELS = "1"
    
# --- THE FIX: Global connection cache ---
# This ensures each worker only connects to GCP once,
# preventing the internal Metadata Server from crashing under load.
_worker_bucket = None

def get_bucket():
    global _worker_bucket
    if _worker_bucket is None:
        client = storage.Client(project=PROJECT_ID)
        _worker_bucket = client.bucket(BUCKET_NAME)
    return _worker_bucket

def process_single_file(blob_name):
    # Skip files immediately without making ANY API calls to Google
    if blob_name.endswith('.wav') or not ("Real Audio" in blob_name or "Fake Audio" in blob_name):
        return ('skip', blob_name, '')

    temp_in_path = None
    temp_out_path = None

    try:
        # Use the shared connection instead of making a new one
        bucket = get_bucket()
        blob = bucket.blob(blob_name)
        
        ext = os.path.splitext(blob_name)[1]
        
        fd_in, temp_in_path = tempfile.mkstemp(suffix=ext)
        fd_out, temp_out_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd_in)
        os.close(fd_out)

        # Download the original blob
        blob.download_to_filename(temp_in_path)
        
        # Use raw FFmpeg for maximum resilience
        command = [
            "ffmpeg", "-y", "-i", temp_in_path,
            "-ar", TARGET_SAMPLE_RATE, "-ac", CHANNELS,
            "-loglevel", "error", temp_out_path
        ]
        
        result = subprocess.run(command, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise Exception(f"FFmpeg decoding failed: {result.stderr.strip()}")
        
        new_blob_name = os.path.splitext(blob_name)[0] + ".wav"
        new_blob = bucket.blob(new_blob_name)
        
        # Upload new and delete old
        new_blob.upload_from_filename(temp_out_path)
        blob.delete()
        
        return ('success', blob_name, '')
        
    except Exception as e:
        return ('error', blob_name, str(e))
    finally:
        # Bulletproof cleanup
        if temp_in_path and os.path.exists(temp_in_path): 
            os.remove(temp_in_path)
        if temp_out_path and os.path.exists(temp_out_path): 
            os.remove(temp_out_path)

def main():
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(BUCKET_NAME)
    
    print(f"Scanning bucket: {BUCKET_NAME}...")
    
    # Gather all file paths
    blobs = client.list_blobs(bucket)
    target_blobs = [blob.name for blob in blobs if "Real Audio" in blob.name or "Fake Audio" in blob.name]
    total_files = len(target_blobs)
    
    print(f"Found {total_files} potential files to process.")
    
    safe_workers = 6 
    print(f"Starting raw FFmpeg multiprocessing with {safe_workers} workers to protect RAM & API limits...\n")
    
    errors = []
    success_count = 0
    skipped_count = 0

    with concurrent.futures.ProcessPoolExecutor(max_workers=safe_workers) as executor:
        results = tqdm(executor.map(process_single_file, target_blobs), total=total_files, desc="Converting Data")
        
        for status, blob_name, error_msg in results:
            if status == 'skip':
                skipped_count += 1
            elif status == 'success':
                success_count += 1
            elif status == 'error':
                errors.append((blob_name, error_msg))

    print("\n" + "="*40)
    print("      CONVERSION SUMMARY")
    print("="*40)
    print(f"Total Files Scanned : {total_files}")
    print(f"Successfully Cleaned: {success_count}")
    print(f"Skipped (Ready)     : {skipped_count}")
    print(f"Failed              : {len(errors)}")
    print("="*40)

    if errors:
        print("\n--- ERROR LOG ---")
        # Only print the first 20 errors to avoid terminal spam
        for bad_file, msg in errors[:20]:
            print(f"[FAIL] {bad_file} --> {msg}")
        if len(errors) > 20:
            print(f"... and {len(errors) - 20} more errors.")

if __name__ == "__main__":
    main()