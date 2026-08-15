"""Password hashing (PBKDF2-HMAC-SHA256) + JWT.

- PBKDF2 é stdlib puro (`hashlib`), sem código C nativo — 100% compatível com Pyodide/Python Workers.
- 210.000 iterações — recomendação OWASP 2023+.
- Salt aleatório de 16 bytes via `os.urandom` (usa crypto.getRandomValues em Pyodide).
- JWT via PyJWT (pure Python, funciona no Pyodide).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets as _secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt


PBKDF2_ITERATIONS = 210_000
PBKDF2_ALGO = "pbkdf2_sha256"


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return (
        f"{PBKDF2_ALGO}${PBKDF2_ITERATIONS}"
        f"${base64.b64encode(salt).decode()}"
        f"${base64.b64encode(dk).decode()}"
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        alg, iters, salt_b64, hash_b64 = stored.split("$")
        if alg != PBKDF2_ALGO:
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iters))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


# ---------- JWT ----------
def create_access_token(user_id: str, secret: str, hours: int = 168) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=hours)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token: str, secret: str) -> Optional[dict]:
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


# ---------- Reset tokens ----------
def generate_reset_token() -> tuple[str, str]:
    raw = _secrets.token_urlsafe(48)
    h = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, h


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
