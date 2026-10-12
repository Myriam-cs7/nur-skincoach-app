"""Nūr Protocol — Backend tests for the voice (TTS/STT) + photo consultation flow.

Covers:
- POST /api/tts (OpenAI gpt-4o-mini-tts, voice=nova) + GET /api/tts/<key>.mp3 cache
- POST /api/transcribe (short-audio guardrail + real mp3 round-trip)
- POST /api/users/{id}/chat with the new photo_base64 field and ask_photo flow
- Guard-rails (off-topic refusal, length limits)
"""
import base64
import os
import re
from pathlib import Path

import pytest
import requests

BASE_URL = None
with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
            break
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not set"


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def test_user_id(api_client):
    """Create a fresh test user via NUR-CREATOR (multi-use, no email required)."""
    r = api_client.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-CREATOR"}, timeout=15)
    assert r.status_code == 200, r.text
    uid = r.json()["user_id"]
    # Save minimal intake so chat has a profile
    intake = {
        "age_range": "25-34",
        "skin_type": "mixte",
        "climate": "tempere",
        "sun_exposure": "moyenne",
        "lifestyle": "actif",
        "sleep_hours": "6-7",
        "stress_level": "moyen",
        "water_intake": "1-2L",
        "concerns": ["pores", "ternissement"],
    }
    ir = api_client.post(f"{BASE_URL}/api/users/{uid}/intake", json=intake, timeout=15)
    assert ir.status_code == 200
    return uid


