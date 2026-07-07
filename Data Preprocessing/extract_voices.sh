#!/bin/bash

# Define the source and destination bucket paths
BUCKET_SRC="gs://mozilla-voice-data-lake-2026/real_voices_backup_compressed"
BUCKET_DEST="gs://mozilla-voice-data-lake-2026/real_voices_final"

# A temporary directory on your VM to hold the extracted files
TEMP_DIR="/tmp/audio_forensics_extraction"

mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR" || exit

# Retrieve the list of all tar.gz files in the source bucket
echo "Fetching list of compressed files..."
FILES=$(gcloud storage ls "$BUCKET_SRC/*.tar.gz")

for FILE_URI in $FILES; do
    # Extract the filename and the language name
    FILENAME=$(basename "$FILE_URI")
    LANG_NAME="${FILENAME%_audio.tar.gz}"

    echo "=================================================="
    echo "Processing $LANG_NAME..."
    
    # Create an isolated temp directory for the current language, plus a 'raw' subfolder
    mkdir -p "$LANG_NAME/raw"

    # Stream the file from GCS and extract required components into the 'raw' folder.
    echo "Streaming and extracting files for $LANG_NAME..."
    gcloud storage cat "$FILE_URI" | tar -xz -C "$LANG_NAME/raw" --wildcards '*/clips/*' 'clips/*' '*/validated_sentences.tsv' 'validated_sentences.tsv'

    echo "Flattening folder structure for $LANG_NAME..."
    
    # Find the 'clips' directory anywhere inside 'raw' and move it directly under LANG_NAME
    find "$LANG_NAME/raw" -type d -name "clips" -exec mv {} "$LANG_NAME/" \;
    
    # Find the 'validated_sentences.tsv' file anywhere inside 'raw' and move it directly under LANG_NAME
    find "$LANG_NAME/raw" -type f -name "validated_sentences.tsv" -exec mv {} "$LANG_NAME/" \;

    # Remove the 'raw' folder and any lingering nested parent directories tar created
    rm -rf "$LANG_NAME/raw"

    # Upload ONLY the flattened contents to the final bucket path
    echo "Uploading strictly 'clips/' and 'validated_sentences.tsv' to $BUCKET_DEST/$LANG_NAME/ ..."
    
    # We explicitly specify the folder and file to ensure nothing else gets uploaded
    gcloud storage cp -r "$LANG_NAME/clips" "$LANG_NAME/validated_sentences.tsv" "$BUCKET_DEST/$LANG_NAME/"

    # Remove the local extracted files to free up disk space on the VM
    echo "Cleaning up local temporary files for $LANG_NAME..."
    rm -rf "$LANG_NAME"

    echo "$LANG_NAME completed successfully!"
done

echo "=================================================="
echo "All extractions and uploads are complete."