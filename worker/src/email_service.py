"""Resend direct integration (via Workers `fetch`).

Requer:
- RESEND_API_KEY (secret)
- RESEND_FROM (var pública)
- APP_PUBLIC_URL (var pública) — usado na URL de reset

Guardrails leves inline: sem <form>/<input>, sem URLs http:// não-https.
Templates são estáticos, caller passa apenas nome e token.
"""
from __future__ import annotations

import logging
from html import escape

from deps import get_secret
from http_client import fetch_json

logger = logging.getLogger("vertice.email")

_BRAND_STYLES = (
    "font-family:Arial,Helvetica,sans-serif;"
    "background:#0A0A0A;color:#ffffff;padding:32px;border-radius:12px;"
)


def _wrap(inner_html: str, brand: str) -> str:
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:#0A0A0A;padding:24px 0"><tr><td align="center">'
        f'<table role="presentation" width="600" cellpadding="0" cellspacing="0" '
        f'style="{_BRAND_STYLES}max-width:600px;width:100%;">'
        f"<tr><td>"
        f'<div style="font-size:28px;font-weight:800;letter-spacing:2px;color:#CCFF00;'
        f'margin-bottom:24px">VÉRTICE SPORTS</div>'
        f"{inner_html}"
        f'<p style="font-size:12px;color:#888;margin-top:32px">Enviado por '
        f"{escape(brand)}. Nunca solicitamos senhas, códigos ou dados de "
        f"cartão por e-mail.</p>"
        f"</td></tr></table></td></tr></table>"
    )


async def _send_via_resend(*, to: str, subject: str, html: str) -> str | None:
    api_key = get_secret("RESEND_API_KEY")
    if not api_key:
        logger.warning("[email] RESEND_API_KEY ausente; envio ignorado.")
        return None
    sender = get_secret("RESEND_FROM", "Vértice Sports <noreply@verticesports.ia.br>")
    reply_to = get_secret("EMAIL_REPLY_TO")
    payload: dict = {"from": sender, "to": [to], "subject": subject, "html": html}
    if reply_to:
        payload["reply_to"] = reply_to
    status, body = await fetch_json(
        "https://api.resend.com/emails",
        method="POST",
        headers={"Authorization": f"Bearer {api_key}"},
        json_body=payload,
    )
    if status >= 400:
        logger.error(f"[email] Resend erro {status}: {body}")
        return None
    if isinstance(body, dict):
        return body.get("id")
    return None


async def send_password_reset_email(*, to: str, name: str, raw_token: str) -> None:
    brand = get_secret("EMAIL_FROM_NAME", "Vértice Sports")
    app_url = (get_secret("APP_PUBLIC_URL", "https://verticesports.ia.br") or "").rstrip("/")
    reset_url = f"{app_url}/redefinir-senha?token={raw_token}"
    inner = (
        f'<h1 style="font-size:22px;color:#ffffff;margin:0 0 16px 0">Olá, {escape(name)}</h1>'
        f'<p style="color:#cccccc;line-height:1.6;margin:0 0 20px 0">Recebemos um pedido '
        f"para redefinir sua senha no Vértice Sports. Toque no botão abaixo para criar "
        f"uma nova senha.</p>"
        f'<p style="margin:24px 0"><a href="{reset_url}" '
        f'style="background:#CCFF00;color:#000000;padding:14px 28px;border-radius:8px;'
        f'text-decoration:none;font-weight:700;display:inline-block">Redefinir minha senha</a></p>'
        f'<p style="color:#888;font-size:13px;line-height:1.5;margin:16px 0 0 0">'
        f'Este link expira em <strong style="color:#CCFF00">30 minutos</strong> e pode ser '
        f"usado apenas uma vez. Se você não solicitou esta redefinição, ignore este e-mail — "
        f"sua senha permanece a mesma.</p>"
    )
    await _send_via_resend(
        to=to,
        subject="Redefinição de senha — Vértice Sports",
        html=_wrap(inner, brand),
    )


async def send_password_changed_email(*, to: str, name: str) -> None:
    brand = get_secret("EMAIL_FROM_NAME", "Vértice Sports")
    inner = (
        f'<h1 style="font-size:22px;color:#ffffff;margin:0 0 16px 0">Sua senha foi alterada</h1>'
        f'<p style="color:#cccccc;line-height:1.6;margin:0 0 20px 0">Olá, {escape(name)}. '
        f"Confirmamos que a senha da sua conta no Vértice Sports foi alterada com sucesso.</p>"
        f'<p style="color:#888;font-size:13px;line-height:1.5;margin:16px 0 0 0">'
        f"Se você não reconhece esta alteração, entre em contato imediatamente com nosso "
        f"suporte respondendo a este e-mail.</p>"
    )
    await _send_via_resend(
        to=to,
        subject="Sua senha do Vértice Sports foi alterada",
        html=_wrap(inner, brand),
    )
