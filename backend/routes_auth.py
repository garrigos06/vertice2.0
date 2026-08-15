"""Auth routes: register, login, logout, me, password reset."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import EmailStr

from auth_utils import (
    create_access_token,
    generate_reset_token,
    get_current_user,
    hash_password,
    hash_token,
    verify_password,
)
from email_service import send_password_changed_email, send_password_reset_email
from models import (
    PasswordResetConfirm,
    PasswordResetRequest,
    UserDoc,
    UserLogin,
    UserRegister,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

RESET_TTL_MINUTES = 30
RESET_COOLDOWN_SECONDS = 60


def _user_public(u: UserDoc) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "plan": u.plan,
        "subscription_status": u.subscription_status,
        "active": u.active,
        "created_at": u.created_at.isoformat() if isinstance(u.created_at, datetime) else u.created_at,
    }


def _serialize(doc: dict) -> dict:
    """Convert datetime fields to iso strings before Mongo insert."""
    out = dict(doc)
    for k, v in out.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    return out


@router.post("/register")
async def register(payload: UserRegister, response: Response):
    from server import db
    existing = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    user = UserDoc(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
    )
    await db.users.insert_one(_serialize(user.model_dump()))
    token = create_access_token(user.id)
    return {"user": _user_public(user), "token": token}


@router.post("/login")
async def login(payload: UserLogin):
    from server import db
    doc = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not doc.get("active", True):
        raise HTTPException(status_code=403, detail="Conta desativada")
    if not verify_password(payload.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    user = UserDoc(**doc)
    token = create_access_token(user.id)
    return {"user": _user_public(user), "token": token}


@router.get("/me")
async def me(user: UserDoc = Depends(get_current_user)):
    return {"user": _user_public(user)}


@router.post("/logout")
async def logout(response: Response):
    # Stateless JWT: client just discards the token. Kept for symmetry.
    return {"ok": True}


# ---------- Password reset ----------
_GENERIC_RESET_MSG = (
    "Se existir uma conta com este e-mail, enviaremos instruções para redefinir sua senha."
)


@router.post("/forgot-password")
async def forgot_password(payload: PasswordResetRequest):
    from server import db
    email = payload.email.lower()
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})

    if user_doc:
        # cooldown: reject if a token was created less than RESET_COOLDOWN_SECONDS ago
        latest = await db.password_reset_tokens.find_one(
            {"user_id": user_doc["id"], "used": False},
            sort=[("created_at", -1)],
            projection={"_id": 0},
        )
        now = datetime.now(timezone.utc)
        allow = True
        if latest:
            try:
                created = datetime.fromisoformat(latest["created_at"])
            except Exception:
                created = None
            if created and (now - created).total_seconds() < RESET_COOLDOWN_SECONDS:
                allow = False

        if allow:
            # invalidate previous tokens
            await db.password_reset_tokens.update_many(
                {"user_id": user_doc["id"], "used": False},
                {"$set": {"used": True, "invalidated_at": now.isoformat()}},
            )
            raw, token_hash = generate_reset_token()
            await db.password_reset_tokens.insert_one({
                "id": f"prt_{token_hash[:24]}",
                "user_id": user_doc["id"],
                "token_hash": token_hash,
                "expires_at": (now + timedelta(minutes=RESET_TTL_MINUTES)).isoformat(),
                "created_at": now.isoformat(),
                "used": False,
            })
            try:
                await send_password_reset_email(
                    to=user_doc["email"],
                    name=user_doc.get("name", "usuário"),
                    raw_token=raw,
                )
            except Exception as e:
                logger.error(f"Failed to send reset email: {e}")
                # Do NOT reveal to caller.

    return {"message": _GENERIC_RESET_MSG}


@router.post("/reset-password")
async def reset_password(payload: PasswordResetConfirm):
    from server import db
    token_hash = hash_token(payload.token)
    now = datetime.now(timezone.utc)
    prt = await db.password_reset_tokens.find_one(
        {"token_hash": token_hash, "used": False}, {"_id": 0}
    )
    if not prt:
        raise HTTPException(status_code=400, detail="Token inválido ou já utilizado")
    try:
        exp = datetime.fromisoformat(prt["expires_at"])
    except Exception:
        exp = now - timedelta(seconds=1)
    if exp < now:
        raise HTTPException(status_code=400, detail="Token expirado. Solicite um novo link.")
    user_doc = await db.users.find_one({"id": prt["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=400, detail="Token inválido")

    new_hash = hash_password(payload.new_password)
    await db.users.update_one(
        {"id": user_doc["id"]},
        {"$set": {"password_hash": new_hash, "updated_at": now.isoformat()}},
    )
    await db.password_reset_tokens.update_many(
        {"user_id": user_doc["id"], "used": False},
        {"$set": {"used": True, "used_at": now.isoformat()}},
    )
    try:
        await send_password_changed_email(to=user_doc["email"], name=user_doc.get("name", ""))
    except Exception as e:
        logger.error(f"Failed to send confirmation email: {e}")

    return {"message": "Senha redefinida com sucesso. Faça login novamente."}
