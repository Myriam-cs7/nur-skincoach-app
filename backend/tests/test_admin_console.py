"""Tests for admin console + Shopify webhook + order codes."""
import os
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get("EXPO_PUBLIC_BACKEND_URL") else None
# Fallback: use the frontend-exposed URL from frontend/.env
if not BASE_URL:
    fe = Path(__file__).resolve().parent.parent.parent / "frontend" / ".env"
    for line in fe.read_text().splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
            break

PIN = os.environ.get("ADMIN_PIN", "NUR2026")
TEST_EMAIL_1 = f"delivered+t1admin{uuid.uuid4().hex[:6]}@resend.dev"
TEST_EMAIL_2 = f"delivered+t1admin{uuid.uuid4().hex[:6]}@resend.dev"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Admin overview ----------
class TestAdminOverview:
    def test_overview_ok(self, session):
        r = session.get(f"{BASE_URL}/api/admin/overview", params={"pin": PIN})
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("counts", "users", "partner_codes", "order_codes", "requests", "allowed", "shopify"):
            assert k in data

    def test_overview_bad_pin(self, session):
        r = session.get(f"{BASE_URL}/api/admin/overview", params={"pin": "WRONG"})
        assert r.status_code == 403
        assert r.json().get("detail") == "invalid_pin"

    def test_overview_missing_pin(self, session):
        r = session.get(f"{BASE_URL}/api/admin/overview")
        assert r.status_code == 422


# ---------- simulate-order ----------
class TestSimulateOrder:
    issued_codes_1 = []
    issued_codes_3 = []

    def test_simulate_qty1(self, session):
        r = session.post(f"{BASE_URL}/api/admin/simulate-order",
                         json={"pin": PIN, "email": TEST_EMAIL_1, "quantity": 1, "order_name": f"#T{uuid.uuid4().hex[:6]}"})
        if r.status_code == 503 and r.json().get("detail") == "email_unavailable":
            pytest.skip("email provider quota exhausted (not a backend bug)")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert len(body["codes"]) == 1
        for c in body["codes"]:
            # Format NUR-XXXX-XXXX (13 chars)
            assert c.startswith("NUR-")
            assert len(c) == 13
            parts = c.split("-")
            assert len(parts) == 3 and len(parts[1]) == 4 and len(parts[2]) == 4
        TestSimulateOrder.issued_codes_1 = body["codes"]

    def test_simulate_qty3(self, session):
        r = session.post(f"{BASE_URL}/api/admin/simulate-order",
                         json={"pin": PIN, "email": TEST_EMAIL_2, "quantity": 3, "order_name": f"#T{uuid.uuid4().hex[:6]}"})
        if r.status_code == 503 and r.json().get("detail") == "email_unavailable":
            pytest.skip("email provider quota exhausted (not a backend bug)")
        assert r.status_code == 200, r.text
        body = r.json()
        assert len(body["codes"]) == 3
        TestSimulateOrder.issued_codes_3 = body["codes"]

    def test_simulate_cap_at_10(self, session):
        r = session.post(f"{BASE_URL}/api/admin/simulate-order",
                         json={"pin": PIN, "email": f"delivered+cap{uuid.uuid4().hex[:6]}@resend.dev",
                               "quantity": 25, "order_name": f"#CAP{uuid.uuid4().hex[:4]}"})
        if r.status_code == 503 and r.json().get("detail") == "email_unavailable":
            pytest.skip("email provider quota exhausted (not a backend bug)")
        assert r.status_code == 200
        assert len(r.json()["codes"]) == 10

    def test_simulate_bad_email(self, session):
        r = session.post(f"{BASE_URL}/api/admin/simulate-order",
                         json={"pin": PIN, "email": "pas-un-mail", "quantity": 1})
        assert r.status_code == 400

    def test_simulate_bad_pin(self, session):
        r = session.post(f"{BASE_URL}/api/admin/simulate-order",
                         json={"pin": "NOPE", "email": TEST_EMAIL_1, "quantity": 1})
        assert r.status_code == 403

    def test_simulate_new_sim_id_generates_fresh_codes(self, session):
        """Admin simulate uses a fresh sim-* order id each call, so even same order_name produces new codes."""
        name = f"#SAME{uuid.uuid4().hex[:4]}"
        email = f"delivered+rep{uuid.uuid4().hex[:5]}@resend.dev"
        r1 = session.post(f"{BASE_URL}/api/admin/simulate-order",
                          json={"pin": PIN, "email": email, "quantity": 1, "order_name": name})
        r2 = session.post(f"{BASE_URL}/api/admin/simulate-order",
                          json={"pin": PIN, "email": email, "quantity": 1, "order_name": name})
        if 503 in (r1.status_code, r2.status_code):
            pytest.skip("email provider quota exhausted (not a backend bug)")
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["codes"] != r2.json()["codes"]
        assert r2.json()["already_issued"] is False


# ---------- Shopify webhook (secret empty → 503) ----------
class TestShopifyWebhook:
    def test_webhook_not_configured(self, session):
        r = session.post(f"{BASE_URL}/api/shopify/webhook/orders-paid",
                         data=b'{"id":"abc"}', headers={"Content-Type": "application/json"})
        assert r.status_code == 503
        assert r.json().get("detail") == "webhook_not_configured"


