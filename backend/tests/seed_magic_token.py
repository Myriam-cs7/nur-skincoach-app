# Helper for UI tests: prints a fresh magic-link token (email based) and the invite token
import os, sys, hashlib, secrets
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
db = MongoClient(os.environ.get("MONGO_URL"))[os.environ.get("DB_NAME")]
n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
now = datetime.now(timezone.utc)
for _ in range(n):
    tok = secrets.token_urlsafe(24)
    db.magic_links.insert_one({
        "token_hash": hashlib.sha256(tok.encode()).hexdigest(),
        "email": f"delivered+t1ui{secrets.token_hex(3)}@resend.dev", "activation_code": None, "lang": "fr",
        "created_at": now.isoformat(), "expires_at": (now + timedelta(minutes=30)).isoformat(),
        "used_at": None, "test_seed": "TEST_t1",
    })
    print("MAGIC", tok)
print("INVITE", db.app_settings.find_one({"key": "invite"})["token"])
