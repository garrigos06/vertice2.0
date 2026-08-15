"""D1 repository layer.

Wrappers async sobre o D1 binding. Toda query usa parâmetros posicionais (`?`)
via `prepare(...).bind(...)` para prevenir SQL injection.

D1 retorna resultados como dicts nativos (o runtime converte JsProxy → Python).
"""
from __future__ import annotations

import json
from typing import Any, Iterable, Optional


# ---------- Low-level helpers ----------
async def d1_first(db, sql: str, *params) -> Optional[dict]:
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*params)
    row = await stmt.first()
    return dict(row) if row else None


async def d1_all(db, sql: str, *params) -> list[dict]:
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*params)
    result = await stmt.all()
    rows = getattr(result, "results", None) or []
    return [dict(r) for r in rows]


async def d1_run(db, sql: str, *params):
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*params)
    return await stmt.run()


# ---------- USERS ----------
def _user_public(row: dict) -> dict:
    if not row:
        return row
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "plan": row["plan"],
        "subscription_status": row["subscription_status"],
        "active": bool(row["active"]),
        "created_at": row["created_at"],
    }


async def users_get_by_email(db, email: str) -> Optional[dict]:
    return await d1_first(db, "SELECT * FROM users WHERE email = ?", email.lower())


async def users_get_by_id(db, user_id: str) -> Optional[dict]:
    return await d1_first(db, "SELECT * FROM users WHERE id = ?", user_id)