# ---------- Partner codes ----------
PARTNER_CODE = f"NUR-TEST-{uuid.uuid4().hex[:4].upper()}"


class TestPartnerCode:
    def test_create_partner_code(self, session):
        r = session.post(f"{BASE_URL}/api/admin/partner-code",
                         json={"pin": PIN, "code": PARTNER_CODE, "label": "TEST partner"})
        assert r.status_code == 200
        doc = r.json()["code"]
        assert doc["code"] == PARTNER_CODE
        assert doc["kind"] == "partner"
        assert doc["multi_use"] is True
        assert doc["active"] is True

    def test_too_short(self, session):
        r = session.post(f"{BASE_URL}/api/admin/partner-code",
                         json={"pin": PIN, "code": "ABC"})
        assert r.status_code == 400

    def test_revoke_then_activate_blocked(self, session):
        r = session.post(f"{BASE_URL}/api/admin/code-state",
                         json={"pin": PIN, "code": PARTNER_CODE, "active": False})
        assert r.status_code == 200
        r2 = session.post(f"{BASE_URL}/api/activate",
                          json={"activation_code": PARTNER_CODE})
        assert r2.status_code == 403
        assert r2.json()["detail"] == "invalid_activation_code"

    def test_reactivate(self, session):
        r = session.post(f"{BASE_URL}/api/admin/code-state",
                         json={"pin": PIN, "code": PARTNER_CODE, "active": True})
        assert r.status_code == 200
        r2 = session.post(f"{BASE_URL}/api/activate",
                          json={"activation_code": PARTNER_CODE})
        assert r2.status_code == 200
        assert r2.json()["user_id"]

    def test_unknown_code_state(self, session):
        r = session.post(f"{BASE_URL}/api/admin/code-state",
                         json={"pin": PIN, "code": "NUR-UNKNOWN-XXXX", "active": True})
        assert r.status_code == 404


# ---------- Resend codes ----------
class TestResendCodes:
    def test_resend_existing(self, session):
        # TEST_EMAIL_1 was fed by simulate_qty1
        r = session.post(f"{BASE_URL}/api/admin/resend-codes",
                         json={"pin": PIN, "email": TEST_EMAIL_1})
        if r.status_code == 503 and r.json().get("detail") == "email_unavailable":
            pytest.skip("email provider quota exhausted (not a backend bug)")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert len(body["codes"]) >= 1

    def test_resend_no_code(self, session):
        r = session.post(f"{BASE_URL}/api/admin/resend-codes",
                         json={"pin": PIN, "email": f"delivered+nope{uuid.uuid4().hex[:5]}@resend.dev"})
        assert r.status_code == 404
        assert r.json()["detail"] == "no_code_for_email"

    def test_resend_bad_email(self, session):
        r = session.post(f"{BASE_URL}/api/admin/resend-codes",
                         json={"pin": PIN, "email": "pas-un-mail"})
        assert r.status_code == 400


# ---------- Order-code activation (single-use) ----------
class TestOrderCodeActivation:
    def test_activate_order_code_single_use(self, session):
        if not TestSimulateOrder.issued_codes_1:
            pytest.skip("no order code (email provider quota exhausted earlier)")
        code = TestSimulateOrder.issued_codes_1[0]
        r1 = session.post(f"{BASE_URL}/api/activate", json={"activation_code": code})
        assert r1.status_code == 200, r1.text
        user1 = r1.json()
        assert user1["user_id"]
        # Second call returns same user (single-use)
        r2 = session.post(f"{BASE_URL}/api/activate", json={"activation_code": code})
        assert r2.status_code == 200
        assert r2.json()["user_id"] == user1["user_id"]

        # Verify order_ref and verified status
        u = session.get(f"{BASE_URL}/api/users/{user1['user_id']}").json()
        assert u.get("access_status") == "verified"
        assert u.get("order_ref", "").startswith("Commande ")

        # Code now shows used=true in overview
        ov = session.get(f"{BASE_URL}/api/admin/overview", params={"pin": PIN}).json()
        match = [oc for oc in ov["order_codes"] if oc["code"] == code]
        assert match and match[0]["used"] is True


# ---------- Non-regression ----------
class TestNonRegression:
    def test_led_library(self, session):
        r = session.get(f"{BASE_URL}/api/led-library")
        assert r.status_code == 200
        colors = r.json()["colors"]
        assert len(colors) == 7
        ids = {c["id"] for c in colors}
        assert ids == {"red", "blue", "green", "yellow", "cyan", "violet", "white"}

    def test_progress_on_order_code_user(self, session):
        # activate a fresh order code to get a user
        if not TestSimulateOrder.issued_codes_3:
            pytest.skip("no order code available")
        code = TestSimulateOrder.issued_codes_3[0]
        r = session.post(f"{BASE_URL}/api/activate", json={"activation_code": code})
        assert r.status_code == 200
        uid = r.json()["user_id"]
        pr = session.get(f"{BASE_URL}/api/users/{uid}/progress")
        assert pr.status_code == 200
        data = pr.json()
        for k in ("daily", "weekly", "per_color_minutes", "score_history", "total_sessions", "total_minutes"):
            assert k in data
        assert len(data["daily"]) == 28
        assert len(data["weekly"]) == 4
