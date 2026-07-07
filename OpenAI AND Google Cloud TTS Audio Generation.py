"""
Multi-Vendor Deepfake Synthesis & Degradation Pipeline
------------------------------------------------------
This pipeline creates a robust 130-file test dataset to evaluate the final 
Audio Forensics Meta-Classifier against unseen, state-of-the-art TTS engines.

PIPELINE MECHANICS:
1. Data Ingestion: Reads 20 authentic sentences per language from our CSV dataset (synthetic_booster_validated_sentences.csv).
2. Vendor Routing: 
   - Sentences 1-10 are sent to Google Cloud TTS (using high-fidelity Neural2 
     and WaveNet models depending on language availability).
   - Sentences 11-20 are sent to OpenAI's 'Nova' voice (tts-1-hd model).
   - *Note: Bengali is explicitly excluded from OpenAI due to lack of support.
3. The Augmentation Engine (save_with_noise):
   To prevent our forensics model from simply learning that "no background noise 
   equals AI," we intercept the raw bytes from the APIs. We load them into an 
   array, calculate the maximum amplitude, and inject a randomized threshold 
   of white noise. We then export the "dirty" file.
4. Output: Saves all files uniformly to the './synthetic_booster_pack' directory.
------------------------------------------------------
"""
import os
import time
import pandas as pd
import numpy as np
import librosa
import soundfile as sf
from openai import OpenAI
from google.cloud import texttospeech
from tqdm.notebook import tqdm
import warnings

warnings.filterwarnings("ignore")

# --- 1. SETUP & AUTHENTICATION ---
# Set your OpenAI API Key here
os.environ["OPENAI_API_KEY"] = "YOUR_OPENAI_API_KEY" 
client = OpenAI()
gcp_client = texttospeech.TextToSpeechClient()

output_dir = "./synthetic_booster_pack"
os.makedirs(output_dir, exist_ok=True)

# --- 2. LANGUAGE MAPPING & RULES ---
# 1. Map the short codes to the Google Cloud voices
gcp_voice_map = {
    'en': 'en-US-Journey-D',      # Journey (SOTA)
    'fr': 'fr-FR-Neural2-A',      # Neural2 (Ultra-high quality)
    'es': 'es-ES-Neural2-A',
    'de': 'de-DE-Neural2-B',
    'zh-CN': 'cmn-CN-Wavenet-A',  # Wavenet
    'ca': 'ca-ES-Standard-A',     # Standard
    'bn': 'bn-IN-Wavenet-A'
}

# 2. Map your CSV's exact words to the API's required short codes
csv_to_2letter = {
    'English': 'en',
    'French': 'fr',
    'Spanish': 'es',
    'German': 'de',
    'Chinese': 'zh-CN',
    'Catalan': 'ca',
    'Bengali': 'bn'
}

# The languages OpenAI supports
openai_languages = ['en', 'fr', 'es', 'de', 'zh-CN', 'ca'] # No Bengali

# --- 3. LOAD DATASET ---
print("Loading dataset...")
df = pd.read_csv("synthetic_booster_validated_sentences.csv")
col_lang = 'Language'     
col_text = 'Sentence'   

# --- 4. THE AUGMENTATION ENGINE ---
def save_with_noise(raw_audio_content, filename):
    """Saves raw API bytes to disk, adds white noise, and resaves as a clean .wav"""
    temp_path = f"temp_{filename}"
    final_path = os.path.join(output_dir, filename)
    
    with open(temp_path, "wb") as out:
        out.write(raw_audio_content)
        
    y, sr = librosa.load(temp_path, sr=16000)
    
    # Inject microscopic white noise (The "Dirty Room" trick)
    noise_amp = 0.005 * np.random.uniform() * np.amax(y)
    y_noisy = y + noise_amp * np.random.normal(size=y.shape[0])
    
    sf.write(final_path, y_noisy, sr)
    os.remove(temp_path)

# --- 5. API GENERATORS ---
def generate_gcp(text, lang_code, index):
    try:
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice_name = gcp_voice_map.get(lang_code, 'en-US-Standard-A')
        
        voice = texttospeech.VoiceSelectionParams(
            language_code=voice_name[:5], 
            name=voice_name 
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000
        )
        response = gcp_client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        filename = f"gcp_{lang_code}_{index:02d}.wav"
        save_with_noise(response.audio_content, filename)
        return True
    except Exception as e:
        print(f"❌ GCP Error on {lang_code}_{index}: {e}")
        return False

def generate_openai(text, lang_code, index):
    try:
        response = client.audio.speech.create(
            model="tts-1-hd", 
            voice="nova",     
            input=text
        )
        filename = f"openai_{lang_code}_{index:02d}.wav"
        save_with_noise(response.content, filename)
        return True
    except Exception as e:
        print(f"❌ OpenAI Error on {lang_code}_{index}: {e}")
        return False

# --- 6. THE SMARTER MASS GENERATION LOOP ---
print("\n🚀 Starting SOTA Factory...")
total_gcp = 0
total_openai = 0

for csv_lang, strict_lang_code in csv_to_2letter.items():
    
    # Filter using the exact word found in your CSV (e.g., 'English')
    lang_df = df[df[col_lang] == csv_lang].head(20)
    sentences = lang_df[col_text].tolist()
    
    print(f"\nProcessing Language: [{csv_lang.upper()}] - {len(sentences)} sentences found.")
    
    for i, text in enumerate(sentences):
        # Sentences 0 to 9 -> Google Cloud TTS
        if i < 10:
            success = generate_gcp(text, strict_lang_code, i)
            if success: total_gcp += 1
            time.sleep(0.5) # Prevent GCP rate limits
            
        # Sentences 10 to 19 -> OpenAI TTS (Skip if Bengali)
        elif i >= 10 and strict_lang_code in openai_languages:
            success = generate_openai(text, strict_lang_code, i)
            if success: total_openai += 1
            time.sleep(1) # Be polite to OpenAI rate limits

print("\n" + "="*40)
print("🎉 FACTORY RUN COMPLETE")
print("="*40)
print(f"Google Cloud Clips Generated : {total_gcp} / 70")
print(f"OpenAI Clips Generated       : {total_openai} / 60")
print(f"Total Deepfakes Ready        : {total_gcp + total_openai} / 130")
print("All files saved to './synthetic_booster_pack' with environmental noise injected.")
