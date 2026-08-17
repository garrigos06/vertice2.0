"""Env & auth dependency injection.

O `env` do WorkerEntrypoint contém bindings (D1 via `env.DB`), secrets
(`env.JWT_SECRET`) e vars públicas do wrangler.toml. É propagado por
ContextVar setada em `entry.py` antes de chamar `asgi.fetch`.
"""
from contextvars import ContextVar
from typing import Any, Optional

from fastapi import Depends, HTTPException, Request, status

_env_ctx: ContextVar[Any] = ContextVar("worker_env", default=None)


def set_current_env(env: Any) -> None:
    _env_ctx.set(env)


def get_current_env() -> Any:
    env = _env_ctx.get()
    if env is None:
        raise HTTPException(status_code=500, detail="Worker env não inicializada")
    return env


def get_env() -> Any:
    """FastAPI dep."""
    return get_current_env()


def get_db(env: Any = Depends(get_env)):
    """D1 binding."""
    db = getattr(env, "DB", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Binding D1 'DB' não configurado")
    return db


def get_secret(name: str, default: Optional[str] = None) -> Optional[str]:
    env = get_current_env()
    val = getattr(env, name, None)
    if val is None or val == "":
        return default
    return str(val)


# ---------- Auth dependencies ----------
def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


async def get_current_user_optional(request: Request):
    from security import decode_token
    from repo import users_get_by_id

    token = _extract_token(request)
    if not token:
        return None
    secret = get_secret("JWT_SECRET")
    if not secret:
        return None
    payload = decode_token(token, secret)
    if not payload:
        return None
    db = get_db(get_current_env())
    user = await users_get_by_id(db, payload["sub"])
    if not user or not user.get("active"):
        return None
    return user


async def get_current_user(request: Request):
    user = await get_current_user_optional(request)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    return user


async def require_admin(user=Depends(get_current_user)):
    if user["role"] not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao admin")
    return user


async def require_super_admin(user=Depends(get_current_user)):
    if user["role"] != "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente Super Admin")
    return user


async def require_pro_or_full(user=Depends(get_current_user)):
    """
    Libera recursos premium somente para assinantes PRO/FULL ativos.

    ADMIN e SUPER_ADMIN mantêm acesso independentemente do plano para
    permitir suporte, testes e administração da plataforma.
    """
    if user.get("role") in ("ADMIN", "SUPER_ADMIN"):
        return user

    plan = user.get("plan")
    subscription_status = user.get("subscription_status")

    if (
        plan not in ("PRO", "FULL")
        or subscription_status != "ACTIVE"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Recurso disponível exclusivamente "
                "nos planos PRO e FULL."
            ),
        )

    return user