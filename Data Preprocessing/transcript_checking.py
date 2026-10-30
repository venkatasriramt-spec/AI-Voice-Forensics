import os
import glob
import time
import threading
import pandas as pd
import whisper
import assemblyai as aai
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
from tqdm.auto import tqdm

# ---------------------------------------------------------
# 1. API Keys & Configurations
# ---------------------------------------------------------
aai.settings.api_key = "YOUR_ASSEMBLY_AI_API_KEY"

from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent

LANGS_ASSEMBLY = ["English", "German", "French", "Spanish", "Chinese", "Catalan"]
LANGS_WHISPER = ["Bengali"]

SOURCE_DIR = REPO_ROOT / "data" / "multilingual_base_corpus"
if not SOURCE_DIR.exists():
    SOURCE_DIR = REPO_ROOT / "local_data"

REPORTS_DIR = BASE_DIR / "transcript_reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

print("Loading Whisper model onto GPU for Bengali processing...")
whisper_model = whisper.load_model("small")
gpu_lock = threading.Lock() 

# ---------------------------------------------------------
# 2. Transcription Checkers
# ---------------------------------------------------------
def is_assembly_failed(file_path):
    retries = 3
    for attempt in range(retries):
        try:
            config = aai.TranscriptionConfig(speech_models=["universal-3-pro", "universal-2"])
            transcriber = aai.Transcriber(config=config)
            transcript = transcriber.transcribe(file_path)
            
            if transcript.status == aai.TranscriptStatus.error:
                return True
            if not transcript.text or transcript.text.strip() == "":
                return True
                
            return False 
            
        except Exception as e:
            error_msg = str(e).lower()
            if "429" in error_msg or "too many requests" in error_msg:
                time.sleep((attempt + 1) * 3) 
            elif "402" in error_msg or "payment required" in error_msg:
                raise RuntimeError("AssemblyAI credits exhausted!")
            else:
                return True 
    return True

def is_whisper_failed(file_path):
    try:
        with gpu_lock:
            result = whisper_model.transcribe(file_path, language="bn")
            text = result.get("text", "").strip()
            if not text:
                return True
            return False
    except Exception:
        return True

# ---------------------------------------------------------
# 3. Parallel Language Processor
# ---------------------------------------------------------
def process_language(lang, position_idx):
    real_audio_folder = os.path.join(SOURCE_DIR, lang, "Real Audio")
    fake_audio_folder = os.path.join(SOURCE_DIR, lang, "Fake Audio")
    
    real_files = sorted(glob.glob(os.path.join(real_audio_folder, "*.wav")))
    fake_files = sorted(glob.glob(os.path.join(fake_audio_folder, "*.wav")))
    
    all_files = real_files + fake_files
    total_files = len(all_files)
    
    if total_files == 0:
        return
        
    failed_reals = []
    failed_fakes = []
    
    pbar = tqdm(total=total_files, desc=f"{lang:<10}", position=position_idx, leave=True, unit="file")
    
    try:
        if lang in LANGS_ASSEMBLY:
            def process_file(file_path):
                is_failed = is_assembly_failed(file_path)
                return file_path, is_failed
                
            with ThreadPoolExecutor(max_workers=5) as file_executor:
                # Submit tasks iteratively to save RAM
                futures = {file_executor.submit(process_file, f): f for f in all_files}
                
                for future in as_completed(futures):
                    file_path = futures[future]
                    try:
                        # TIMEOUT FIX: If network hangs for >3 minutes, kill the future
                        returned_path, is_failed = future.result(timeout=180)
                        if is_failed:
                            filename = os.path.basename(returned_path)
                            if "Real Audio" in returned_path:
                                failed_reals.append(filename)
                            else:
                                failed_fakes.append(filename)
                    except TimeoutError:
                        # Catch the network deadlock and mark as failed
                        filename = os.path.basename(file_path)
                        tqdm.write(f"⏳ TIMEOUT: {filename} hung on network. Marking as failed.")
                        if "Real Audio" in file_path:
                            failed_reals.append(filename)
                        else:
                            failed_fakes.append(filename)
                    except Exception as e:
                        # Catch unexpected API errors (like exhausted credits)
                        filename = os.path.basename(file_path)
                        tqdm.write(f"⚠️ ERROR on {filename}: {str(e)}")
                        if "Real Audio" in file_path:
                            failed_reals.append(filename)
                        else:
                            failed_fakes.append(filename)
                            
                    pbar.update(1)
                    
        elif lang in LANGS_WHISPER:
            for file_path in all_files:
                is_failed = is_whisper_failed(file_path)
                if is_failed:
                    filename = os.path.basename(file_path)
                    if "Real Audio" in file_path:
                        failed_reals.append(filename)
                    else:
                        failed_fakes.append(filename)
                pbar.update(1)

    except Exception as critical_error:
        tqdm.write(f"🚨 CRITICAL ERROR in {lang} thread: {critical_error}")
        
    finally:
        # FINALLY FIX: This guarantees the CSV saves even if the script crashes or is cancelled
        pbar.close()
        max_len = max(len(failed_reals), len(failed_fakes))
        
        real_col = failed_reals + [""] * (max_len - len(failed_reals))
        fake_col = failed_fakes + [""] * (max_len - len(failed_fakes))
        
        df = pd.DataFrame({
            "Real Not working": real_col,
            "Fake Not working": fake_col
        })
        
        output_filename = REPORTS_DIR / f"{lang}_failed_transcripts.csv"
        df.to_csv(str(output_filename), index=False)
        tqdm.write(f"💾 Saved progress for {lang} to {output_filename}")

# ---------------------------------------------------------
# 4. Main Execution Engine
# ---------------------------------------------------------
def main():
    all_active_langs = LANGS_ASSEMBLY + LANGS_WHISPER
    print(f"\n🚀 Initiating Fault-Tolerant Audit for {len(all_active_langs)} Languages...\n")
    
    with ThreadPoolExecutor(max_workers=len(all_active_langs)) as lang_executor:
        futures = []
        for idx, lang in enumerate(all_active_langs):
            futures.append(lang_executor.submit(process_language, lang, idx))
            
        for future in as_completed(futures):
            try:
                future.result() 
            except Exception as e:
                print(f"Thread collapsed with error: {e}")
            
    print("\n✅ Audit Complete! All CSV files have been securely saved.")

if __name__ == "__main__":
    main()