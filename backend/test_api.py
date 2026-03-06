import requests
import time
import os

BASE_URL = "http://localhost:8000/api"

def test_auth():
    print("--- Testing Auth ---")
    
    # 1. Register a test user
    print("Registering new user...")
    register_data = {
        "email": "doctor@diagnoai.com",
        "full_name": "Dr. Smith",
        "password": "securepassword123",
        "role": "doctor"
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=register_data)
    if r.status_code == 200:
        print("Registration successful!")
    elif r.status_code == 400 and "already exists" in r.text:
        print("User already exists, skipping registration.")
    else:
        print(f"Registration failed: {r.status_code} - {r.text}")
    
    # 2. Login
    print("Logging in...")
    login_data = {
        "username": "doctor@diagnoai.com",
        "password": "securepassword123"
    }
    r = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if r.status_code == 200:
        token = r.json()["access_token"]
        print("Login successful! Got JWT token.")
        return token
    else:
        print(f"Login failed: {r.status_code} - {r.text}")
        return None

def test_xray_upload():
    print("\n--- Testing X-Ray Upload (Celery) ---")
    
    # Create a dummy image file
    test_image = "test_image.jpg"
    with open(test_image, "wb") as f:
        f.write(os.urandom(1024)) # 1KB random data
        
    try:
        with open(test_image, "rb") as f:
            files = {"file": (test_image, f, "image/jpeg")}
            data = {"xray_type": "Chest"}
            print("Uploading X-Ray to trigger background task...")
            r = requests.post(f"{BASE_URL}/xray/analyze", files=files, data=data)
            
            if r.status_code == 200:
                resp = r.json()
                task_id = resp["task_id"]
                print(f"Upload successful. Background Task ID: {task_id}")
                return task_id
            else:
                print(f"Failed to upload X-ray: {r.status_code} - {r.text}")
                return None
    finally:
        if os.path.exists(test_image):
            os.remove(test_image)

def poll_task_status(task_id: str):
    if not task_id:
        return
        
    print(f"\n--- Polling Task Status for {task_id} ---")
    max_retries = 20
    for i in range(max_retries):
        r = requests.get(f"{BASE_URL}/tasks/status/{task_id}")
        if r.status_code == 200:
            status = r.json()["status"]
            print(f"Polled ({i+1}/{max_retries}): Status is {status}")
            
            if status in ["SUCCESS", "FAILURE"]:
                print(f"Final Result: {r.json()}")
                break
        else:
            print(f"Failed to poll task: {r.status_code} - {r.text}")
            break
        time.sleep(2)

if __name__ == "__main__":
    time.sleep(2) # Give servers a moment to start
    token = test_auth()
    
    task_id = test_xray_upload()
    poll_task_status(task_id)
    
    print("\nTests complete.")
