import asyncio
import websockets
import json
import librosa
import numpy as np

import warnings
warnings.filterwarnings("ignore")

async def simulate_microphone(test_audio_path):
    # Use wss:// for secure WebSockets 
    # Upload backend link of the form "wss://127.0.0.1:8000/ws/stream"
    uri = "DEPLOYED_BACKEND_LINK"
    
    print(f"[*] Loading test file: {test_audio_path}")
    y, sr = librosa.load(test_audio_path, sr=16000, mono=True)
    chunk_size = int(16000 * 0.5) 
    
    print("[*] Simulating Live Mic. Connecting to V6 Server...\n")
    
    async with websockets.connect(uri) as websocket:
        
        async def message_receiver():
            while True:
                try:
                    response = await websocket.recv()
                    data = json.loads(response)
                    
                    if data.get("type") == "chunk_update":
                        # FIX: Extracted latency metric successfully for live visual updates
                        print(f"⚡ [LIVE] Status: {data['status']} | Real: {data['real_prob']}% | Fake: {data['fake_prob']}% | Latency: {data['latency_ms']}ms")
                        
                    elif data.get("type") == "final_summary":
                        print("\n" + "="*60)
                        print(" 📄 FINAL CUMULATIVE THREAT REPORT")
                        print("="*60)
                        
                        if data.get("status") == "ABORTED":
                            print(f"⚠️ ABORTED: {data.get('reason')}")
                        else:
                            print(f"⏱️ Total Scan Time   : {data['latency_ms']}ms")
                            print(f"🗣️ Detected Language : {data['language']} ({data['lang_confidence']}% Conf)")
                            print(f"🚨 Final Status      : {data['status']}")
                            print(f"📊 Cumulative Score  : {data['threat_score']}% Fake")
                            print("-" * 60)
                            print("📋 Action Plan:")
                            for action in data['report']:
                                print(f" - {action}")
                        print("="*60 + "\n")
                        return 
                except websockets.exceptions.ConnectionClosed:
                    break

        recv_task = asyncio.create_task(message_receiver())
        
        for i in range(0, len(y), chunk_size):
            chunk = y[i:i+chunk_size]
            raw_bytes = chunk.astype(np.float32).tobytes()
            await websocket.send(raw_bytes)
            await asyncio.sleep(0.5) 
        
        await websocket.send("EOF")
        await recv_task

if __name__ == "__main__":
    # Test file execution allocation boundary
    TEST_FILE = "PATH_OF_THE_FILE_TO_BE_TESTED"
    asyncio.run(simulate_microphone(TEST_FILE))