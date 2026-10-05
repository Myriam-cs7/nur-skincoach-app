"""Nūr Protocol — Backend API Regression Suite."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
    # fallback: read /app/frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"')
                break
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not configured"
BASE_URL = BASE_URL.rstrip("/")
ADMIN_PIN = "NUR2026"


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Shopify status / verify-purchase gate ---------------------------------
class TestShopifyGate:
    def test_shopify_status_unconfigured(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/shopify-status", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["configured"] is False

    def test_verify_purchase_invalid_email(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/verify-purchase", json={"email": "not-an-email"}, timeout=15)
        assert r.status_code == 400
        assert r.json()["detail"] == "invalid_email"

    def test_verify_purchase_unconfigured_records_request(self, api_client):
        unique_email = f"test_unconfigured_{uuid.uuid4().hex[:8]}@nurtest.com"
        r = api_client.post(f"{BASE_URL}/api/verify-purchase", json={"email": unique_email}, timeout=15)
        assert r.status_code == 503, r.text
        assert r.json()["detail"] == "shopify_not_configured"

        # must appear in access-requests
        r2 = api_client.get(f"{BASE_URL}/api/admin/access-requests", params={"pin": ADMIN_PIN}, timeout=15)
        assert r2.status_code == 200
        emails = [x["email"] for x in r2.json()["requests"]]
        assert unique_email in emails


# --- Admin PIN auth --------------------------------------------------------
class TestAdminAuth:
    def test_admin_access_requests_wrong_pin(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/admin/access-requests", params={"pin": "WRONG"}, timeout=15)
        assert r.status_code == 403
        assert r.json()["detail"] == "invalid_pin"

    def test_admin_allow_email_wrong_pin(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/admin/allow-email",
            json={"pin": "WRONG", "email": "x@y.com"},
            timeout=15,
        )
        assert r.status_code == 403


# --- Allow-list flow + idempotency of verify-purchase ---------------------
class TestAllowListFlow:
    def test_allow_then_verify_then_idempotent(self, api_client):
        email = f"vip_{uuid.uuid4().hex[:8]}@nur.com"
        # 1) allow-list
        r = api_client.post(
            f"{BASE_URL}/api/admin/allow-email",
            json={"pin": ADMIN_PIN, "email": email, "first_name": "Lina"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True
        assert r.json()["email"] == email

        # 2) verify-purchase → 200 with user_id, intake/diag false
        r = api_client.post(f"{BASE_URL}/api/verify-purchase", json={"email": email}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        uid = body["user_id"]
        assert uid, "missing user_id"
        assert body["has_intake"] is False
        assert body["has_diagnosis"] is False
        assert body["first_name"] == "Lina"

        # 3) Call verify-purchase AGAIN → same user_id (idempotent)
        r2 = api_client.post(f"{BASE_URL}/api/verify-purchase", json={"email": email}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["user_id"] == uid, "verify-purchase is NOT idempotent"

    def test_allow_email_invalid(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/admin/allow-email",
            json={"pin": ADMIN_PIN, "email": "no-at"},
            timeout=15,
        )
        assert r.status_code == 400


# --- QR PNG endpoint -------------------------------------------------------
class TestQR:
    def test_qr_default_png(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/qr", timeout=20)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png")
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_qr_custom_size(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/qr",
            params={"data": "https://nurprotocol.com/activate", "size": 1500},
            timeout=20,
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png")
        # larger size → bigger payload than default
        assert len(r.content) > 2000

    def test_qr_size_too_small(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/qr", params={"size": 50}, timeout=15)
        assert r.status_code == 422

    def test_qr_size_too_large(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/qr", params={"size": 9000}, timeout=15)
        assert r.status_code == 422


# --- Progress / charts endpoint -------------------------------------------
class TestProgress:
    def test_demo_charts_user_progress(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/users/demo-charts-user/progress", timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert len(body["daily"]) == 28
        assert len(body["weekly"]) == 4
        for w in body["weekly"]:
            assert "label" in w and "sessions" in w and "target" in w
        assert isinstance(body["per_color_minutes"], dict)
        assert len(body["score_history"]) == 3
        assert body["total_sessions"] >= 1
        assert body["total_minutes"] >= 1
        # seed_demo_charts.py defines 5 active days (red, blue, yellow, red, violet)
        # Review request said "target_per_week=4" but actual seed = 5. 5 is correct.
        assert body["target_per_week"] == 5


# --- Legacy activation codes ----------------------------------------------
class TestActivation:
    def test_activate_demo_code(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/activate",
            json={"activation_code": "NUR-DEMO-2026"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user_id"]
        assert body["activation_code"] == "NUR-DEMO-2026"

    def test_activate_invalid_code(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/activate",
            json={"activation_code": "NOT-A-CODE"},
            timeout=15,
        )
        assert r.status_code == 403
        assert r.json()["detail"] == "invalid_activation_code"

    def test_activate_empty_code(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/activate", json={"activation_code": ""}, timeout=15)
        assert r.status_code == 400
