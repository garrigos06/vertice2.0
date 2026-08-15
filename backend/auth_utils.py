"""Auth utilities: password hashing, JWT tokens, FastAPI dependencies."""
from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from models import Role, UserDoc

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "168"))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, session_version: int = 1) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "sv": session_version,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_EXPIRE_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def generate_reset_token() -> tuple[str, str]:
    """Return (raw_token, sha256_hash). Store only the hash server-side."""
    raw = secrets.token_urlsafe(48)
    h = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, h


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


# ---------- FastAPI dependencies ----------
def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return request.cookies.get("vs_token")


async def get_current_user_optional(request: Request) -> Optional[UserDoc]:
    token = _extract_token(request)
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    from server import db  # avoid circular import at module load
    doc = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not doc or not doc.get("active", True):
        return None
    return UserDoc(**doc)


async def get_current_user(request: Request) -> UserDoc:
    user = await get_current_user_optional(request)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    return user


async def require_admin(user: UserDoc = Depends(get_current_user)) -> UserDoc:
    if user.role not in (Role.ADMIN, Role.SUPER_ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao admin")
    return user


async def require_super_admin(user: UserDoc = Depends(get_current_user)) -> UserDoc:
    if user.role != Role.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente Super Admin")
    return user
