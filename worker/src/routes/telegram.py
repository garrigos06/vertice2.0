from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from deps import get_secret, require_admin
from http_client import fetch_json

try:
    import js  # type: ignore
    from pyodide.ffi import to_js  # type: ignore

    _HAS_WORKER_RUNTIME = True
except Exception:
    _HAS_WORKER_RUNTIME = False


router = APIRouter(prefix="/telegram", tags=["telegram"])


ALLOWED_PHOTO_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

MAX_PHOTO_SIZE = 10 * 1024 * 1024


class TelegramMessage(BaseModel):
    text: str = Field(default="", max_length=4096)
    image_url: Optional[str] = Field(default=None, max_length=2000)
    disable_notification: bool = False


def _config():
    token = get_secret("TELEGRAM_BOT_TOKEN")
    channel_id = get_secret("TELEGRAM_CHANNEL_ID")

    return token, channel_id


async def _telegram_request(
    method: str,
    payload: dict | None = None,
):
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


async def _telegram_upload_photo(
    image_bytes: bytes,
    *,
    content_type: str,
    filename: str,
    caption: str = "",
    disable_notification: bool = False,
):
    token, channel_id = _config()

    if not token or not channel_id:
        raise HTTPException(
            status_code=503,
            detail="Integração Telegram não configurada",
        )

    if not _HAS_WORKER_RUNTIME:
        raise HTTPException(
            status_code=500,
            detail="Upload disponível apenas no runtime Cloudflare Worker",
        )

    try:
        # bytes Python -> objeto binário JavaScript
        binary = to_js(image_bytes)

        parts = js.Array.new()
        parts.push(binary)

        blob_options = js.Object.new()
        blob_options.type = content_type

        blob = js.Blob.new(
            parts,
            blob_options,
        )

        form = js.FormData.new()

        form.append(
            "chat_id",
            str(channel_id),
        )

        form.append(
            "photo",
            blob,
            filename,
        )

        if caption:
            form.append(
                "caption",
                caption,
            )

        form.append(
            "disable_notification",
            "true" if disable_notification else "false",
        )

        request_init = js.Object.new()
        request_init.method = "POST"
        request_init.body = form

        response = await js.fetch(
            f"https://api.telegram.org/bot{token}/sendPhoto",
            request_init,
        )

        raw = await response.text()

        try:
            data = json.loads(raw)
        except Exception:
            data = None

        if (
            int(response.status) >= 400
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
                detail=detail
                or "Erro ao enviar imagem para o Telegram",
            )

        return data.get("result")

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "Falha no upload da imagem: "
                f"{str(exc)[:160]}"
            ),
        ) from exc


@router.get("/health")
async def telegram_health(
    admin=Depends(require_admin),
):
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
            }
            if member
            else None,
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

    text = (payload.text or "").strip()
    image_url = (payload.image_url or "").strip()

    if not text and not image_url:
        raise HTTPException(
            status_code=400,
            detail="Informe uma mensagem ou uma imagem",
        )

    # Imagem hospedada externamente
    if image_url:
        if text and len(text) > 1024:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Legenda com imagem suporta até "
                    "1024 caracteres no Telegram"
                ),
            )

        result = await _telegram_request(
            "sendPhoto",
            {
                "chat_id": channel_id,
                "photo": image_url,
                "caption": text if text else None,
                "disable_notification": (
                    payload.disable_notification
                ),
            },
        )

        return {
            "ok": True,
            "type": "photo",
            "message_id": result.get("message_id"),
            "date": result.get("date"),
            "chat_id": (
                result.get("chat") or {}
            ).get("id"),
        }

    # Mensagem de texto normal
    result = await _telegram_request(
        "sendMessage",
        {
            "chat_id": channel_id,
            "text": text,
            "disable_notification": (
                payload.disable_notification
            ),
        },
    )

    return {
        "ok": True,
        "type": "message",
        "message_id": result.get("message_id"),
        "date": result.get("date"),
        "chat_id": (
            result.get("chat") or {}
        ).get("id"),
    }


@router.post("/send-upload")
async def telegram_send_upload(
    request: Request,
    caption: str = Query(
        default="",
        max_length=1024,
    ),
    filename: str = Query(
        default="vertice.jpg",
        max_length=180,
    ),
    silent: bool = Query(default=False),
    admin=Depends(require_admin),
):
    """
    Recebe uma imagem binária diretamente do painel admin
    e repassa ao Telegram como multipart/form-data.
    """

    content_type = (
        request.headers.get("content-type") or ""
    ).split(";", 1)[0].strip().lower()

    if content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Formato inválido. "
                "Use JPG, PNG ou WEBP."
            ),
        )

    image_bytes = await request.body()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Nenhuma imagem recebida",
        )

    if len(image_bytes) > MAX_PHOTO_SIZE:
        raise HTTPException(
            status_code=413,
            detail="A imagem deve ter no máximo 10 MB",
        )

    safe_filename = (
        filename
        .replace("/", "_")
        .replace("\\", "_")
        .strip()
    )

    if not safe_filename:
        safe_filename = "vertice.jpg"

    result = await _telegram_upload_photo(
        image_bytes,
        content_type=content_type,
        filename=safe_filename,
        caption=caption.strip(),
        disable_notification=silent,
    )

    return {
        "ok": True,
        "type": "photo_upload",
        "message_id": result.get("message_id"),
        "date": result.get("date"),
        "chat_id": (
            result.get("chat") or {}
        ).get("id"),
    }
