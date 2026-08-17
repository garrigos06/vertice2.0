"""Pydantic models (mesmos schemas usados pelo frontend React).

D1 é SQLite: booleans viram int (0/1) e datetimes viram strings ISO.
As conversões ficam no `repo.py`. Aqui só temos os schemas de request/response.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
import uuid

from pydantic import BaseModel, EmailStr, Field


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- Enums ----------
class Role(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class Plan(str, Enum):
    FREE = "FREE"
    PRO = "PRO"
    FULL = "FULL"


class BetCategory(str, Enum):
    SIMPLES = "SIMPLES"
    COMBINADO = "COMBINADO"
    MULTIPLO = "MULTIPLO"
    SUPERODD = "SUPERODD"


class BetStatus(str, Enum):
    PENDENTE = "PENDENTE"
    GREEN = "GREEN"
    RED = "RED"
    VOID = "VOID"
    CANCELADO = "CANCELADO"


class RiskLevel(str, Enum):
    BAIXO = "BAIXO"
    MEDIO = "MEDIO"
    ALTO = "ALTO"


# ---------- Requests ----------
class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=200)


class UserUpdateAdmin(BaseModel):
    plan: Optional[Plan] = None
    role: Optional[Role] = None
    active: Optional[bool] = None


class BetSelection(BaseModel):
    match: str
    market: str
    odd: float
    competition: Optional[str] = None
    kickoff: Optional[str] = None


class BetSlipCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: BetCategory
    sport: str = "Futebol"
    competition: Optional[str] = ""
    selections: List[BetSelection] = []
    total_odd: float
    probability: Optional[float] = None
    risk: RiskLevel = RiskLevel.MEDIO
    rationale: Optional[str] = ""
    scheduled_at: Optional[str] = None
    required_plan: Plan = Plan.FREE
    external_url: Optional[str] = None
    featured: bool = False
    image_url: Optional[str] = None
    published: bool = False

    # Somente bilhetes FREE podem usar esta opção.
    # A regra também será validada no backend e no banco.
    is_public_preview: bool = False


class BetSlipUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[BetCategory] = None
    sport: Optional[str] = None
    competition: Optional[str] = None
    selections: Optional[List[BetSelection]] = None
    total_odd: Optional[float] = None
    probability: Optional[float] = None
    risk: Optional[RiskLevel] = None
    rationale: Optional[str] = None
    scheduled_at: Optional[str] = None
    required_plan: Optional[Plan] = None
    external_url: Optional[str] = None
    featured: Optional[bool] = None
    image_url: Optional[str] = None
    status: Optional[BetStatus] = None
    published: Optional[bool] = None

    # Permite ao admin ativar/desativar a amostra pública.
    is_public_preview: Optional[bool] = None
