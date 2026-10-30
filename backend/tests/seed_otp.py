# Helper for UI tests when the e-mail provider is rate-limited: seeds an OTP for argv[1] and prints it
import os, sys, secrets
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
db = MongoClient(os.environ.get("MONGO_URL"))[os.environ.get("DB_NAME")]
email = sys.argv[1].strip().lower()
code = f"{secrets.randbelow(10**6):06d}"
now = datetime.now(timezone.utc)
db.otps.update_one({"email": email}, {"$set": {
    "email": email, "attempts": 0, "code": code, "lang": "fr",
    "expires_at": (now + timedelta(minutes=10)).isoformat(),
    "last_sent_at": now.isoformat(), "sends_in_window": 1, "window_start": now.isoformat(),
}}, upsert=True)
print(code)
