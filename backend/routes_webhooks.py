"""Kiwify webhook endpoint. Disabled unless KIWIFY_WEBHOOK_SECRET is set."""
from __future__ import annotations

import logging
import os
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/kiwify", tags=["kiwify"])

KIWIFY_WEBHOOK_SECRET = os.environ.get("KIWIFY_WEBHOOK_SECRET", "").strip()


@router.post("/webhook")
async def kiwify_webhook(request: Request):
    if not KIWIFY_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook Kiwify não configurado")

    # Kiwify sends the secret either as query param or header, depending on config.
    provided = (
        request.query_params.get("token")
        or request.headers.get("x-kiwify-signature")
        or ""
    ).strip()
    if provided != KIWIFY_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Assinatura inválida")

    body = await request.json()
    from server import db

    event_id = str(body.get("webhook_event_id") or body.get("order_id") or body.get("id") or "")
    if event_id:
        exists = await db.kiwify_events.find_one({"event_id": event_id}, {"_id": 0})
        if exists:
            return {"ok": True, "deduped": True}
        await db.kiwify_events.insert_one({
            "event_id": event_id,
            "payload": body,
            "received_at": datetime.utcnow().isoformat(),
        })

    email = ((body.get("Customer") or {}).get("email")
             or (body.get("customer") or {}).get("email") or "").lower()
    order_status = (body.get("order_status") or body.get("event") or "").lower()
    product = (body.get("Product") or {}).get("product_name") or body.get("product_name") or ""
    plan = "FULL" if "full" in product.lower() else ("PRO" if "pro" in product.lower() else None)

    if email and plan:
        if order_status in ("paid", "approved", "subscription_approved", "subscription_renewed"):
            await db.users.update_one(
                {"email": email},
                {"$set": {
                    "plan": plan,
                    "subscription_status": "ACTIVE",
                    "updated_at": datetime.utcnow().isoformat(),
                }},
            )
        elif order_status in ("canceled", "refunded", "subscription_canceled", "chargedback"):
            await db.users.update_one(
                {"email": email},
                {"$set": {
                    "plan": "FREE",
                    "subscription_status": "CANCELED",
                    "updated_at": datetime.utcnow().isoformat(),
                }},
            )

    return {"ok": True}
