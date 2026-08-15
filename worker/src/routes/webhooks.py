"""Kiwify webhook — plan activation."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from deps import get_db, get_secret
from models import now_iso
from repo import d1_run, kiwify_event_exists, kiwify_event_insert, users_get_by_email

router = APIRouter(prefix="/kiwify", tags=["kiwify"])


@router.post("/webhook")
async def kiwify_webhook(request: Request, db=Depends(get_db)):
    secret = get_secret("KIWIFY_WEBHOOK_SECRET")
    if not secret:
        raise HTTPException(status_code=503, detail="Webhook Kiwify não configurado")

    provided = (
        request.query_params.get("token")
        or request.headers.get("x-kiwify-signature")
        or ""
    ).strip()
    if provided != secret:
        raise HTTPException(status_code=401, detail="Assinatura inválida")

    body = await request.json()
    event_id = str(
        body.get("webhook_event_id")
        or body.get("order_id")
        or body.get("id")
        or ""
    )
    if event_id and await kiwify_event_exists(db, event_id):
        return {"ok": True, "deduped": True}
    if event_id:
        await kiwify_event_insert(db, event_id, body, now_iso())

    email = (
        (body.get("Customer") or {}).get("email")
        or (body.get("customer") or {}).get("email")
        or ""
    ).lower()
    order_status = (body.get("order_status") or body.get("event") or "").lower()
    product = (body.get("Product") or {}).get("product_name") or body.get("product_name") or ""
    plan = "FULL" if "full" in product.lower() else ("PRO" if "pro" in product.lower() else None)

    if email and plan:
        user = await users_get_by_email(db, email)
        if user:
            if order_status in ("paid", "approved", "subscription_approved", "subscription_renewed"):
                await d1_run(
                    db,
                    "UPDATE users SET plan = ?, subscription_status = 'ACTIVE', updated_at = ? WHERE id = ?",
                    plan, now_iso(), user["id"],
                )
            elif order_status in ("canceled", "refunded", "subscription_canceled", "chargedback"):
                await d1_run(
                    db,
                    "UPDATE users SET plan = 'FREE', subscription_status = 'CANCELED', updated_at = ? WHERE id = ?",
                    now_iso(), user["id"],
                )

    return {"ok": True}
