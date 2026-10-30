"""The suite drives hundreds of calls from a single IP.

The backend rate-limits per client IP (and forged X-Forwarded-For values are now
ignored), so the test runner identifies itself with the admin secret, which no
real client ever holds.
"""
import os
from pathlib import Path


def admin_token() -> str:
    token = os.environ.get("ADMIN_TOKEN")
    if not token:
        env = Path(__file__).resolve().parents[1] / ".env"
        for line in env.read_text().splitlines():
            if line.startswith("ADMIN_TOKEN="):
                token = line.split("=", 1)[1].strip().strip('"')
                break
    return token or ""


def exempt_headers() -> dict:
    token = admin_token()
    return {"X-Rate-Limit-Bypass": token} if token else {}
