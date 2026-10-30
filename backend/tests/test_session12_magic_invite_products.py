# Session 12: one-tap magic link, influencer invite link, "Mes produits", admin invite_url, activation regression
import os
import uuid
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")
if not ADMIN_TOKEN:
    for line in (Path(__file__).resolve().parents[1] / ".env").read_text().splitlines():
        if line.startswith("ADMIN_TOKEN="):
            ADMIN_TOKEN = line.split("=", 1)[1].strip().strip('"')
_db = MongoClient(os.environ.get("MONGO_URL"))[os.environ.get("DB_NAME")]


def _hdr(extra=None):
    # The suite hammers one IP; the admin secret marks it as the test runner
    h = {"Content-Type": "application/json"}
    if ADMIN_TOKEN:
        h["X-Rate-Limit-Bypass"] = ADMIN_TOKEN
    if extra:
        h.update(extra)
    return h


def _seed_magic(email=None, code=None, minutes=30):
    """Insert a magic-link row exactly as issue_magic_link does, return the raw token."""
    token = secrets.token_urlsafe(24)
    now = datetime.now(timezone.utc)
    _db.magic_links.insert_one({
        "token_hash": hashlib.sha256(token.encode()).hexdigest(),
        "email": email, "activation_code": code, "lang": "fr",
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(minutes=minutes)).isoformat(),
        "used_at": None, "test_seed": "TEST_t1",
    })
    return token


def _new_user():
    r = requests.post(f"{API}/activate", json={"activation_code": "NUR-CREATOR"}, headers=_hdr())
    assert r.status_code == 200, r.text
    return r.json()


# ---- Magic link ----
class TestMagicLink:
    def test_request_code_issues_magic_row(self):
        email = f"delivered+t1magic{uuid.uuid4().hex[:6]}@resend.dev"
        r = requests.post(f"{API}/auth/request-code", json={"email": email, "lang": "fr"}, headers=_hdr())
        assert r.status_code == 200, r.text
        row = _db.magic_links.find_one({"email": email})
        assert row and row["used_at"] is None and row.get("token_hash")
        assert "token" not in row  # raw token must not be stored

    def test_magic_valid_then_reuse_410(self):
        email = f"delivered+t1mg{uuid.uuid4().hex[:6]}@resend.dev"
        token = _seed_magic(email=email)
        r = requests.post(f"{API}/activate/magic", json={"token": token}, headers=_hdr())
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["session_token"] and d["user_id"] and d["access_status"] in ("verified", "trial")
        assert d["email"] == email
        # session works
        a = requests.get(f"{API}/users/{d['user_id']}/access", headers=_hdr({"Authorization": f"Bearer {d['session_token']}"}))
        assert a.status_code == 200 and a.json()["user_id"] == d["user_id"]
        r2 = requests.post(f"{API}/activate/magic", json={"token": token}, headers=_hdr())
        assert r2.status_code == 410

    def test_magic_code_based(self):
        token = _seed_magic(code="NUR-CREATOR")
        r = requests.post(f"{API}/activate/magic", json={"token": token}, headers=_hdr())
        assert r.status_code == 200, r.text
        assert r.json()["access_status"] == "verified" and r.json()["session_token"]

    def test_magic_expired_410(self):
        token = _seed_magic(email="delivered+t1exp@resend.dev", minutes=-1)
        r = requests.post(f"{API}/activate/magic", json={"token": token}, headers=_hdr())
        assert r.status_code == 410 and r.json()["detail"] == "link_expired"

    def test_magic_unknown_410(self):
        r = requests.post(f"{API}/activate/magic", json={"token": "bogus-" + uuid.uuid4().hex}, headers=_hdr())
        assert r.status_code == 410

    def test_magic_empty_400(self):
        r = requests.post(f"{API}/activate/magic", json={"token": "  "}, headers=_hdr())
        assert r.status_code == 400


# ---- Invite link ----
class TestInvite:
    def test_invite_valid(self):
        tok = _db.app_settings.find_one({"key": "invite"})["token"]
        r = requests.post(f"{API}/activate/invite", json={"token": tok}, headers=_hdr())
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["access_status"] == "trial" and d["session_token"] and d["has_intake"] is False

    def test_invite_wrong_403(self):
        r = requests.post(f"{API}/activate/invite", json={"token": "wrong"}, headers=_hdr())
        assert r.status_code == 403

    def test_invite_empty_403(self):
        r = requests.post(f"{API}/activate/invite", json={"token": ""}, headers=_hdr())
        assert r.status_code == 403


# ---- Mes produits ----
class TestProducts:
    def test_products_save_auth_idor(self):
        u1, u2 = _new_user(), _new_user()
        auth1 = {"Authorization": f"Bearer {u1['session_token']}"}
        text = "TEST_ sérum vitamine C matin, crème riche soir, SPF 50 " + "x" * 2000
        r = requests.put(f"{API}/users/{u1['user_id']}/products", json={"products": text}, headers=_hdr(auth1))
        assert r.status_code == 200 and r.json()["ok"] is True
        assert len(r.json()["products"]) == 1500
        g = requests.get(f"{API}/users/{u1['user_id']}", headers=_hdr(auth1))
        assert g.status_code == 200 and g.json().get("own_products", "").startswith("TEST_ sérum")
        # no auth
        assert requests.put(f"{API}/users/{u1['user_id']}/products", json={"products": "a"}, headers=_hdr()).status_code == 401
        # other user's session
        r3 = requests.put(f"{API}/users/{u1['user_id']}/products", json={"products": "hack"},
                          headers=_hdr({"Authorization": f"Bearer {u2['session_token']}"}))
        assert r3.status_code == 403
        assert requests.get(f"{API}/users/{u1['user_id']}/access", headers=_hdr(auth1)).status_code == 200

    def test_chat_with_products(self):
        u = _new_user()
        auth = {"Authorization": f"Bearer {u['session_token']}"}
        requests.put(f"{API}/users/{u['user_id']}/products",
                     json={"products": "sérum vitamine C, crème hydratante riche, SPF 50"}, headers=_hdr(auth))
        r = requests.post(f"{API}/users/{u['user_id']}/chat",
                          json={"message": "Comment utiliser mes produits avec le masque LED ?", "lang": "fr"},
                          headers=_hdr(auth), timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        reply = (body.get("reply") or body.get("answer") or body.get("message") or "")
        print("CHAT REPLY:", reply[:400])
        assert len(reply) > 20
        # off-topic still refused
        r2 = requests.post(f"{API}/users/{u['user_id']}/chat",
                           json={"message": "Donne-moi une recette de lasagnes", "lang": "fr"},
                           headers=_hdr(auth), timeout=90)
        assert r2.status_code == 200
        print("OFFTOPIC REPLY:", str(r2.json())[:300])


# ---- Admin + activation regression ----
class TestAdminAndRegression:
    def test_admin_overview_invite_url(self):
        r = requests.get(f"{API}/admin/overview", headers=_hdr({"X-Admin-Token": ADMIN_TOKEN}))
        assert r.status_code == 200
        assert "/invite?t=" in r.json().get("invite_url", "")

    def test_activate_demo_code(self):
        r = requests.post(f"{API}/activate", json={"activation_code": "NUR-DEMO-2026"}, headers=_hdr())
        assert r.status_code == 200 and r.json()["session_token"]

    def test_activate_invalid_403(self):
        r = requests.post(f"{API}/activate", json={"activation_code": "NUR-NOPE-0000"}, headers=_hdr())
        assert r.status_code == 403
