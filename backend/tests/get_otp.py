# Helper for UI tests: print the current OTP code stored for an email (argv[1])
import os, sys
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
db = MongoClient(os.environ.get("MONGO_URL"))[os.environ.get("DB_NAME")]
row = db.otps.find_one({"email": sys.argv[1]}) or {}
print(row.get("code", ""))
