"""Vértice Sports — Pydantic models (MongoDB-friendly, string IDs)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


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


class SubscriptionStatus(str, Enum):
    NONE = "NONE"
    ACTIVE = "ACTIVE"
    CANCELED = "CANCELED"
    EXPIRED = "EXPIRED"


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


# ---------- Users ----------
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    email: EmailStr


class UserPublic(UserBase):
    id: str
    role: Role = Role.USER
    plan: Plan = Plan.FREE
    subscription_status: SubscriptionStatus = SubscriptionStatus.NONE
    active: bool = True
    created_at: datetime


class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserDoc(BaseModel):
    """Full internal user document stored in Mongo."""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    name: str
    email: EmailStr
    password_hash: str
    role: Role = Role.USER
    plan: Plan = Plan.FREE
    subscription_status: SubscriptionStatus = SubscriptionStatus.NONE
    active: bool = True
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


class UserUpdateAdmin(BaseModel):
    plan: Optional[Plan] = None
    role: Optional[Role] = None
    active: Optional[bool] = None


# ---------- Password reset ----------
class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=200)


# ---------- Bet Slips ----------
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
    scheduled_at: Optional[datetime] = None
    required_plan: Plan = Plan.FREE
    external_url: Optional[str] = None
    featured: bool = False
    image_url: Optional[str] = None
    published: bool = False


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
    scheduled_at: Optional[datetime] = None
    required_plan: Optional[Plan] = None
    external_url: Optional[str] = None
    featured: Optional[bool] = None
    image_url: Optional[str] = None
    status: Optional[BetStatus] = None
    published: Optional[bool] = None


class BetSlipDoc(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    title: str
    description: str = ""
    category: BetCategory
    sport: str = "Futebol"
    competition: str = ""
    selections: List[BetSelection] = []
    total_odd: float
    probability: Optional[float] = None
    risk: RiskLevel = RiskLevel.MEDIO
    rationale: str = ""
    scheduled_at: Optional[datetime] = None
    required_plan: Plan = Plan.FREE
    external_url: Optional[str] = None
    featured: bool = False
    image_url: Optional[str] = None
    status: BetStatus = BetStatus.PENDENTE
    published: bool = False
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


# ---------- Audit ----------
class AuditLogDoc(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    admin_id: str
    admin_email: str
    action: str
    entity: str
    entity_id: str = ""
    metadata: dict = {}
    created_at: datetime = Field(default_factory=now_utc)