# ---------- /api/tts ----------
class TestTTS:
    def test_tts_generates_and_serves_audio(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/tts",
                            json={"text": "Bonjour, je suis Nour Skincoach.", "lang": "fr"},
                            timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "path" in body and "key" in body
        assert re.fullmatch(r"/api/tts/[a-f0-9]{64}\.mp3", body["path"])

        # GET the mp3 — must be audio/mpeg and non-empty
        g = api_client.get(f"{BASE_URL}{body['path']}", timeout=30)
        assert g.status_code == 200
        assert g.headers.get("content-type", "").startswith("audio/mpeg")
        assert len(g.content) > 1024

    def test_tts_cache_on_second_call(self, api_client):
        payload = {"text": "Un test de cache audio très spécifique abc123.", "lang": "fr"}
        r1 = api_client.post(f"{BASE_URL}/api/tts", json=payload, timeout=60)
        r2 = api_client.post(f"{BASE_URL}/api/tts", json=payload, timeout=20)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["key"] == r2.json()["key"]

    def test_tts_empty_text_400(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/tts", json={"text": "   ", "lang": "fr"}, timeout=15)
        assert r.status_code == 400
        assert r.json()["detail"] == "empty_text"

    def test_tts_bad_key_400(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/tts/not-a-hex-key.mp3", timeout=15)
        assert r.status_code == 400
        assert r.json()["detail"] == "bad_key"

    def test_tts_unknown_key_404(self, api_client):
        key = "0" * 64
        r = api_client.get(f"{BASE_URL}/api/tts/{key}.mp3", timeout=15)
        assert r.status_code == 404


# ---------- /api/transcribe ----------
class TestTranscribe:
    def test_transcribe_too_short(self, api_client):
        files = {"audio": ("tiny.m4a", b"\x00" * 100, "audio/mp4")}
        data = {"lang": "fr"}
        r = requests.post(f"{BASE_URL}/api/transcribe", files=files, data=data, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert body["text"] == ""
        assert body["reason"] == "too_short"

    def test_transcribe_real_mp3_from_tts(self, api_client):
        # Generate a known-text mp3 via /api/tts first
        text = "Je m'appelle Sophie et j'ai la peau mixte."
        t = api_client.post(f"{BASE_URL}/api/tts", json={"text": text, "lang": "fr"}, timeout=60)
        assert t.status_code == 200
        mp3_path = t.json()["path"]
        g = api_client.get(f"{BASE_URL}{mp3_path}", timeout=30)
        assert g.status_code == 200
        audio = g.content
        assert len(audio) > 2048

        files = {"audio": ("sample.mp3", audio, "audio/mpeg")}
        data = {"lang": "fr"}
        r = requests.post(f"{BASE_URL}/api/transcribe", files=files, data=data, timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("text"), f"empty transcription: {body}"
        # Should contain some recognizable French word
        assert len(body["text"]) >= 5

    def test_transcribe_unknown_extension_tolerated(self, api_client):
        # Reuse the generated mp3 as .foo
        t = api_client.post(f"{BASE_URL}/api/tts", json={"text": "Test extension inconnue.", "lang": "fr"}, timeout=60)
        mp3 = api_client.get(f"{BASE_URL}{t.json()['path']}", timeout=30).content
        files = {"audio": ("recording.foo", mp3, "application/octet-stream")}
        data = {"lang": "fr"}
        r = requests.post(f"{BASE_URL}/api/transcribe", files=files, data=data, timeout=90)
        # Backend must not 400; it should either return text or a 502 on provider error
        assert r.status_code in (200, 502), r.text


# ---------- /api/users/{id}/chat (voice + photo) ----------
class TestCoachChat:
    def test_chat_short_consultation_eventually_asks_photo(self, api_client, test_user_id):
        """4-5 French turns → ask_photo should become True, and [PHOTO] never appears in reply."""
        history = []
        turns = [
            "Bonjour, ma peau est terne depuis quelques semaines.",
            "J'ai la peau mixte et je dors environ 6 heures par nuit.",
            "Ma routine actuelle : un nettoyant doux le matin et une crème hydratante.",
            "Je travaille beaucoup sur écran et je suis parfois stressée.",
            "Oui, j'aimerais surtout retrouver de l'éclat et affiner mes pores.",
        ]
        ask_photo_seen = False
        for msg in turns:
            r = api_client.post(
                f"{BASE_URL}/api/users/{test_user_id}/chat",
                json={"message": msg, "history": history, "lang": "fr"},
                timeout=60,
            )
            assert r.status_code == 200, r.text
            body = r.json()
            assert "[PHOTO]" not in body["reply"], "The [PHOTO] marker must never leak to the client"
            assert body["blocked"] is False
            history.append({"role": "user", "content": msg})
            history.append({"role": "assistant", "content": body["reply"]})
            if body.get("ask_photo"):
                ask_photo_seen = True
                break
        assert ask_photo_seen, "ask_photo was never set to True after 5 turns"

    def test_chat_with_photo_describes_and_recommends_no_brand(self, api_client, test_user_id):
        img_path = Path("/app/frontend/assets/images/nur-avatar.png")
        if not img_path.exists():
            # Fallback — any png in assets
            candidates = list(Path("/app/frontend/assets/images").glob("*.png"))
            assert candidates, "No image available for the test"
            img_path = candidates[0]
        b64 = base64.b64encode(img_path.read_bytes()).decode("ascii")

        r = api_client.post(
            f"{BASE_URL}/api/users/{test_user_id}/chat",
            json={
                "message": "Voici ma photo, qu'en penses-tu ?",
                "history": [],
                "lang": "fr",
                "photo_base64": b64,
                "mime_type": "image/png",
            },
            timeout=90,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        reply = body["reply"]
        assert body["ask_photo"] is False
        assert body["blocked"] is False
        assert "[PHOTO]" not in reply
        # No markdown
        assert "**" not in reply
        assert "##" not in reply and not reply.startswith("#")
        # No commercial brand name
        forbidden_brands = ["CeraVe", "COSRX", "La Roche-Posay", "Nivea", "L'Oréal", "Clinique", "Estée"]
        for brand in forbidden_brands:
            assert brand.lower() not in reply.lower(), f"Brand '{brand}' leaked in reply: {reply[:300]}"

    def test_chat_off_topic_refusal(self, api_client, test_user_id):
        r = api_client.post(
            f"{BASE_URL}/api/users/{test_user_id}/chat",
            json={"message": "Quel est le prix du bitcoin aujourd'hui ?", "history": [], "lang": "fr"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        # Either blocked by keyword filter OR politely refused by the LLM
        reply_lower = body["reply"].lower()
        is_refusal = (
            body["blocked"] is True
            or "skincoach" in reply_lower
            or "rituel" in reply_lower
            or "accompagne" in reply_lower
        )
        assert is_refusal, f"Off-topic was answered: {body['reply'][:200]}"

    def test_chat_politics_refusal(self, api_client, test_user_id):
        r = api_client.post(
            f"{BASE_URL}/api/users/{test_user_id}/chat",
            json={"message": "Parle-moi de politique française.", "history": [], "lang": "fr"},
            timeout=60,
        )
        assert r.status_code == 200
        body = r.json()
        # Keyword 'politique' is in the blocklist → should trigger immediate refusal
        assert body["blocked"] is True
        assert "skincoach" in body["reply"].lower()

    def test_chat_empty_message_400(self, api_client, test_user_id):
        r = api_client.post(
            f"{BASE_URL}/api/users/{test_user_id}/chat",
            json={"message": "", "history": [], "lang": "fr"},
            timeout=15,
        )
        assert r.status_code == 400
        assert r.json()["detail"] == "invalid_message_length"

    def test_chat_too_long_400(self, api_client, test_user_id):
        r = api_client.post(
            f"{BASE_URL}/api/users/{test_user_id}/chat",
            json={"message": "a" * 1500, "history": [], "lang": "fr"},
            timeout=15,
        )
        assert r.status_code == 400
        assert r.json()["detail"] == "invalid_message_length"
