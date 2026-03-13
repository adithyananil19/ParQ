#!/usr/bin/env python3
import sys
import os

os.chdir("backend")
sys.path.insert(0, ".")

# Load env vars
from dotenv import load_dotenv
load_dotenv()

# Initialize Firebase
import firebase_admin
from firebase_admin import credentials, firestore

cred_path = os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json")
if os.path.exists(cred_path):
    try:
        cred = credentials.Certificate(cred_path)
        try:
            firebase_admin.get_app()
        except ValueError:
            pass  # Already initialized
        
        firebase_admin.initialize_app(cred) if not firebase_admin._apps else None
        db = firestore.client()
        
        # Push test data
        doc = {
            'occupied_count': 12,
            'available_count': 38,
            'total_spaces': 50,
            'occupancy_percentage': 24.0,
            'timestamp': '2026-03-10T10:00:00Z'
        }
        db.collection('parking_lots').document('default').set(doc)
        print("✓ Test data pushed to Firebase!")
    except Exception as e:
        print(f"Error: {e}")
else:
    print(f"Credentials file not found: {cred_path}")
