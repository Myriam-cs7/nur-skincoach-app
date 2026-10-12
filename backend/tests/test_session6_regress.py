"""Nūr Protocol — Session 6 UI/UX refresh backend regression suite.

Covers:
- NOUVEAU B — weekly_codes in /api/admin/overview (list of 8 ISO weeks, consistency)
- NOUVEAU C — Shopify webhook now 401 without signature (secret installed), 200 with valid HMAC
- NOUVEAU A — DELETE /api/users/{id} (used by delete-data button)
- Non-regression quick pass: Bearer gates, admin gate, led-library (7 colors)

Run with: pytest /app/backend/tests/test_session6_regress.py -v
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import pytest
import requests


BASE_URL: Optional[str] = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"')
            break
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not configured"
BASE_URL = BASE_URL.rstrip("/")

ADMIN_TOKEN = None
SHOPIFY_WEBHOOK_SECRET = None
for line in Path("/app/backend/.env").read_text().splitlines():
    if line.startswith("ADMIN_TOKEN="):
        ADMIN_TOKEN = line.split("=", 1)[1].strip().strip('"')
    if line.startswith("SHOPIFY_WEBHOOK_SECRET="):
        SHOPIFY_WEBHOOK_SECRET = line.split("=", 1)[1].strip().strip('"')
assert ADMIN_TOKEN, "ADMIN_TOKEN missing"
assert SHOPIFY_WEBHOOK_SECRET, "SHOPIFY_WEBHOOK_SECRET missing (session 6)"


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _activate_creator(api) -> tuple[str, str]:
    r = api.post(f"{BASE_URL}/api/activate", json={"activation_code": "NUR-CREATOR"}, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    return body["user_id"], body["session_token"]


def _bearer(tok: str) -> dict:
    return {"Authorization": f"Bearer {tok}"}


def _admin() -> dict:
    return {"X-Admin-Token": ADMIN_TOKEN}


# --------- NOUVEAU B — weekly_codes in /admin/overview ----------
class TestWeeklyCodes:
    def test_overview_contains_weekly_codes_list_of_8(self, api):
        r = api.get(f"{BASE_URL}/api/admin/overview", headers=_admin(), timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "weekly_codes" in body
        wc = body["weekly_codes"]
        assert isinstance(wc, list) and len(wc) == 8, f"expected 8 weeks, got {len(wc)}"
        # Check structure
        for w in wc:
            assert set(["week_start", "label", "issued", "activated"]).issubset(w.keys())
            assert isinstance(w["issued"], int)
            assert isinstance(w["activated"], int)
            # label starts with S (ISO week number)
            assert w["label"].startswith("S")

    def test_weekly_codes_sorted_oldest_to_newest(self, api):
        r = api.get(f"{BASE_URL}/api/admin/overview", headers=_admin(), timeout=20)
        assert r.status_code == 200
        wc = r.json()["weekly_codes"]
        starts = [w["week_start"] for w in wc]
        assert starts == sorted(starts), f"weekly_codes not sorted ascending: {starts}"
        # Last week must be current week's monday
        today = date.today()
        expected_last = (today - timedelta(days=today.weekday())).isoformat()
        assert starts[-1] == expected_last, f"last week should be {expected_last}, got {starts[-1]}"

    def test_weekly_codes_consistency_with_counts(self, api):
        r = api.get(f"{BASE_URL}/api/admin/overview", headers=_admin(), timeout=20)
        body = r.json()
        wc = body["weekly_codes"]
        counts = body["counts"]
        sum_issued = sum(w["issued"] for w in wc)
        sum_activated = sum(w["activated"] for w in wc)
        assert sum_issued <= counts["order_codes"], (
            f"sum(issued)={sum_issued} > order_codes={counts['order_codes']}"
        )
        assert sum_activated <= counts["order_codes"], (
            f"sum(activated)={sum_activated} > order_codes={counts['order_codes']}"
        )

    def test_simulate_order_increments_current_week_issued(self, api):
        r0 = api.get(f"{BASE_URL}/api/admin/overview", headers=_admin(), timeout=20)
        before = r0.json()["weekly_codes"][-1]["issued"]
        email = f"delivered+week_{uuid.uuid4().hex[:6]}@resend.dev"
        rs = api.post(
            f"{BASE_URL}/api/admin/simulate-order",
            headers=_admin(),
            json={"email": email, "quantity": 1, "lang": "fr"},
            timeout=30,
        )
        if rs.status_code == 503:
            pytest.skip("Resend quota — email_unavailable (test non-conclusive, not a failure)")
        assert rs.status_code == 200, rs.text
        r1 = api.get(f"{BASE_URL}/api/admin/overview", headers=_admin(), timeout=20)
        after = r1.json()["weekly_codes"][-1]["issued"]
        assert after == before + 1, f"issued did not increment: before={before}, after={after}"


# --------- NOUVEAU C — Shopify signed webhook ----------
class TestShopifyWebhookSigned:
    def test_no_signature_returns_401(self, api):
        """Previously 503 because secret was missing. Secret is installed → must be 401."""
        r = api.post(
            f"{BASE_URL}/api/shopify/webhook/orders-paid",
            data=b'{"id":"abc","financial_status":"paid"}',
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        assert r.status_code == 401, f"expected 401 (signature missing), got {r.status_code}: {r.text}"

    def test_wrong_signature_returns_401(self, api):
        r = api.post(
            f"{BASE_URL}/api/shopify/webhook/orders-paid",
            data=b'{"id":"abc","financial_status":"paid"}',
            headers={"Content-Type": "application/json", "X-Shopify-Hmac-Sha256": "AAAA"},
            timeout=10,
        )
        assert r.status_code == 401

    def test_valid_signature_issues_codes_then_idempotent(self, api):
        order_id = f"wh-{uuid.uuid4().hex[:10]}"
        email = f"delivered+hook_{uuid.uuid4().hex[:6]}@resend.dev"
        payload = {
            "id": order_id,
            "name": f"#WH{secrets_fallback(1000, 9999)}",
            "email": email,
            "financial_status": "paid",
            "customer": {"first_name": "WH", "email": email},
            "line_items": [{"quantity": 2, "title": "Nūr Mask"}],
        }
        raw = json.dumps(payload).encode("utf-8")
        sig = base64.b64encode(
            hmac.new(SHOPIFY_WEBHOOK_SECRET.encode(), raw, hashlib.sha256).digest()
        ).decode()
        r = api.post(
            f"{BASE_URL}/api/shopify/webhook/orders-paid",
            data=raw,
            headers={"Content-Type": "application/json", "X-Shopify-Hmac-Sha256": sig},
            timeout=30,
        )
        if r.status_code == 503:
            pytest.skip("Resend quota — email_unavailable (non-conclusive)")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("already_issued") is False, body
        # One code per article (quantity=2)
        assert len(body.get("codes") or []) == 2, body

        # Replay same order_id → already_issued=true
        r2 = api.post(
            f"{BASE_URL}/api/shopify/webhook/orders-paid",
            data=raw,
            headers={"Content-Type": "application/json", "X-Shopify-Hmac-Sha256": sig},
            timeout=20,
        )
        assert r2.status_code == 200
        assert r2.json().get("already_issued") is True


def secrets_fallback(a: int, b: int) -> int:
    import random
    return random.randint(a, b)


# --------- NOUVEAU A — DELETE /api/users/{id} ----------
class TestDeleteUser:
    def test_delete_user_requires_bearer(self, api):
        uid, _ = _activate_creator(api)
        r = api.delete(f"{BASE_URL}/api/users/{uid}", timeout=10)
        assert r.status_code == 401

    def test_delete_user_other_user_forbidden(self, api):
        uid_a, tok_a = _activate_creator(api)
        uid_b, _ = _activate_creator(api)
        r = api.delete(f"{BASE_URL}/api/users/{uid_b}", headers=_bearer(tok_a), timeout=10)
        assert r.status_code == 403

    def test_delete_user_success_then_404(self, api):
        uid, tok = _activate_creator(api)
        r = api.delete(f"{BASE_URL}/api/users/{uid}", headers=_bearer(tok), timeout=15)
        assert r.status_code == 200, r.text
        # After deletion, session token is dead → 401 (session_required/invalid_session)
        r2 = api.get(f"{BASE_URL}/api/users/{uid}", headers=_bearer(tok), timeout=10)
        assert r2.status_code in (401, 404)


# --------- Non-regression quick ----------
class TestNonRegression:
    def test_led_library_has_7_colors(self, api):
        r = api.get(f"{BASE_URL}/api/led-library", timeout=10)
        assert r.status_code == 200
        assert len(r.json()["colors"]) == 7

    def test_admin_overview_without_header_401(self, api):
        r = api.get(f"{BASE_URL}/api/admin/overview", timeout=10)
        assert r.status_code == 401

    def test_user_route_no_bearer_401(self, api):
        uid, _ = _activate_creator(api)
        r = api.get(f"{BASE_URL}/api/users/{uid}", timeout=10)
        assert r.status_code == 401

    def test_user_route_wrong_bearer_403(self, api):
        uid_a, _ = _activate_creator(api)
        uid_b, tok_b = _activate_creator(api)
        r = api.get(f"{BASE_URL}/api/users/{uid_a}", headers=_bearer(tok_b), timeout=10)
        assert r.status_code == 403
