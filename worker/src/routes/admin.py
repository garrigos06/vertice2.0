"""Admin routes: dashboard KPIs + users management."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from deps import get_db, require_admin
from models import Plan, Role, UserUpdateAdmin, new_id, now_iso
from repo import audit_log, d1_first, users_get_by_id, users_search, users_update_fields

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def admin_stats(admin=Depends(require_admin), db=Depends(get_db)):
    async def c(sql: str, *p) -> int:
        row = await d1_first(db, sql, *p)
        return int(row["c"]) if row else 0

    users_total = await c("SELECT COUNT(*) AS c FROM users")
    users_free = await c("SELECT COUNT(*) AS c FROM users WHERE plan = ?", "FREE")
    users_pro = await c("SELECT COUNT(*) AS c FROM users WHERE plan = ?", "PRO")
    users_full = await c("SELECT COUNT(*) AS c FROM users WHERE plan = ?", "FULL")
    subs_active = await c("SELECT COUNT(*) AS c FROM users WHERE subscription_status = ?", "ACTIVE")
    bets_published = await c("SELECT COUNT(*) AS c FROM bets WHERE published = 1")
    greens = await c("SELECT COUNT(*) AS c FROM bets WHERE published = 1 AND status = ?", "GREEN")
    reds = await c("SELECT COUNT(*) AS c FROM bets WHERE published = 1 AND status = ?", "RED")
    voids = await c("SELECT COUNT(*) AS c FROM bets WHERE published = 1 AND status = ?", "VOID")
    settled = greens + reds
    hit_rate = round(greens / settled * 100, 1) if settled else 0.0
    return {
        "users_total": users_total,
        "users_free": users_free,
        "users_pro": users_pro,
        "users_full": users_full,
        "subs_active": subs_active,
        "bets_published": bets_published,
        "greens": greens,
        "reds": reds,
        "voids": voids,
        "hit_rate": hit_rate,
    }


@router.get("/users")
async def admin_users(
    admin=Depends(require_admin),
    q: Optional[str] = None,
    plan: Optional[Plan] = None,
    role: Optional[Role] = None,
    limit: int = Query(100, le=500),
    db=Depends(get_db),
):
    items = await users_search(
        db, q,
        plan.value if plan else None,
        role.value if role else None,
        limit,
    )
    return {"items": items}


@router.patch("/users/{user_id}")
async def admin_update_user(
    user_id: str,
    payload: UserUpdateAdmin,
    admin=Depends(require_admin),
    db=Depends(get_db),
):
    updates_raw = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates_raw:
        raise HTTPException(status_code=400, detail="Nada a atualizar")

    updates: dict = {}
    for k, v in updates_raw.items():
        updates[k] = v.value if hasattr(v, "value") else v

    if "role" in updates and updates["role"] in ("ADMIN", "SUPER_ADMIN"):
        if admin["role"] != "SUPER_ADMIN":
            raise HTTPException(status_code=403, detail="Somente Super Admin pode conceder essa role")

    if updates.get("plan") in ("PRO", "FULL"):
        updates["subscription_status"] = "ACTIVE"
    elif updates.get("plan") == "FREE":
        updates["subscription_status"] = "NONE"
    updates["updated_at"] = now_iso()

    target = await users_get_by_id(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    await users_update_fields(db, user_id, updates)
    await audit_log(
        db,
        log_id=new_id(),
        admin_id=admin["id"],
        admin_email=admin["email"],
        action="user.update",
        entity="user",
        entity_id=user_id,
        metadata=updates,
        created_at=now_iso(),
    )
    updated = await users_get_by_id(db, user_id)
    # remove hash antes de devolver
    if updated:
        updated = {k: v for k, v in updated.items() if k != "password_hash"}
    return updated
