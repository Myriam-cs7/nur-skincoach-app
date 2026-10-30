"""Nūr Protocol — Backend API regression suite (OTP flow, iteration 2)."""
import os
import uuid
import time
import pytest
from rate_exempt import exempt_headers
import requests
from datetime import datetime, timezone, timedelta

# Resolve BASE_URL from the frontend env (public URL served through ingress)
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"')
                break
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not configured"
BASE_URL = BASE_URL.rstrip("/")
ADMIN_PIN = "NUR2026"

# Mongo direct access to read OTP codes and manipulate trial expiry
from pymongo import MongoClient  # noqa: E402

MONGO_URL = None
DB_NAME = None
with open("/app/backend/.env") as f:
    for line in f:
        if line.startswith("MONGO_URL="):
            MONGO_URL = line.split("=", 1)[1].strip().strip('"')
        if line.startswith("DB_NAME="):
            DB_NAME = line.split("=", 1)[1].strip().strip('"')

mdb = MongoClient(MONGO_URL)[DB_NAME]


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    s.headers.update(exempt_headers())
    return s


def _unique_email(prefix="test"):
    # Use Resend's sandbox 'delivered@resend.dev' with plus-addressing so each test
    # has a unique email the backend sees, while Resend still accepts the recipient.
    return f"delivered+{prefix}_{uuid.uuid4().hex[:8]}@resend.dev"


def _request_code(api_client, email, lang="fr", tries=3):
    """Really sends an e-mail. The provider rate-limits bursts, so retry a little
    and skip the test when the quota is exhausted (503 email_unavailable)."""
    last = None
    for i in range(tries):
        last = api_client.post(f"{BASE_URL}/api/auth/request-code",
                               json={"email": email, "lang": lang}, timeout=40)
        if last.status_code == 200:
            return last
        if last.status_code == 400:
            return last
        time.sleep(2 * (i + 1))
    if last is not None and last.status_code in (502, 503):
        pytest.skip(f"email provider quota exhausted ({last.status_code})")
    return last


def _seed_otp(email: str, code: str = "424242", lang: str = "fr") -> str:
    """Create an OTP straight in Mongo.

    The e-mail provider rate-limits bursts, so only the dedicated request-code
    tests actually send mail; every other test seeds the code it needs.
    """
    now = datetime.now(timezone.utc)
    mdb.otps.update_one(
        {"email": email},
        {"$set": {
            "email": email, "code": code, "lang": lang, "attempts": 0,
            "expires_at": (now + timedelta(seconds=600)).isoformat(),
            "last_sent_at": now.isoformat(),
            "window_start": now.isoformat(), "sends_in_window": 1,
        }},
        upsert=True,
    )
    return code


def _activate(api_client, email: str):
    """Seed a code then activate — returns the verify-code response.

    Protected /users/{id}/* routes are authorized against the issued session,
    so the token is placed on the session for the calls that follow.
    """
    code = _seed_otp(email)
    r = api_client.post(f"{BASE_URL}/api/auth/verify-code",
                        json={"email": email, "code": code}, timeout=20)
    if r.status_code == 200 and r.json().get("session_token"):
        api_client.headers["Authorization"] = f"Bearer {r.json()['session_token']}"
    return r


def _get_otp_code(email: str) -> str:
    doc = mdb.otps.find_one({"email": email})
    assert doc, f"No OTP record for {email}"
    return doc["code"]


