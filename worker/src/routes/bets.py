"""Bet slip routes — public list/history + admin CRUD."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from deps import get_current_user_optional, get_db, require_admin
from models import BetSlipCreate, BetSlipUpdate, BetStatus, Plan, new_id, now_iso
from repo import (
    audit_log,
    bets_count_by,
    bets_delete,
    bets_get,
    bets_history,
    bets_insert,
    bets_list,
    bets_update,
)

router = APIRouter(prefix="/bets", tags=["bets"])

_PLAN_LEVEL = {"FREE": 0, "PRO": 1, "FULL": 2}


def _clean(doc: dict, current_plan: Optional[str]) -> dict:
    out = dict(doc)
    required = out.get("required_plan", "FREE")
    user_level = _PLAN_LEVEL.get(current_plan or "FREE", 0)
    required_level = _PLAN_LEVEL.get(required, 0)
    out["locked"] = user_level < required_level
    if out["locked"]:
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
    db=Depends(get_db),
    user=Depends(get_current_user_optional),
):
    items = await bets_list(
        db,
        published=published,
        status=status.value if status else None,
        required_plan=plan.value if plan else None,
        featured=featured,
        limit=limit,
    )
    current_plan = user["plan"] if user else None
    return {"items": [_clean(b, current_plan) for b in items]}


@router.get("/history")
async def bets_history_route(
    limit: int = Query(200, le=500),
    db=Depends(get_db),
    user=Depends(get_current_user_optional),
):
    items = await bets_history(db, limit=limit)
    stats = {
        "total": len(items),
        "green": sum(1 for i in items if i["status"] == "GREEN"),
        "red": sum(1 for i in items if i["status"] == "RED"),
        "void": sum(1 for i in items if i["status"] == "VOID"),
    }
    settled = stats["green"] + stats["red"]
    stats["hit_rate"] = round(stats["green"] / settled * 100, 1) if settled else 0.0
    current_plan = user["plan"] if user else None
    return {"items": [_clean(b, current_plan) for b in items], "stats": stats}


@router.get("/admin/all")
async def admin_list_all(
    admin=Depends(require_admin),
    limit: int = Query(200, le=500),
    db=Depends(get_db),
):
    items = await bets_list(db, published=None, limit=limit)
    return {"items": items}


@router.get("/{bet_id}")
async def get_bet(bet_id: str, db=Depends(get_db), user=Depends(get_current_user_optional)):
    doc = await bets_get(db, bet_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Bilhete não encontrado")
    current_plan = user["plan"] if user else None
    return _clean(doc, current_plan)


# ---------- Admin ----------
@router.post("/admin", status_code=201)
async def admin_create_bet(
    payload: BetSlipCreate, admin=Depends(require_admin), db=Depends(get_db)
):
    data = payload.model_dump()
    now = now_iso()
    bet = {
        "id": new_id(),
        "status": "PENDENTE",
        "created_at": now,
        "updated_at": now,
        **data,
        "category": data["category"].value if hasattr(data["category"], "value") else data["category"],
        "risk": data["risk"].value if hasattr(data["risk"], "value") else data["risk"],
        "required_plan": data["required_plan"].value if hasattr(data["required_plan"], "value") else data["required_plan"],
        "selections": [s if isinstance(s, dict) else s.model_dump() for s in data.get("selections", [])],
    }
    await bets_insert(db, bet)
    await audit_log(
        db,
        log_id=new_id(),
        admin_id=admin["id"],
        admin_email=admin["email"],
        action="bet.create",
        entity="bet",
        entity_id=bet["id"],
        metadata={"title": bet["title"]},
        created_at=now,
    )
    return bet


@router.patch("/admin/{bet_id}")
async def admin_update_bet(
    bet_id: str,
    payload: BetSlipUpdate,
    admin=Depends(require_admin),
    db=Depends(get_db),
):
    updates_raw = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates_raw:
        raise HTTPException(status_code=400, detail="Nada a atualizar")

    updates = {}
    for k, v in updates_raw.items():
        if hasattr(v, "value"):  # enums
            updates[k] = v.value
        elif k == "selections":
            updates[k] = [s if isinstance(s, dict) else s.model_dump() for s in v]
        else:
            updates[k] = v
    updates["updated_at"] = now_iso()

    updated = await bets_update(db, bet_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Bilhete não encontrado")

    await audit_log(
        db,
        log_id=new_id(),
        admin_id=admin["id"],
        admin_email=admin["email"],
        action="bet.update",
        entity="bet",
        entity_id=bet_id,
        metadata=updates,
        created_at=now_iso(),
    )
    return updated


@router.delete("/admin/{bet_id}")
async def admin_delete_bet(
    bet_id: str, admin=Depends(require_admin), db=Depends(get_db)
):
    ok = await bets_delete(db, bet_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Bilhete não encontrado")
    await audit_log(
        db,
        log_id=new_id(),
        admin_id=admin["id"],
        admin_email=admin["email"],
        action="bet.delete",
        entity="bet",
        entity_id=bet_id,
        metadata={},
        created_at=now_iso(),
    )
    return {"ok": True}
