#!/usr/bin/env python3
"""
AI Voice Forensics — Dataset & Model Weight Downloader
Automates downloading and extracting official data packages from the Internet Archive.
Authors: Venkata Sriram Topalli & Ayush M Singh
"""

import os
import sys
import argparse
import hashlib
import urllib.request
import tarfile
from pathlib import Path

ARCHIVE_BASE = "https://archive.org/download/ai-voice-forensics-dataset"
PROJECT_ROOT = Path(__file__).resolve().parent

PACKAGES = {
    "booster": {
        "file": "openai_gcp_booster_pack.tar.gz",
        "desc": "130 calibrated Neural2 / Journey / Nova deepfakes (~8.4 MB)",
    },
    "elevenlabs": {
        "file": "elevenlabs_v3_synthetic_speech.tar.gz",
        "desc": "7,700 dynamic ElevenLabs v3 synthetic voice clips (~460 MB)",
    },
    "models": {
        "file": "heavy_model_weights.tar.gz",
        "desc": "Pretrained ONNX & PyTorch production model weights (~910 MB)",
    },
    "caches": {
        "file": "dna_feature_caches.tar.gz",
        "desc": "Precomputed WavLM DNA & LFCC fused feature tensors (~2.3 GB)",
    },
    "spectrograms": {
        "file": "spectrogram_data.tar.gz",
        "desc": "Precomputed 2D Mel-Spectrogram arrays for V1-V3 models (~3.4 GB)",
    },
    "corpus": {
        "file": "multilingual_base_corpus.tar.gz",
        "desc": "Core multilingual training corpus across 9 languages (~17 GB)",
    }
}

class DownloadProgressBar:
    def __init__(self, filename):
        self.filename = filename
        self.last_percent = -1

    def __call__(self, block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            percent = min(100, int(downloaded * 100 / total_size))
            if percent != self.last_percent:
                mb_downloaded = downloaded / (1024 * 1024)
                mb_total = total_size / (1024 * 1024)
                bar = "=" * (percent // 2) + ">" + " " * (50 - percent // 2)
                sys.stdout.write(f"\r[{bar}] {percent}% ({mb_downloaded:.1f}/{mb_total:.1f} MB) {self.filename}")
                sys.stdout.flush()
                self.last_percent = percent

def download_and_extract(pkg_key):
    pkg = PACKAGES[pkg_key]
    filename = pkg["file"]
    url = f"{ARCHIVE_BASE}/{filename}"
    archive_path = PROJECT_ROOT / filename

    print(f"\n⬇️ Downloading {pkg['desc']}...")
    print(f"   URL: {url}")
    
    progress = DownloadProgressBar(filename)
    urllib.request.urlretrieve(url, archive_path, reporthook=progress)
    print("\n   Download complete. Extracting files...")

    with tarfile.open(archive_path, "r:gz") as tar:
        tar.extractall(path=PROJECT_ROOT)
    
    print(f"✅ Extracted successfully into project structure.")
    
    # Remove archive file after extraction to save disk space
    if archive_path.exists():
        archive_path.unlink()
        print(f"🧹 Cleaned up temporary archive: {filename}")

def main():
    parser = argparse.ArgumentParser(description="AI Voice Forensics Dataset Downloader")
    parser.add_argument("--all", action="store_true", help="Download all packages (Full ~24 GB corpus)")
    parser.add_argument("--models", action="store_true", help="Download only pretrained model weights (~910 MB)")
    parser.add_argument("--caches", action="store_true", help="Download precomputed DNA & LFCC feature caches (~2.3 GB)")
    parser.add_argument("--booster", action="store_true", help="Download OpenAI & GCP booster pack (~8.4 MB)")
    parser.add_argument("--elevenlabs", action="store_true", help="Download ElevenLabs v3 dataset (~460 MB)")
    parser.add_argument("--corpus", action="store_true", help="Download base multilingual audio corpus (~17 GB)")

    args = parser.parse_args()

    selected = []
    if args.all:
        selected = list(PACKAGES.keys())
    else:
        if args.models: selected.append("models")
        if args.caches: selected.append("caches")
        if args.booster: selected.append("booster")
        if args.elevenlabs: selected.append("elevenlabs")
        if args.corpus: selected.append("corpus")

    if not selected:
        print("="*65)
        print("  AI Voice Forensics — Data & Model Package Selector")
        print("  Authors: Venkata Sriram Topalli & Ayush M Singh")
        print("="*65)
        print("Available Packages:")
        for idx, (k, p) in enumerate(PACKAGES.items(), 1):
            print(f"  [{idx}] {k.upper():<12} : {p['desc']}")
        print(f"  [7] ALL          : Download everything")
        print("="*65)
        
        choice = input("\nEnter option number(s) comma-separated (e.g., 3 for models): ").strip()
        choices = [c.strip() for c in choice.split(",") if c.strip()]
        
        mapping = {
            "1": "booster",
            "2": "elevenlabs",
            "3": "models",
            "4": "caches",
            "5": "spectrograms",
            "6": "corpus",
            "7": "all"
        }
        for c in choices:
            mapped = mapping.get(c)
            if mapped == "all":
                selected = list(PACKAGES.keys())
                break
            elif mapped:
                selected.append(mapped)

    if not selected:
        print("No valid packages selected. Exiting.")
        return

    for pkg_key in selected:
        download_and_extract(pkg_key)

    print("\n🎉 Setup complete! All requested datasets and weights are ready for use.")

if __name__ == "__main__":
    main()
