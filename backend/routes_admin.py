"""Admin routes: dashboard KPIs, users management."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from auth_utils import require_admin, require_super_admin
from models import Plan, Role, UserDoc, UserUpdateAdmin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def admin_stats(admin: UserDoc = Depends(require_admin)):
    from server import db
    users_total = await db.users.count_documents({})
    users_free = await db.users.count_documents({"plan": "FREE"})
    users_pro = await db.users.count_documents({"plan": "PRO"})
    users_full = await db.users.count_documents({"plan": "FULL"})
    subs_active = await db.users.count_documents({"subscription_status": "ACTIVE"})
    bets_published = await db.bets.count_documents({"published": True})
    greens = await db.bets.count_documents({"status": "GREEN", "published": True})
    reds = await db.bets.count_documents({"status": "RED", "published": True})
    voids = await db.bets.count_documents({"status": "VOID", "published": True})
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
    admin: UserDoc = Depends(require_admin),
    q: Optional[str] = None,
    plan: Optional[Plan] = None,
    role: Optional[Role] = None,
    limit: int = Query(100, le=500),
):
    from server import db
    query: dict = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    if plan:
        query["plan"] = plan
    if role:
        query["role"] = role
    docs = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(limit)
    return {"items": docs}


@router.patch("/users/{user_id}")
async def admin_update_user(
    user_id: str,
    payload: UserUpdateAdmin,
    admin: UserDoc = Depends(require_admin),
):
    from server import db
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nada a atualizar")

    # Only SUPER_ADMIN may grant admin/super_admin roles
    if "role" in updates and updates["role"] in (Role.ADMIN, Role.SUPER_ADMIN):
        if admin.role != Role.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Somente Super Admin pode conceder essa role")

    updates["updated_at"] = datetime.utcnow().isoformat()
    if updates.get("plan") in ("PRO", "FULL"):
        updates["subscription_status"] = "ACTIVE"
    elif updates.get("plan") == "FREE":
        updates["subscription_status"] = "NONE"

    result = await db.users.update_one({"id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    await db.audit_logs.insert_one({
        "id": f"al_{user_id}_{int(datetime.utcnow().timestamp())}",
        "admin_id": admin.id, "admin_email": admin.email,
        "action": "user.update", "entity": "user", "entity_id": user_id,
        "metadata": updates, "created_at": datetime.utcnow().isoformat(),
    })
    doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return doc