# ---------- OTP: request-code ----------
class TestRequestCode:
    def test_request_code_valid_email(self, api_client):
        email = _unique_email("req_valid")
        r = _request_code(api_client, email)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["expires_in"] == 600
        assert body["resend_after"] == 60
        assert "@" in body["masked_email"]
        assert "•" in body["masked_email"] or "*" in body["masked_email"]

    def test_request_code_invalid_email(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/request-code", json={"email": "abc"}, timeout=15)
        assert r.status_code == 400
        assert r.json()["detail"] == "invalid_email"

    def test_resend_too_soon(self, api_client):
        email = _unique_email("resend")
        r1 = _request_code(api_client, email)
        assert r1.status_code == 200
        r2 = api_client.post(f"{BASE_URL}/api/auth/request-code", json={"email": email}, timeout=15)
        assert r2.status_code == 429
        assert r2.json()["detail"] == "resend_too_soon"


# ---------- OTP: verify-code ----------
class TestVerifyCode:
    def test_verify_invalid_code(self, api_client):
        email = _unique_email("vfy_bad")
        _seed_otp(email)
        r2 = api_client.post(f"{BASE_URL}/api/auth/verify-code", json={"email": email, "code": "000000"}, timeout=15)
        assert r2.status_code == 400
        assert r2.json()["detail"] == "invalid_code"

    def test_verify_valid_code_creates_trial(self, api_client):
        email = _unique_email("vfy_ok")
        code = _seed_otp(email)
        r2 = api_client.post(f"{BASE_URL}/api/auth/verify-code", json={"email": email, "code": code}, timeout=15)
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["access_status"] == "trial"
        assert body["trial_days_left"] == 14
        assert body["has_intake"] is False
        assert body["has_diagnosis"] is False
        assert body["user_id"]

    def test_code_consumed_after_success(self, api_client):
        email = _unique_email("vfy_consume")
        code = _seed_otp(email)
        r1 = api_client.post(f"{BASE_URL}/api/auth/verify-code", json={"email": email, "code": code}, timeout=15)
        assert r1.status_code == 200
        # Re-use same code → should now be 404 because OTP doc was deleted
        r2 = api_client.post(f"{BASE_URL}/api/auth/verify-code", json={"email": email, "code": code}, timeout=15)
        assert r2.status_code == 404
        assert r2.json()["detail"] == "no_code_requested"

    def test_verify_no_code_requested(self, api_client):
        email = _unique_email("vfy_never")
        r = api_client.post(f"{BASE_URL}/api/auth/verify-code", json={"email": email, "code": "123456"}, timeout=15)
        assert r.status_code == 404
        assert r.json()["detail"] == "no_code_requested"


# ---------- OTP: idempotence (same email → same user_id) ----------
class TestOtpIdempotence:
    def test_same_email_returns_same_user_id(self, api_client):
        email = _unique_email("idem")
        r1 = _activate(api_client, email)
        assert r1.status_code == 200
        uid1 = r1.json()["user_id"]

        r2 = _activate(api_client, email)
        assert r2.status_code == 200
        uid2 = r2.json()["user_id"]

        assert uid1 == uid2, f"User duplicated: {uid1} != {uid2}"
        # Only one user doc for this email
        count = mdb.users.count_documents({"shopify_email": email})
        assert count == 1


# ---------- Access status & trial expiry ----------
class TestAccess:
    def test_access_trial_then_paused(self, api_client):
        email = _unique_email("access")
        r = _activate(api_client, email)
        assert r.status_code == 200
        uid = r.json()["user_id"]

        # 1) initial GET /access → trial, 14 days left
        g = api_client.get(f"{BASE_URL}/api/users/{uid}/access", timeout=15)
        assert g.status_code == 200
        body = g.json()
        assert body["access_status"] == "trial"
        assert body["trial_days_left"] == 14

        # 2) backdate trial_expires_at → paused
        past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        mdb.users.update_one({"id": uid}, {"$set": {"trial_expires_at": past}})
        g2 = api_client.get(f"{BASE_URL}/api/users/{uid}/access", timeout=15)
        assert g2.status_code == 200
        b2 = g2.json()
        assert b2["access_status"] == "paused"
        assert b2["trial_days_left"] == 0


# ---------- Link-order (Shopify not configured) ----------
class TestLinkOrder:
    def _mk_user(self, api_client):
        email = _unique_email("linkord")
        return _activate(api_client, email).json()["user_id"]

    def test_link_order_shopify_unconfigured(self, api_client):
        uid = self._mk_user(api_client)
        r = api_client.post(
            f"{BASE_URL}/api/users/{uid}/link-order",
            json={"email": "customer@example.com"},
            timeout=20,
        )
        assert r.status_code == 503, r.text
        assert r.json()["detail"] == "shopify_not_configured"

    def test_link_order_missing_fields(self, api_client):
        uid = self._mk_user(api_client)
        r = api_client.post(f"{BASE_URL}/api/users/{uid}/link-order", json={}, timeout=15)
        assert r.status_code == 400
        assert r.json()["detail"] == "email_or_order_required"


# ---------- Partner / demo codes ----------
class TestActivationCodes:
    def test_partner_code_multi_use(self, api_client):
        r1 = api_client.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-CREATOR"}, timeout=15)
        assert r1.status_code == 200, r1.text
        uid1 = r1.json()["user_id"]
        r2 = api_client.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-CREATOR"}, timeout=15)
        assert r2.status_code == 200
        uid2 = r2.json()["user_id"]
        assert uid1 != uid2, "NUR-CREATOR must create a new profile each time"

    def test_demo_code_single_use(self, api_client):
        r1 = api_client.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-DEMO-2026"}, timeout=15)
        assert r1.status_code == 200
        uid1 = r1.json()["user_id"]
        r2 = api_client.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-DEMO-2026"}, timeout=15)
        assert r2.status_code == 200
        uid2 = r2.json()["user_id"]
        assert uid1 == uid2, "NUR-DEMO-2026 must return same user_id (single-use)"

    def test_invalid_code(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/activate", json={"activation_code": "XXX-000"}, timeout=15)
        assert r.status_code == 403
        assert r.json()["detail"] == "invalid_activation_code"


# ---------- LED library (7 modes, no 830/1072 nm) ----------
class TestLedLibrary:
    def test_led_library_exact_seven(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/led-library", timeout=15)
        assert r.status_code == 200
        colors = r.json()["colors"]
        assert len(colors) == 7
        ids = [c["id"] for c in colors]
        assert ids == ["red", "blue", "green", "yellow", "cyan", "violet", "white"]
        by_id = {c["id"]: c["wavelength"] for c in colors}
        assert by_id["red"] == "633 nm"
        assert by_id["blue"] == "415 nm"
        assert by_id["green"] == "532 nm"
        assert by_id["yellow"] == "590 nm"
        assert by_id["cyan"] == "490 nm"
        assert "415" in by_id["violet"] and "633" in by_id["violet"]
        assert "spectre" in by_id["white"].lower() or "spectrum" in by_id["white"].lower()
        payload = r.text
        assert "830" not in payload
        assert "1072" not in payload


# ---------- Progress endpoint ----------
class TestProgress:
    def test_demo_charts_user_progress(self, api_client):
        # The demo profile is read through its own session, like any client
        act = api_client.post(f"{BASE_URL}/api/activate",
                              json={"activation_code": "NUR-DEMO-2026"}, timeout=20)
        assert act.status_code == 200, act.text
        body = act.json()
        if body["user_id"] != "demo-charts-user":
            pytest.skip("NUR-DEMO-2026 no longer maps to the charts demo profile")
        r = api_client.get(f"{BASE_URL}/api/users/demo-charts-user/progress",
                           headers={"Authorization": f"Bearer {body['session_token']}"}, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert len(body["daily"]) == 28
        assert len(body["weekly"]) == 4
        assert isinstance(body["per_color_minutes"], dict)
        assert len(body["score_history"]) == 3
        assert body["total_sessions"] >= 1
        assert body["total_minutes"] >= 1


# ---------- QR endpoints ----------
class TestQR:
    def test_qr_png(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/qr", timeout=20)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png")
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_qr_svg(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/qr.svg", timeout=15)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/svg+xml")
        assert b"<svg" in r.content
