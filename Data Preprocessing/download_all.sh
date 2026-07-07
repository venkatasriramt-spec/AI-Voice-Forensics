#!/bin/bash

# 1. Define your bucket and the new target folder
BUCKET_NAME="mozilla-voice-data-lake-2026"
DEST_FOLDER="real voice"

# 2. Define the languages and their fresh links

# For fresh links , Navigate to the Mozilla Data Collective for each of the respective languages , start the download and terminate it immediately then navigate to your browser downloads section, copy and paste the link here. 
declare -A languages=(
    ["english"]="Paste fresh link here"
    ["french"]="Paste fresh link here"
    ["german"]="Paste fresh link here"
    ["spanish"]="Paste fresh link here"
    ["kinyarwanda"]="Paste fresh link here"
    ["esperanto"]="Paste fresh link here"
    ["catalan"]="Paste fresh link here"
    ["chinese"]="Paste fresh link here"
    ["bengali"]="Paste fresh link here"
    ["pashto"]="Paste fresh link here"
    ["belarusian"]="Paste fresh link here"
)

echo "Starting high-speed parallel downloads..."

# 3. The Multitasking Engine
for lang in "${!languages[@]}"; do
    url="${languages[$lang]}"
    
    # We wrap the commands in parentheses to group them into a single background task
    (
        echo "-> [Started] $lang"
        # -nv (non-verbose) keeps the logs much cleaner when multiple files download at once
        wget -nv -O "${lang}_audio.tar.gz" "$url"
        
        echo "-> [Uploading] $lang..."
        # Notice we added "/$DEST_FOLDER/" to the end of the bucket path
        gcloud storage cp "${lang}_audio.tar.gz" "gs://$BUCKET_NAME/$DEST_FOLDER/"
        
        rm "${lang}_audio.tar.gz"
        echo "-> [Done] $lang is safely stored and local file deleted!"
    ) & # The '&' tells Linux to run this block in the background immediately
    
    # The Queue Manager: Check how many background jobs are currently running
    # If 4 or more are running, wait for at least one to finish before starting the next
    if [[ $(jobs -r -p | wc -l) -ge 4 ]]; then
        wait -n 
    fi
done

# Wait for the very last batch to finish before declaring complete
wait
echo "ALL DOWNLOADS COMPLETE!"
