import os
import glob
import random
import time
import whisper
import assemblyai as aai
from elevenlabs.client import ElevenLabs
from tqdm.auto import tqdm

# ---------------------------------------------------------
# 1. API Keys & Configurations
# ---------------------------------------------------------
aai.settings.api_key = "YOUR_ASSEMBLY_AI_API_KEY"
ELEVENLABS_API_KEY = "YOUR_ELEVENLABS_API_KEY"

el_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

TARGET_CLIP_COUNT = 1100  # The new hard limit per language

# ---------------------------------------------------------
# 2. Folder Setup & Language Routing
# ---------------------------------------------------------
SOURCE_DIR = "local_data"
TARGET_DIR = "local_data_v6_fakes"

LANGS_ASSEMBLY = ["English", "German", "French", "Spanish", "Chinese","Catalan"]    #  temporarily exculded
LANGS_WHISPER = ["Bengali"]
IGNORE_LANGS = ["Kinyarwanda", "Pashto"]

print("Loading Whisper model onto GPU...")
whisper_model = whisper.load_model("small")

# ---------------------------------------------------------
# 3. Dynamic Premade Voice Fetching
# ---------------------------------------------------------
print("Fetching numerous pre-existing ElevenLabs voices...")

all_voices_response = el_client.voices.get_all()
all_voices = all_voices_response.voices

good_voice_ids = [v.voice_id for v in all_voices if v.category == "premade"]

if not good_voice_ids:
    print("⚠️ 'Premade' category not found. Using all available account voices.")
    good_voice_ids = [v.voice_id for v in all_voices]

print(f"✅ Successfully loaded {len(good_voice_ids)} distinct natural voices for generation.")

# ---------------------------------------------------------
# 4. Transcription Functions
# ---------------------------------------------------------
def transcribe_assembly(file_path):
    config = aai.TranscriptionConfig(speech_models=["universal-3-pro", "universal-2"])
    transcriber = aai.Transcriber(config=config)
    transcript = transcriber.transcribe(file_path)
    
    if transcript.status == aai.TranscriptStatus.error:
        raise RuntimeError(f"Transcription failed: {transcript.error}")
    return transcript.text

def transcribe_whisper(file_path):
    result = whisper_model.transcribe(file_path, language="bn")
    return result["text"]

# ---------------------------------------------------------
# 5. Standard Audio Generation Function (With DDoS Protection)
# ---------------------------------------------------------
def generate_elevenlabs_audio(text, output_path, voice_id, filename, retries=3):
    """Generates audio with exponential backoff to handle rate limits."""
    for attempt in range(retries):
        try:
            audio_generator = el_client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id="eleven_v3" 
            )
            
            with open(output_path, "wb") as f:
                for chunk in audio_generator:
                    f.write(chunk)
            return True
            
        except Exception as e:
            error_msg = str(e).lower()
            # If ElevenLabs flags us for hitting the API too fast (HTTP 429)
            if "429" in error_msg or "too many requests" in error_msg:
                sleep_time = (attempt + 1) * 3  # Wait 3s, then 6s, then 9s
                tqdm.write(f"⏳ Rate limit hit on {filename}. Server cooling down for {sleep_time}s...")
                time.sleep(sleep_time)
            else:
                tqdm.write(f"❌ ElevenLabs API Error on {filename}: {e}")
                return False
                
    tqdm.write(f"❌ Failed to generate {filename} after {retries} attempts.")
    return False

# ---------------------------------------------------------
# 6. Smart Top-Up Execution Loop
# ---------------------------------------------------------
os.makedirs(TARGET_DIR, exist_ok=True)
all_active_langs = LANGS_ASSEMBLY + LANGS_WHISPER

for lang in all_active_langs:
    if lang in IGNORE_LANGS:
        continue
        
    print(f"\n=== Checking Language: {lang} ===")
    source_audio_folder = os.path.join(SOURCE_DIR, lang, "Real Audio")
    target_lang_folder = os.path.join(TARGET_DIR, lang.lower(), "fake")
    os.makedirs(target_lang_folder, exist_ok=True)
    
    # 1. Count existing fake files securely
    existing_fakes = glob.glob(os.path.join(target_lang_folder, "*.wav"))
    current_count = len(existing_fakes)
    
    if current_count >= TARGET_CLIP_COUNT:
        print(f"✅ {lang} already has {current_count} fakes. Target of {TARGET_CLIP_COUNT} reached. Skipping.")
        continue
        
    missing_count = TARGET_CLIP_COUNT - current_count
    print(f"⚠️ {lang} currently has {current_count} fakes. Generating the missing {missing_count} audios.")
    
    # 2. Get original source files
    search_pattern = os.path.join(source_audio_folder, "*.wav") 
    all_files = sorted(glob.glob(search_pattern))
    
    # 3. Generate exactly the amount needed
    successful_generations = 0
    pbar = tqdm(total=missing_count, desc=f"Topping up {lang}", unit="clip")
    
    for audio_file in all_files:
        # Stop exactly when we reach the target
        if successful_generations >= missing_count:
            break
            
        filename = os.path.basename(audio_file)
        out_file = os.path.join(target_lang_folder, f"fake_{filename}")
        
        # Smart Resume: If file already exists, immediately skip to the next
        if os.path.exists(out_file):
            continue
            
        text = ""
        try:
            if lang in LANGS_ASSEMBLY:
                text = transcribe_assembly(audio_file)
            elif lang in LANGS_WHISPER:
                text = transcribe_whisper(audio_file)
        except Exception as e:
            tqdm.write(f"⚠️ STT Error on {filename}: {e}")
            continue 
            
        text = text.strip() if text else ""
        if not text:
            tqdm.write(f"⚠️ No text extracted for {filename}. Skipping.")
            continue
            
        # Select a random premium voice
        selected_voice_id = random.choice(good_voice_ids)
            
        # Generate the audio with rate-limit protection
        success = generate_elevenlabs_audio(text, out_file, selected_voice_id, filename)
        
        if success:
            successful_generations += 1
            pbar.update(1)
            
        # Standard baseline sleep to keep standard request rate below ElevenLabs thresholds
        time.sleep(0.5)

    pbar.close()

print(f"\n🚀 Smart Top-Up Complete! All languages now have {TARGET_CLIP_COUNT} synthesized clips.")