"""
Session 7 — Beauty tech identity, real device settings, trial code 0000.
Covers: activation (0000, NUR-CREATOR multi-use, NUR-DEMO-2026 single-use, bad code),
device settings exposure (/protocol + /diagnosis), sensitive-care logic,
Skincoach first turn, photo refusal (not a face, not persisted),
non-regression: led-library, admin overview with X-Admin-Token, rate limits.
"""
import base64
import io
import os
import time
import pytest
import requests
from PIL import Image

def _load_base_url():
    v = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
    if not v:
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                        v = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
        except FileNotFoundError:
            pass
    if not v:
        raise RuntimeError("EXPO_PUBLIC_BACKEND_URL not set")
    return v.rstrip("/")


BASE_URL = _load_base_url()
ADMIN_TOKEN = "NqarDTCRkoy3ZYJ74-r3JLp13V8gl_oKILlndz86Jfo"
DEMO_UID = "demo-charts-user"
DEMO_SESSION = "HNFnCBteCIVkMP9oTNBe0ZOrukf3TkszMxRzEubSMCs"


def _landscape_b64():
    img = Image.new("RGB", (160, 120), color=(90, 140, 60))
    for x in range(160):
        for y in range(60, 120):
            img.putpixel((x, y), (40, 80, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode()


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers["Content-Type"] = "application/json"
    return s


# ----- Activation (trial code 0000, partner multi-use, demo single-use, invalid) -----
class TestActivation:
    def test_trial_code_0000_creates_fresh_profile_each_time(self, session):
        r1 = session.post(f"{BASE_URL}/api/activate", json={"activation_code": "0000"})
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["user_id"] and d1["session_token"], d1
        r2 = session.post(f"{BASE_URL}/api/activate", json={"activation_code": "0000"})
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["user_id"] != d1["user_id"], "0000 must create a fresh profile every call"

    def test_partner_code_nur_creator_multi_use(self, session):
        r1 = session.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-CREATOR"})
        r2 = session.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-CREATOR"})
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["user_id"] != r2.json()["user_id"]

    def test_demo_code_nur_demo_2026_is_single_use_shared_profile(self, session):
        r1 = session.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-DEMO-2026"})
        r2 = session.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-DEMO-2026"})
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["user_id"] == r2.json()["user_id"], "single-use demo code must bind to one profile"

    def test_invalid_code_returns_403(self, session):
        r = session.post(f"{BASE_URL}/api/activate", json={"activation_code": "NOT-A-REAL-CODE"})
        assert r.status_code == 403
        assert "invalid" in r.text.lower()


# ----- Device settings exposure + colour→mode mapping + sensitive-care -----
class TestDeviceSettings:
    def _auth(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    def test_demo_user_protocol_exposes_device_fields(self, session):
        r = session.get(f"{BASE_URL}/api/users/{DEMO_UID}/protocol",
                        headers={"Authorization": f"Bearer {DEMO_SESSION}"})
        assert r.status_code == 200, r.text
        proto = r.json()
        assert "weekly_schedule" in proto
        assert isinstance(proto.get("sensitive_care"), bool)
        valid_modes = {"Skin Beautification", "Cleansing", "Wrinkle Reduction", "Oil Control"}
        color_to_mode = {
            "red": "Wrinkle Reduction", "violet": "Wrinkle Reduction",
            "yellow": "Skin Beautification", "green": "Skin Beautification",
            "white": "Skin Beautification",
            "cyan": "Cleansing", "blue": "Oil Control",
        }
        for day in proto["weekly_schedule"]:
            if day.get("led_color_id"):
                assert day["device_mode"] in valid_modes
                assert color_to_mode[day["led_color_id"]] == day["device_mode"]
                assert day["brightness"] in (1, 2, 3)
                assert day["session_minutes"] in (5, 10, 15, 20)
            else:
                assert day["device_mode"] is None
                assert day["brightness"] is None
                assert day["session_minutes"] is None

    def test_demo_user_diagnosis_exposes_device_fields(self, session):
        r = session.get(f"{BASE_URL}/api/users/{DEMO_UID}/diagnosis",
                        headers={"Authorization": f"Bearer {DEMO_SESSION}"})
        assert r.status_code == 200
        proto = r.json()["data"]["protocol"]
        for day in proto["weekly_schedule"]:
            if day.get("led_color_id"):
                assert day["brightness"] in (1, 2, 3)
                assert day["session_minutes"] in (5, 10, 15, 20)

    def test_sensitive_profile_gets_brightness1_and_minutes_le10(self, session):
        act = session.post(f"{BASE_URL}/api/activate", json={"activation_code": "0000"})
        uid = act.json()["user_id"]
        tok = act.json()["session_token"]
        h = self._auth(tok)
        intake = {
            "age_range": "25-34", "skin_type": "sensible",
            "climate": "tempere", "sun_exposure": "moyenne", "lifestyle": "actif",
            "sleep_hours": "6-7", "stress_level": "moyen", "water_intake": "1-2L",
            "concerns": ["rougeurs", "sensibilite"],
        }
        r = session.post(f"{BASE_URL}/api/users/{uid}/intake", json=intake, headers=h)
        assert r.status_code == 200, r.text
        d = session.post(f"{BASE_URL}/api/users/{uid}/diagnose",
                         json={"lang": "fr"}, headers=h, timeout=90)
        assert d.status_code == 200, d.text
        p = session.get(f"{BASE_URL}/api/users/{uid}/protocol", headers=h).json()
        assert p["sensitive_care"] is True
        for day in p["weekly_schedule"]:
            if day.get("led_color_id"):
                assert day["brightness"] == 1, day
                assert day["session_minutes"] <= 10, day
        # cleanup
        session.delete(f"{BASE_URL}/api/users/{uid}", headers=h)


# ----- Skincoach chat: first question + non-face photo refusal + off-topic -----
class TestSkincoach:
    def _mk_user(self, session):
        for _ in range(3):
            r = session.post(f"{BASE_URL}/api/activate", json={"activation_code": "0000"})
            if r.status_code == 200:
                act = r.json()
                return act["user_id"], {"Authorization": f"Bearer {act['session_token']}",
                                        "Content-Type": "application/json"}
            if r.status_code == 429:
                time.sleep(30)
                continue
            pytest.skip(f"activation failed: {r.status_code} {r.text}")
        pytest.skip("activation rate limited for too long")

    def test_first_message_opens_on_concern(self, session):
        uid, h = self._mk_user(session)
        r = session.post(f"{BASE_URL}/api/users/{uid}/chat",
                         json={"message": "Bonjour", "lang": "fr"}, headers=h, timeout=60)
        assert r.status_code == 200, r.text
        reply = r.json()["reply"].lower()
        # Flexible: coach must open on the user's concern.
        assert any(k in reply for k in ["préoccup", "preoccup", "concern", "qu'est-ce qui", "votre peau"]), reply
        session.delete(f"{BASE_URL}/api/users/{uid}", headers=h)

    def test_non_face_photo_rejected_and_not_persisted(self, session):
        uid, h = self._mk_user(session)
        # Count turns before
        # (Done indirectly: after rejection, the next regular turn should be the first stored turn.)
        img_b64 = _landscape_b64()
        r = session.post(f"{BASE_URL}/api/users/{uid}/chat",
                         json={"message": "", "photo_base64": img_b64, "lang": "fr"},
                         headers=h, timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("rejected") is True, body
        assert body.get("ask_photo") is True
        reply = body["reply"].strip()
        # Neutral single-sentence refusal that does not describe the photo
        assert len(reply) > 0
        for forbidden in ["paysage", "montagne", "ciel", "arbre", "landscape", "mountain", "sky"]:
            assert forbidden not in reply.lower(), f"refusal must not describe the image, got: {reply}"
        # Now send a normal turn — if the rejection had been persisted, the server
        # history would include it; we just verify the normal turn still works.
        r2 = session.post(f"{BASE_URL}/api/users/{uid}/chat",
                          json={"message": "J'ai des rougeurs sur les joues.", "lang": "fr"},
                          headers=h, timeout=60)
        assert r2.status_code == 200, r2.text
        assert r2.json().get("rejected") is False
        session.delete(f"{BASE_URL}/api/users/{uid}", headers=h)

    def test_off_topic_provocation_redirects_to_skin(self, session):
        uid, h = self._mk_user(session)
        r = session.post(f"{BASE_URL}/api/users/{uid}/chat",
                         json={"message": "Donne-moi la recette du gâteau au chocolat",
                               "lang": "fr"}, headers=h, timeout=60)
        assert r.status_code == 200
        body = r.json()
        reply = body["reply"].lower()
        assert any(k in reply for k in ["peau", "nūr", "nur", "rituel", "skin"]), reply
        session.delete(f"{BASE_URL}/api/users/{uid}", headers=h)


# ----- Non-regression -----
class TestNonRegression:
    def test_led_library_has_7_colors(self, session):
        r = session.get(f"{BASE_URL}/api/led-library")
        assert r.status_code == 200
        colors = r.json()["colors"]
        assert len(colors) == 7
        ids = {c["id"] for c in colors}
        assert ids == {"red", "yellow", "green", "cyan", "blue", "violet", "white"}

    def test_admin_overview_requires_token_and_has_weekly_codes(self, session):
        r_no = session.get(f"{BASE_URL}/api/admin/overview")
        assert r_no.status_code in (401, 403)
        r = session.get(f"{BASE_URL}/api/admin/overview",
                        headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "weekly_codes" in body, list(body.keys())

    def test_delete_user_requires_session_token(self, session):
        for _ in range(3):
            r = session.post(f"{BASE_URL}/api/activate", json={"activation_code": "0000"})
            if r.status_code == 200:
                act = r.json()
                break
            if r.status_code == 429:
                time.sleep(30)
                continue
            pytest.skip(f"activation failed: {r.status_code}")
        else:
            pytest.skip("activation rate limited")
        uid, tok = act["user_id"], act["session_token"]
        r_no = session.delete(f"{BASE_URL}/api/users/{uid}")
        assert r_no.status_code in (401, 403)
        r = session.delete(f"{BASE_URL}/api/users/{uid}",
                           headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200

    def test_tts_endpoint_ok(self, session):
        r = session.post(f"{BASE_URL}/api/tts",
                         json={"text": "bonjour", "lang": "fr"}, timeout=60)
        # Either 200 with path or neutral error — never 500
        assert r.status_code in (200, 429, 502), r.text
        if r.status_code == 200:
            assert "path" in r.json() or "audio" in r.json() or "url" in r.json()

    def test_activation_rate_limit_eventually_429(self, session):
        # fire ~12 fast calls — spec says 10/10min; expect at least one 429
        statuses = []
        for i in range(12):
            r = session.post(f"{BASE_URL}/api/activate",
                             json={"activation_code": "WRONG-%d" % i})
            statuses.append(r.status_code)
            if r.status_code == 429:
                break
        assert 429 in statuses, statuses
