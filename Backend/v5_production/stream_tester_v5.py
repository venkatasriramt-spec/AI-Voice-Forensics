# For testing live audio.
# For testing model version 5

import asyncio
import websockets
import json
import librosa
import numpy as np
import time

async def simulate_microphone(test_audio_path):
    # UPLOAD THE DEPLOYED BACKEND URL FOR THE FORM "ws://127.0.0.1:8000/ws/stream"
    uri = "DEPLOYED_BACKEND_LINK"
    
    print(f"[*] Loading test file: {test_audio_path}")
    
    # Load the audio exactly how a browser would (resampled to 16kHz mono)
    y, sr = librosa.load(test_audio_path, sr=16000, mono=True)
    
    # Calculate chunk size (We will simulate sending 0.5 seconds of audio at a time)
    chunk_size = int(16000 * 0.5)
    
    print("[*] Simulating Live Mic. Connecting to V5 Server...")
    
    async with websockets.connect(uri) as websocket:
        print("[+] WebSocket Connected! Streaming data...\n")
        
        for i in range(0, len(y), chunk_size):
            chunk = y[i:i+chunk_size]
            
            # Convert float32 array to raw binary bytes
            raw_bytes = chunk.tobytes()
            
            # Send the binary audio chunk to the server
            await websocket.send(raw_bytes)
            
            # Non-blocking listen for server response (Chunk Updates)
            try:
                # Wait up to 0.1s for a response from the server
                response = await asyncio.wait_for(websocket.recv(), timeout=0.1)
                data = json.loads(response)
                
                if data.get("type") == "chunk_update":
                    # Extract both probabilities
                    real_prob = data['probabilities']['authentic_human']
                    fake_prob = data['probabilities']['synthetic_ai']
                    
                    print(f"📡 LIVE UPDATE | Status: {data['status']} | Real: {real_prob}% | Fake: {fake_prob}% | Latency: {data['latency_ms']}ms")
                    
            except asyncio.TimeoutError:
                # The server is buffering (waiting for the initial 2.5s window to fill up)
                print("🎙️ Streaming chunk (Buffering...)")
                
            # Sleep to simulate real-time speaking (1 chunk = 0.5 seconds of real time)
            time.sleep(0.5)
            
        # --- END OF STREAM ---
        print("\n[*] Audio stream finished. Sending END_STREAM signal...")
        await websocket.send("END_STREAM")
        
        # Keep reading the queue until we explicitly catch the final summary
        while True:
            response = await websocket.recv()
            final_data = json.loads(response)
            
            # If we catch the final summary OR a server error, break the loop
            if final_data.get("type") == "final_summary" or "error" in final_data:
                break
            else:
                # Silently ignore any lingering chunk updates still in the pipe
                pass
                
        print("\n" + "="*60)
        print(" 📄 FINAL CUMULATIVE THREAT REPORT")
        print("="*60)
        
        if "error" in final_data:
            print(f"❌ Server Error: {final_data['error']}")
        else:
            # Extract both final cumulative probabilities
            final_real = final_data['probabilities']['authentic_human']
            final_fake = final_data['probabilities']['synthetic_ai']
            
            print(f"Status: {final_data['status']}")
            print(f"Final Real Probability: {final_real}%")
            print(f"Final Fake Probability: {final_fake}%")
            print("-" * 60)
            print("Action Plan:")
            for action in final_data['action_report']:
                print(f" - {action}")
        print("="*60 + "\n")

# RUN THE TEST
# Point this to one of your Deepfake Booster Pack files. 
# Ensure the path is correct relative to where you run the script!
asyncio.run(simulate_microphone("PATH_OF_FILE_TO_TEST"))