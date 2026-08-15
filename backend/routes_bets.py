"""Bet slip routes — public list/history + admin CRUD."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from auth_utils import get_current_user_optional, require_admin
from models import (
    BetSlipCreate,
    BetSlipDoc,
    BetSlipUpdate,
    BetStatus,
    Plan,
    UserDoc,
)

router = APIRouter(prefix="/bets", tags=["bets"])

_PLAN_LEVEL = {Plan.FREE: 0, Plan.PRO: 1, Plan.FULL: 2}


def _serialize(doc: dict) -> dict:
    out = dict(doc)
    for k, v in out.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    return out


def _clean(doc: dict, current_plan: Optional[Plan]) -> dict:
    out = dict(doc)
    # Convert iso strings back for JSON
    if isinstance(out.get("scheduled_at"), str):
        pass  # keep as ISO string, frontend parses
    # Access gating
    required = out.get("required_plan", Plan.FREE)
    user_level = _PLAN_LEVEL.get(current_plan or Plan.FREE, 0)
    required_level = _PLAN_LEVEL.get(required, 0)
    out["locked"] = user_level < required_level
    if out["locked"]:
        # hide sensitive analysis
        out["rationale"] = ""
        out["external_url"] = None
        out["selections"] = []
    return out


@router.get("")
async def list_bets(
    status: Optional[BetStatus] = None,
    plan: Optional[Plan] = None,
    featured: Optional[bool] = None,
    published: bool = True,
    limit: int = Query(50, le=200),
    user: Optional[UserDoc] = Depends(get_current_user_optional),
):
    from server import db
    query: dict = {"published": published} if published else {}
    if status:
        query["status"] = status
    if plan:
        query["required_plan"] = plan
    if featured is not None:
        query["featured"] = featured
    docs = await db.bets.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    current_plan = user.plan if user else None
    return {"items": [_clean(d, current_plan) for d in docs]}


@router.get("/history")
async def bets_history(
    limit: int = Query(200, le=500),
    user: Optional[UserDoc] = Depends(get_current_user_optional),
):
    from server import db
    query = {"published": True, "status": {"$in": ["GREEN", "RED", "VOID"]}}
    docs = await db.bets.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    stats = {
        "total": len(docs),
        "green": sum(1 for d in docs if d.get("status") == "GREEN"),
        "red": sum(1 for d in docs if d.get("status") == "RED"),
        "void": sum(1 for d in docs if d.get("status") == "VOID"),
    }
    settled = stats["green"] + stats["red"]
    stats["hit_rate"] = round(stats["green"] / settled * 100, 1) if settled else 0.0
    current_plan = user.plan if user else None
    return {"items": [_clean(d, current_plan) for d in docs], "stats": stats}


@router.get("/{bet_id}")
async def get_bet(bet_id: str, user: Optional[UserDoc] = Depends(get_current_user_optional)):
    from server import db
    doc = await db.bets.find_one({"id": bet_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Bilhete não encontrado")
    current_plan = user.plan if user else None
    return _clean(doc, current_plan)


# ---------- Admin ----------
@router.post("/admin", status_code=201)
async def admin_create_bet(payload: BetSlipCreate, admin: UserDoc = Depends(require_admin)):
    from server import db
    data = payload.model_dump()
    doc = BetSlipDoc(**data)
    await db.bets.insert_one(_serialize(doc.model_dump()))
    await db.audit_logs.insert_one(_serialize({
        "admin_id": admin.id, "admin_email": admin.email, "action": "bet.create",
        "entity": "bet", "entity_id": doc.id, "metadata": {"title": doc.title},
        "created_at": datetime.utcnow(),
    }))
    return doc.model_dump()


@router.patch("/admin/{bet_id}")
async def admin_update_bet(bet_id: str, payload: BetSlipUpdate, admin: UserDoc = Depends(require_admin)):
    from server import db
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nada a atualizar")
    updates["updated_at"] = datetime.utcnow().isoformat()
    result = await db.bets.update_one({"id": bet_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bilhete não encontrado")
    await db.audit_logs.insert_one(_serialize({
        "admin_id": admin.id, "admin_email": admin.email, "action": "bet.update",
        "entity": "bet", "entity_id": bet_id, "metadata": updates,
        "created_at": datetime.utcnow(),
    }))
    doc = await db.bets.find_one({"id": bet_id}, {"_id": 0})
    return doc


@router.delete("/admin/{bet_id}")
async def admin_delete_bet(bet_id: str, admin: UserDoc = Depends(require_admin)):
    from server import db
    result = await db.bets.delete_one({"id": bet_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bilhete não encontrado")
    await db.audit_logs.insert_one(_serialize({
        "admin_id": admin.id, "admin_email": admin.email, "action": "bet.delete",
        "entity": "bet", "entity_id": bet_id, "metadata": {},
        "created_at": datetime.utcnow(),
    }))
    return {"ok": True}


@router.get("/admin/all")
async def admin_list_all(admin: UserDoc = Depends(require_admin), limit: int = Query(200, le=500)):
    from server import db
    docs = await db.bets.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"items": docs}
