"""Telegram integration — Vértice Sports FULL."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from deps import get_secret, require_admin
from http_client import fetch_json

router = APIRouter(prefix="/telegram", tags=["telegram"])


class TelegramMessage(BaseModel):
    text: str = Field(min_length=1, max_length=4096)
    disable_notification: bool = False


def _config():
    token = get_secret("TELEGRAM_BOT_TOKEN")
    channel_id = get_secret("TELEGRAM_CHANNEL_ID")

    return token, channel_id


async def _telegram_request(method: str, payload: dict | None = None):
    token, _ = _config()

    if not token:
        raise HTTPException(
            status_code=503,
            detail="TELEGRAM_BOT_TOKEN não configurado",
        )

    status, data = await fetch_json(
        f"https://api.telegram.org/bot{token}/{method}",
        method="POST",
        json_body=payload or {},
    )

    if (
        status >= 400
        or not isinstance(data, dict)
        or not data.get("ok")
    ):
        detail = (
            data.get("description")
            if isinstance(data, dict)
            else None
        )

        raise HTTPException(
            status_code=502,
            detail=detail or "Erro ao comunicar com o Telegram",
        )

    return data.get("result")


@router.get("/health")
async def telegram_health(admin=Depends(require_admin)):
    token, channel_id = _config()

    if not token or not channel_id:
        return {
            "configured": False,
            "connected": False,
            "bot": None,
            "channel": None,
        }

    try:
        bot = await _telegram_request("getMe")

        channel = await _telegram_request(
            "getChat",
            {
                "chat_id": channel_id,
            },
        )

        member = None

        if bot and bot.get("id"):
            try:
                member = await _telegram_request(
                    "getChatMember",
                    {
                        "chat_id": channel_id,
                        "user_id": bot["id"],
                    },
                )
            except Exception:
                member = None

        return {
            "configured": True,
            "connected": True,
            "bot": {
                "id": bot.get("id"),
                "name": bot.get("first_name"),
                "username": bot.get("username"),
            },
            "channel": {
                "id": channel.get("id"),
                "title": channel.get("title"),
                "type": channel.get("type"),
            },
            "membership": {
                "status": member.get("status"),
                "can_post_messages": member.get(
                    "can_post_messages"
                ),
            } if member else None,
        }

    except HTTPException as exc:
        return {
            "configured": True,
            "connected": False,
            "error": exc.detail,
            "bot": None,
            "channel": None,
        }


@router.post("/send")
async def telegram_send(
    payload: TelegramMessage,
    admin=Depends(require_admin),
):
    token, channel_id = _config()

    if not token or not channel_id:
        raise HTTPException(
            status_code=503,
            detail="Integração Telegram não configurada",
        )

    result = await _telegram_request(
        "sendMessage",
        {
            "chat_id": channel_id,
            "text": payload.text,
            "disable_notification": payload.disable_notification,
        },
    )

    return {
        "ok": True,
        "message_id": result.get("message_id"),
        "date": result.get("date"),
        "chat_id": (
            result.get("chat") or {}
        ).get("id"),
    }
