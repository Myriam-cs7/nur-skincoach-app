# Iteration 13 retest: forged XFF rate-limit, bypass header scope, silent STT, verify-code burns magic link
import hashlib
import io
import math
import os
import secrets
import struct
import wave
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

from rate_exempt import exempt_headers

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env")
BASE_URL = (os.environ.get("EXPO_BACKEND_URL") or os.environ.get("EXPO_PUBLIC_BACKEND_URL")).rstrip("/")
db = MongoClient(os.environ.get("MONGO_URL"))[os.environ.get("DB_NAME")]
JSON = {"Content-Type": "application/json"}


def _wav(seconds=2.0, freq=None, amp=0):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        frames = b"".join(
            struct.pack("<h", int(amp * math.sin(2 * math.pi * (freq or 0) * i / 16000)) if freq else 0)
            for i in range(int(16000 * seconds))
        )
        w.writeframes(frames)
    return buf.getvalue()


# --- Rate limit: valid activation first (same IP bucket gets exhausted below) ---
class TestActivationBaseline:
    def test_valid_activation_200(self):
        r = requests.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-DEMO-2026"}, headers=JSON)
        assert r.status_code == 200, r.text
        assert r.json().get("user_id") or r.json().get("id")


# --- BUG 2: forged X-Forwarded-For must not hand out a fresh quota ---
class TestForgedXFF:
    def test_spoofed_xff_still_429(self):
        codes = []
        for i in range(12):
            h = {**JSON, "X-Forwarded-For": f"10.{i}.{i + 1}.{i + 2}"}
            r = requests.post(f"{BASE_URL}/api/activate", json={"activation_code": f"NUR-BAD{i:02d}-XXXX"}, headers=h)
            codes.append(r.status_code)
        print("codes:", codes)
        assert 429 in codes, codes
        assert codes[-1] == 429

    def test_multi_hop_spoof_still_429(self):
        h = {**JSON, "X-Forwarded-For": "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4"}
        r = requests.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-BADX-XXXX"}, headers=h)
        assert r.status_code == 429

    # --- NEW: invalid bypass value is NOT exempted ---
    def test_invalid_bypass_value_still_429(self):
        h = {**JSON, "X-Rate-Limit-Bypass": "not-the-token"}
        r = requests.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-DEMO-2026"}, headers=h)
        assert r.status_code == 429

    def test_empty_bypass_value_still_429(self):
        h = {**JSON, "X-Rate-Limit-Bypass": ""}
        r = requests.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-DEMO-2026"}, headers=h)
        assert r.status_code == 429

    def test_valid_bypass_activation_200(self):
        r = requests.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-DEMO-2026"},
                          headers={**JSON, **exempt_headers()})
        assert r.status_code == 200, r.text

    def test_other_bucket_unaffected(self):
        r = requests.post(f"{BASE_URL}/api/tts", json={"text": "Bonjour", "lang": "fr"}, headers=JSON)
        assert r.status_code == 200, r.text


# --- NEW: bypass header never grants admin ---
class TestBypassNotAdmin:
    def test_overview_bypass_only_401(self):
        r = requests.get(f"{BASE_URL}/api/admin/overview", headers=exempt_headers())
        assert r.status_code == 401, r.text

    def test_overview_wrong_admin_token_401(self):
        r = requests.get(f"{BASE_URL}/api/admin/overview", headers={**exempt_headers(), "X-Admin-Token": "nope"})
        assert r.status_code == 401


# --- BUG 4: silence must not be sent as the vocabulary hint ---
class TestTranscribeSilence:
    def test_pure_silence_no_speech(self):
        files = {"audio": ("recording.wav", _wav(3.0), "audio/wav")}
        r = requests.post(f"{BASE_URL}/api/transcribe", files=files, data={"lang": "fr"}, headers=exempt_headers(), timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        print(body)
        assert body["text"] == "" and body["reason"] == "no_speech"

    def test_low_hum_no_speech(self):
        files = {"audio": ("recording.wav", _wav(3.0, freq=60, amp=300), "audio/wav")}
        r = requests.post(f"{BASE_URL}/api/transcribe", files=files, data={"lang": "fr"}, headers=exempt_headers(), timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        print(body)
        assert "luminoth" not in body["text"].lower() and "masque led" not in body["text"].lower()

    def test_real_question_transcribes(self):
        q = "Combien de minutes dois-je porter le masque rouge le soir ?"
        r = requests.post(f"{BASE_URL}/api/tts", json={"text": q, "lang": "fr"}, headers={**JSON, **exempt_headers()}, timeout=60)
        assert r.status_code == 200, r.text
        mp3 = requests.get(f"{BASE_URL}{r.json()['path']}", timeout=30).content
        files = {"audio": ("recording.mp3", mp3, "audio/mpeg")}
        t = requests.post(f"{BASE_URL}/api/transcribe", files=files, data={"lang": "fr"}, headers=exempt_headers(), timeout=60)
        assert t.status_code == 200, t.text
        body = t.json()
        print(body)
        assert "masque" in body["text"].lower() and body["reason"] is None

    def test_question_with_hint_words_kept(self):
        # A real question mentioning many hint words must not be swallowed as an echo
        q = "Est-ce que je peux mettre du rétinol et de la vitamine C après le masque LED ?"
        r = requests.post(f"{BASE_URL}/api/tts", json={"text": q, "lang": "fr"}, headers={**JSON, **exempt_headers()}, timeout=60)
        mp3 = requests.get(f"{BASE_URL}{r.json()['path']}", timeout=30).content
        t = requests.post(f"{BASE_URL}/api/transcribe", files={"audio": ("recording.mp3", mp3, "audio/mpeg")},
                          data={"lang": "fr"}, headers=exempt_headers(), timeout=60)
        body = t.json()
        print(body)
        assert body["text"] != "" and body["reason"] is None


# --- MINOR: 6-digit code burns the magic link mailed alongside ---
class TestVerifyCodeBurnsMagic:
    def test_verify_code_then_magic_410(self):
        email = f"delivered+t1it13{secrets.token_hex(3)}@resend.dev"
        now = datetime.now(timezone.utc)
        tok = secrets.token_urlsafe(24)
        db.magic_links.insert_one({
            "token_hash": hashlib.sha256(tok.encode()).hexdigest(), "email": email, "activation_code": None,
            "lang": "fr", "created_at": now.isoformat(), "expires_at": (now + timedelta(minutes=30)).isoformat(),
            "used_at": None, "test_seed": "TEST_t1",
        })
        db.otps.update_one({"email": email}, {"$set": {
            "email": email, "code": "424242", "lang": "fr", "attempts": 0,
            "expires_at": (now + timedelta(minutes=10)).isoformat(), "last_sent_at": now.isoformat(),
        }}, upsert=True)
        try:
            v = requests.post(f"{BASE_URL}/api/auth/verify-code", json={"email": email, "code": "424242", "lang": "fr"},
                              headers={**JSON, **exempt_headers()})
            assert v.status_code == 200, v.text
            assert v.json().get("session_token")
            m = requests.post(f"{BASE_URL}/api/activate/magic", json={"token": tok}, headers={**JSON, **exempt_headers()})
            assert m.status_code == 410, m.text
        finally:
            db.users.delete_many({"shopify_email": email})
            db.magic_links.delete_many({"email": email})
            db.otps.delete_many({"email": email})
