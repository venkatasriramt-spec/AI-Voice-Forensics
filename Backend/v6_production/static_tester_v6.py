import requests
import json
import time

def test_static_upload(file_path):
    # Change the URL to point to your deployed /analyze_file endpoint
    url = "UPLOAD_VERSION_6_DEPLOYED_URL"
    
    print(f"[*] Uploading file for Static Analysis: {file_path}")
    print("[*] Waiting for V6 Deep Scan...")
    
    start_time = time.time()
    
    # Open the file and send it via POST
    with open(file_path, "rb") as f:
        files = {"file": f}
        response = requests.post(url, files=files)
        
    network_latency = round((time.time() - start_time) * 1000, 2)
    
    if response.status_code == 200:
        data = response.json()
        
        print("\n" + "="*60)
        print(" 📄 STATIC FILE THREAT REPORT")
        print("="*60)
        
        if data.get("status") == "ABORTED":
            print(f"⚠️ ABORTED: {data.get('reason')}")
        else:
            print(f"⏱️ Total API Latency : {network_latency}ms (Includes network transfer)")
            print(f"⏱️ Model Processing  : {data.get('latency_ms')}ms (Pure GPU compute)")
            print(f"🗣️ Detected Language : {data['language']} ({data['lang_confidence']}% Conf)")
            print(f"🚨 Final Status      : {data['status']}")
            print(f"📊 Threat Score      : {data['threat_score']}% Fake")
            print("-" * 60)
            print("📋 Action Plan:")
            for action in data['report']:
                print(f" - {action}")
        print("="*60 + "\n")
        
    else:
        print(f"❌ Error: Server returned status code {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    TEST_FILE = "PATH_OF_THE_FILE_TO_BE_TESTED"
    test_static_upload(TEST_FILE)