async def users_insert(db, user: dict) -> None:
    await d1_run(
        db,
        """INSERT INTO users
           (id, name, email, password_hash, role, plan, subscription_status,
            active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        user["id"], user["name"], user["email"], user["password_hash"],
        user["role"], user["plan"], user["subscription_status"],
        1 if user["active"] else 0, user["created_at"], user["updated_at"],
    )


async def users_update_fields(db, user_id: str, fields: dict) -> None:
    if not fields:
        return
    cols, vals = [], []
    for k, v in fields.items():
        cols.append(f"{k} = ?")
        vals.append(1 if isinstance(v, bool) else v)
    vals.append(user_id)
    await d1_run(db, f"UPDATE users SET {', '.join(cols)} WHERE id = ?", *vals)


async def users_search(db, q: Optional[str], plan: Optional[str], role: Optional[str], limit: int) -> list[dict]:
    where = []
    params: list[Any] = []
    if q:
        where.append("(name LIKE ? OR email LIKE ?)")
        like = f"%{q}%"
        params.extend([like, like])
    if plan:
        where.append("plan = ?")
        params.append(plan)
    if role:
        where.append("role = ?")
        params.append(role)
    sql = "SELECT * FROM users"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    rows = await d1_all(db, sql, *params)
    return [_user_public(r) for r in rows]


# ---------- BETS ----------
def _bet_row_to_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"] or "",
        "category": row["category"],
        "sport": row["sport"],
        "competition": row["competition"] or "",
        "selections": json.loads(row["selections_json"] or "[]"),
        "total_odd": row["total_odd"],
        "probability": row["probability"],
        "risk": row["risk"],
        "rationale": row["rationale"] or "",
        "scheduled_at": row["scheduled_at"],
        "required_plan": row["required_plan"],
        "external_url": row["external_url"],
        "featured": bool(row["featured"]),
        "image_url": row["image_url"],
        "status": row["status"],
        "published": bool(row["published"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


async def bets_insert(db, bet: dict) -> None:
    await d1_run(
        db,
        """INSERT INTO bets
           (id, title, description, category, sport, competition, selections_json,
            total_odd, probability, risk, rationale, scheduled_at, required_plan,
            external_url, featured, image_url, status, published, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        bet["id"], bet["title"], bet["description"], bet["category"], bet["sport"],
        bet["competition"], json.dumps(bet["selections"]), bet["total_odd"],
        bet.get("probability"), bet["risk"], bet["rationale"], bet.get("scheduled_at"),
        bet["required_plan"], bet.get("external_url"),
        1 if bet["featured"] else 0, bet.get("image_url"),
        bet["status"], 1 if bet["published"] else 0,
        bet["created_at"], bet["updated_at"],
    )


async def bets_get(db, bet_id: str) -> Optional[dict]:
    row = await d1_first(db, "SELECT * FROM bets WHERE id = ?", bet_id)
    return _bet_row_to_dict(row) if row else None


async def bets_list(
    db,
    *,
    published: Optional[bool] = None,
    status: Optional[str] = None,
    required_plan: Optional[str] = None,
    featured: Optional[bool] = None,
    limit: int = 50,
) -> list[dict]:
    where, params = [], []
    if published is not None:
        where.append("published = ?")
        params.append(1 if published else 0)
    if status is not None:
        where.append("status = ?")
        params.append(status)
    if required_plan is not None:
        where.append("required_plan = ?")
        params.append(required_plan)
    if featured is not None:
        where.append("featured = ?")
        params.append(1 if featured else 0)
    sql = "SELECT * FROM bets"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    rows = await d1_all(db, sql, *params)
    return [_bet_row_to_dict(r) for r in rows]


async def bets_history(db, limit: int = 200) -> list[dict]:
    rows = await d1_all(
        db,
        """SELECT * FROM bets
           WHERE published = 1 AND status IN ('GREEN', 'RED', 'VOID')
           ORDER BY created_at DESC LIMIT ?""",
        limit,
    )
    return [_bet_row_to_dict(r) for r in rows]


async def bets_update(db, bet_id: str, updates: dict) -> Optional[dict]:
    if not updates:
        return await bets_get(db, bet_id)
    cols, vals = [], []
    for k, v in updates.items():
        if k == "selections":
            cols.append("selections_json = ?")
            vals.append(json.dumps(v))
        elif k in ("featured", "published"):
            cols.append(f"{k} = ?")
            vals.append(1 if v else 0)
        else:
            cols.append(f"{k} = ?")
            vals.append(v)
    vals.append(bet_id)
    result = await d1_run(
        db, f"UPDATE bets SET {', '.join(cols)} WHERE id = ?", *vals
    )
    # Compat: D1 devolve meta em result — não checamos matched_count aqui
    return await bets_get(db, bet_id)


async def bets_delete(db, bet_id: str) -> bool:
    row = await d1_first(db, "SELECT id FROM bets WHERE id = ?", bet_id)
    if not row:
        return False
    await d1_run(db, "DELETE FROM bets WHERE id = ?", bet_id)
    return True


async def bets_count_by(db, *filters: str) -> int:
    where = " AND ".join(f"{f}" for f in filters) if filters else "1=1"
    row = await d1_first(db, f"SELECT COUNT(*) AS c FROM bets WHERE {where}")
    return int(row["c"]) if row else 0


# ---------- Password reset tokens ----------
async def prt_insert(db, token_id: str, user_id: str, token_hash: str, expires_at: str, created_at: str) -> None:
    await d1_run(
        db,
        """INSERT INTO password_reset_tokens
           (id, user_id, token_hash, expires_at, created_at, used)
           VALUES (?, ?, ?, ?, ?, 0)""",
        token_id, user_id, token_hash, expires_at, created_at,
    )


async def prt_latest_unused(db, user_id: str) -> Optional[dict]:
    return await d1_first(
        db,
        """SELECT * FROM password_reset_tokens
           WHERE user_id = ? AND used = 0
           ORDER BY created_at DESC LIMIT 1""",
        user_id,
    )


async def prt_get_by_hash_unused(db, token_hash: str) -> Optional[dict]:
    return await d1_first(
        db,
        "SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used = 0",
        token_hash,
    )


async def prt_invalidate_all(db, user_id: str, when_iso: str) -> None:
    await d1_run(
        db,
        """UPDATE password_reset_tokens SET used = 1, invalidated_at = ?
           WHERE user_id = ? AND used = 0""",
        when_iso, user_id,
    )


async def prt_mark_used(db, user_id: str, when_iso: str) -> None:
    await d1_run(
        db,
        """UPDATE password_reset_tokens SET used = 1, used_at = ?
           WHERE user_id = ? AND used = 0""",
        when_iso, user_id,
    )


# ---------- Audit ----------
async def audit_log(db, *, log_id: str, admin_id: str, admin_email: str,
                    action: str, entity: str, entity_id: str,
                    metadata: dict, created_at: str) -> None:
    await d1_run(
        db,
        """INSERT INTO audit_logs
           (id, admin_id, admin_email, action, entity, entity_id, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        log_id, admin_id, admin_email, action, entity, entity_id or "",
        json.dumps(metadata or {}), created_at,
    )


# ---------- Kiwify events ----------
async def kiwify_event_exists(db, event_id: str) -> bool:
    row = await d1_first(db, "SELECT event_id FROM kiwify_events WHERE event_id = ?", event_id)
    return row is not None


async def kiwify_event_insert(db, event_id: str, payload: dict, received_at: str) -> None:
    await d1_run(
        db,
        "INSERT INTO kiwify_events (event_id, payload, received_at) VALUES (?, ?, ?)",
        event_id, json.dumps(payload), received_at,
    )
