# Iteration 14 retest: relaxed STT echo filter, .ogg/.flac accepted by /api/transcribe
import io
import os
import sys
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

from rate_exempt import exempt_headers

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env")
BASE_URL = (os.environ.get("EXPO_BACKEND_URL") or os.environ.get("EXPO_PUBLIC_BACKEND_URL")).rstrip("/")
JSON = {"Content-Type": "application/json"}

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import _is_prompt_echo, _STT_PROMPT  # noqa: E402


# --- BUG 4: echo filter unit checks (method level) ---
class TestEchoFilter:
    @pytest.mark.parametrize("q", [
        "Rétinol ou vitamine C ?",
        "SPF et vitamine C ?",
        "Acide hyaluronique ou niacinamide ?",
        "Niacinamide ?",
        "Sérum vitamine C, rétinol ou acide hyaluronique, lequel en premier ?",
        "Est-ce que je peux mettre du rétinol et de la vitamine C après le masque LED ?",
        "Combien de minutes dois-je porter le masque rouge le soir ?",
    ])
    def test_real_questions_pass(self, q):
        assert _is_prompt_echo(q) is False

    @pytest.mark.parametrize("echo", [
        _STT_PROMPT,
        "Nūr Protocol, masque LED, luminothérapie, photobiomodulation, sérum, niacinamide, rétinol, acide hyaluronique.",
        "Rétinol, acide hyaluronique, vitamine C, SPF, rides, éclat, grain de peau.",
    ])
    def test_echo_rejected(self, echo):
        assert _is_prompt_echo(echo) is True


def _tts_mp3(text):
    r = requests.post(f"{BASE_URL}/api/tts", json={"text": text, "lang": "fr"}, headers={**JSON, **exempt_headers()}, timeout=60)
    assert r.status_code == 200, r.text
    return requests.get(f"{BASE_URL}{r.json()['path']}", timeout=30).content


def _transcribe(name, data, mime):
    return requests.post(f"{BASE_URL}/api/transcribe", files={"audio": (name, data, mime)},
                         data={"lang": "fr"}, headers=exempt_headers(), timeout=90)


# --- BUG 4 end-to-end: short spoken questions full of hint words must survive ---
class TestShortQuestionsE2E:
    @pytest.mark.parametrize("q", ["Rétinol ou vitamine C ?", "Acide hyaluronique ou niacinamide ?"])
    def test_short_question_spoken(self, q):
        t = _transcribe("recording.mp3", _tts_mp3(q), "audio/mpeg")
        assert t.status_code == 200, t.text
        body = t.json()
        print(q, "->", body)
        assert body["text"] != "" and body["reason"] is None


# --- ISSUE 2: ogg / flac uploads keep their suffix and transcribe ---
class TestOggFlac:
    @pytest.fixture(scope="class")
    def pcm(self):
        sf = pytest.importorskip("soundfile")
        data, sr = sf.read(io.BytesIO(_tts_mp3("Combien de minutes dois-je porter le masque rouge le soir ?")))
        return sf, data, sr

    def test_ogg_upload_transcribes(self, pcm):
        sf, data, sr = pcm
        buf = io.BytesIO()
        sf.write(buf, data, sr, format="OGG", subtype="VORBIS")
        t = _transcribe("recording.ogg", buf.getvalue(), "audio/ogg")
        assert t.status_code == 200, t.text
        print("ogg ->", t.json())
        assert "masque" in t.json()["text"].lower()

    def test_flac_upload_transcribes(self, pcm):
        sf, data, sr = pcm
        buf = io.BytesIO()
        sf.write(buf, data, sr, format="FLAC")
        t = _transcribe("recording.flac", buf.getvalue(), "audio/flac")
        assert t.status_code == 200, t.text
        print("flac ->", t.json())
        assert "masque" in t.json()["text"].lower()
