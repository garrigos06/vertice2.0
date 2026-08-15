"""Auth routes — register / login / me / logout / forgot / reset + admin seed one-shot."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from deps import get_current_user, get_db, get_secret
from email_service import send_password_changed_email, send_password_reset_email
from models import (
    PasswordResetConfirm,
    PasswordResetRequest,
    UserLogin,
    UserRegister,
    new_id,
    now_iso,
)
from repo import (
    _user_public,
    prt_get_by_hash_unused,
    prt_insert,
    prt_invalidate_all,
    prt_latest_unused,
    prt_mark_used,
    users_get_by_email,
    users_get_by_id,
    users_insert,
    users_update_fields,
)
from security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    sha256_hex,
    verify_password,
)

logger = logging.getLogger("vertice.auth")
router = APIRouter(prefix="/auth", tags=["auth"])

RESET_TTL_MINUTES = 30
RESET_COOLDOWN_SECONDS = 60
_GENERIC_RESET_MSG = (
    "Se existir uma conta com este e-mail, enviaremos instruções para redefinir sua senha."
)


@router.post("/register")
async def register(payload: UserRegister, db=Depends(get_db)):
    if await users_get_by_email(db, payload.email):
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    user = {
        "id": new_id(),
        "name": payload.name.strip(),
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "role": "USER",
        "plan": "FREE",
        "subscription_status": "NONE",
        "active": True,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await users_insert(db, user)
    secret = get_secret("JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET não configurado")
    token = create_access_token(user["id"], secret)
    return {"user": _user_public(user), "token": token}


@router.post("/login")
async def login(payload: UserLogin, db=Depends(get_db)):
    row = await users_get_by_email(db, payload.email)
    if not row:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not row.get("active"):
        raise HTTPException(status_code=403, detail="Conta desativada")
    if not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    secret = get_secret("JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET não configurado")
    token = create_access_token(row["id"], secret)
    return {"user": _user_public(row), "token": token}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return {"user": _user_public(user)}


@router.post("/logout")
async def logout():
    # JWT stateless: cliente descarta o token.
    return {"ok": True}


# ---------- Password reset ----------
@router.post("/forgot-password")
async def forgot_password(payload: PasswordResetRequest, db=Depends(get_db)):
    email = payload.email.lower()
    user = await users_get_by_email(db, email)

    if user:
        latest = await prt_latest_unused(db, user["id"])
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
            await prt_invalidate_all(db, user["id"], now.isoformat())
            raw, token_hash = generate_reset_token()
            await prt_insert(
                db,
                token_id=f"prt_{token_hash[:24]}",
                user_id=user["id"],
                token_hash=token_hash,
                expires_at=(now + timedelta(minutes=RESET_TTL_MINUTES)).isoformat(),
                created_at=now.isoformat(),
            )
            try:
                await send_password_reset_email(
                    to=user["email"], name=user.get("name", "usuário"), raw_token=raw
                )
            except Exception as e:
                logger.error(f"reset email falhou: {e}")

    return {"message": _GENERIC_RESET_MSG}


@router.post("/reset-password")
async def reset_password(payload: PasswordResetConfirm, db=Depends(get_db)):
    token_hash = sha256_hex(payload.token)
    now = datetime.now(timezone.utc)
    prt = await prt_get_by_hash_unused(db, token_hash)
    if not prt:
        raise HTTPException(status_code=400, detail="Token inválido ou já utilizado")
    try:
        exp = datetime.fromisoformat(prt["expires_at"])
    except Exception:
        exp = now - timedelta(seconds=1)
    if exp < now:
        raise HTTPException(status_code=400, detail="Token expirado. Solicite um novo link.")
    user = await users_get_by_id(db, prt["user_id"])
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido")

    await users_update_fields(db, user["id"], {
        "password_hash": hash_password(payload.new_password),
        "updated_at": now.isoformat(),
    })
    await prt_mark_used(db, user["id"], now.isoformat())
    try:
        await send_password_changed_email(to=user["email"], name=user.get("name", ""))
    except Exception as e:
        logger.error(f"confirm email falhou: {e}")

    return {"message": "Senha redefinida com sucesso. Faça login novamente."}


# ---------- One-shot seed do super admin (protegido por SEED_SUPER_ADMIN_PASSWORD) ----------
@router.post("/_seed-super-admin")
async def seed_super_admin(db=Depends(get_db)):
    """
    Chamada única pós-migration. Cria o super admin se não existir.
    Idempotente: se já existir, apenas garante role=SUPER_ADMIN + plan=FULL + active=1.

    Segurança: só cria se SEED_SUPER_ADMIN_PASSWORD estiver setada como secret.
    Depois de rodar uma vez, você pode remover essa rota (deletar a função).
    """
    email = (get_secret("SEED_SUPER_ADMIN_EMAIL") or "").lower().strip()
    password = get_secret("SEED_SUPER_ADMIN_PASSWORD")
    name = get_secret("SEED_SUPER_ADMIN_NAME", "Super Admin") or "Super Admin"
    if not email or not password:
        raise HTTPException(status_code=503, detail="Seed não configurado")
    existing = await users_get_by_email(db, email)
    if existing:
        await users_update_fields(db, existing["id"], {
            "role": "SUPER_ADMIN", "plan": "FULL", "active": True,
            "updated_at": now_iso(),
        })
        return {"ok": True, "created": False}
    user = {
        "id": new_id(),
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "role": "SUPER_ADMIN",
        "plan": "FULL",
        "subscription_status": "ACTIVE",
        "active": True,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await users_insert(db, user)
    return {"ok": True, "created": True, "id": user["id"]}
