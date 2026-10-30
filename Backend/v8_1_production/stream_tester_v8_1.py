import asyncio
import websockets
import json
import librosa
import numpy as np
import warnings

# Required for running asyncio loops inside Jupyter Notebooks
import nest_asyncio
nest_asyncio.apply()

warnings.filterwarnings("ignore")

async def simulate_microphone(test_audio_path):
    # Updated URI pointing directly to your new V8.1 Cloud Run deployment
    # UPLOAD THE DEPLOYED BACKEND URL FOR THE FORM "wss://127.0.0.1:8000/ws/stream"
    uri = "wss://venkatasriram-audio-forensics-v8-1-demo.hf.space/ws/stream"
    
    print(f"[*] Loading test file: {test_audio_path}")
    
    # Load audio at 16kHz to perfectly match the V8.1 extraction pipeline
    y, sr = librosa.load(test_audio_path, sr=16000, mono=True)
    
    # Slice the audio into 0.5-second chunks to simulate a real-time data feed
    chunk_size = int(16000 * 0.5) 
    
    print(f"[*] Simulating Live Mic. Connecting to V8.1 Engine at {uri}...\n")
    
    async with websockets.connect(uri) as websocket:
        
        async def message_receiver():
            while True:
                try:
                    response = await websocket.recv()
                    data = json.loads(response)
                    
                    # Intercept real-time rolling updates (Fires every 2 seconds after a 4-second initial buffer)
                    if data.get("type") == "chunk_update":
                        status = data['status']
                        real_prob = data['probabilities']['authentic_human']
                        fake_prob = data['probabilities']['synthetic_ai']
                        latency = data['latency_ms']
                        
                        print(f"⚡ [LIVE] Status: {status} | Human: {real_prob}% | AI: {fake_prob}% | Latency: {latency}ms")
                        
                    # Intercept the Final Aggregate Report on disconnect
                    elif data.get("type") == "final_summary":
                        print("\n" + "="*60)
                        print(" 📄 FINAL V8.1 CUMULATIVE THREAT REPORT")
                        print("="*60)
                        
                        if "error" in data:
                            print(f"⚠️ ERROR: {data['error']}")
                        else:
                            print(f"🚨 Final Status      : {data['status']}")
                            print(f"📊 Cumulative Score  : Human {data['probabilities']['authentic_human']}% | AI {data['probabilities']['synthetic_ai']}%")
                            print("-" * 60)
                            print("📋 Action Plan:")
                            for action in data.get('action_report', []):
                                print(f" - {action}")
                        print("="*60 + "\n")
                        return 
                        
                except websockets.exceptions.ConnectionClosed:
                    print("[-] Connection securely closed by the server.")
                    break

        # Start listening for server responses in the background
        recv_task = asyncio.create_task(message_receiver())
        
        print("[*] Streaming audio data in real-time...\n")
        
        # Stream the chunks over the socket
        for i in range(0, len(y), chunk_size):
            chunk = y[i:i+chunk_size]
            raw_bytes = chunk.astype(np.float32).tobytes()
            await websocket.send(raw_bytes)
            await asyncio.sleep(0.5) # Force the script to pause so it acts exactly like a live microphone
        
        # Send the V8.1 termination signal
        print("\n[*] Audio stream finished. Requesting final aggregate report...")
        await websocket.send("END_STREAM")
        
        # Await final teardown
        await recv_task

# ==========================================
# EXECUTE THE TEST
# ==========================================
if __name__ == "__main__":
    # Replace this with the name of the file you want to test
    TEST_FILE = "PATH_OF_FILE_TO_TEST"
    
    # Run the async loop
    asyncio.run(simulate_microphone(TEST_FILE))
