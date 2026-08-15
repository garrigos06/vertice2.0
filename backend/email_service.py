"""Emergent-managed Resend email integration for Vértice Sports.

Follows the guardrails in the Emergent playbook (G1-G6). Templates are
server-side only; callers pass IDs, never HTML.
"""
from __future__ import annotations

import ipaddress
import logging
import os
import re
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")
APP_PUBLIC_URL = os.environ.get("APP_PUBLIC_URL", "https://verticesports.ia.br").rstrip("/")

# ---------- Guardrail gate (from Emergent playbook — do not weaken) ----------
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = (
    "reply with your password", "reply with the code", "send your password", "cvv",
    "send us your password", "enter your password below", "confirm your card number",
    "your full card number", "seed phrase", "recovery phrase", "verify your card",
    "social security number", "confirm your bank details",
)
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


# ---------- Send ----------
async def _send_email(*, to: str, subject: str, html: str) -> str | None:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if EMAIL_REPLY_TO:
        payload["contact_email"] = EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        raise HTTPException(status_code=502, detail="Failed to send email")
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send email")


# ---------- Templates ----------
_BRAND_STYLES = (
    "font-family:Arial,Helvetica,sans-serif;"
    "background:#0A0A0A;color:#ffffff;padding:32px;border-radius:12px;"
)


def _wrap(inner_html: str) -> str:
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:#0A0A0A;padding:24px 0"><tr><td align="center">'
        f'<table role="presentation" width="600" cellpadding="0" cellspacing="0" '
        f'style="{_BRAND_STYLES}max-width:600px;width:100%;">'
        f'<tr><td>'
        f'<div style="font-size:28px;font-weight:800;letter-spacing:2px;color:#CCFF00;'
        f'margin-bottom:24px">VÉRTICE SPORTS</div>'
        f"{inner_html}"
        f'<p style="font-size:12px;color:#888;margin-top:32px">Enviado por '
        f'{escape(EMAIL_FROM_NAME)}. Nunca solicitamos senhas, códigos ou dados de '
        f'cartão por e-mail.</p>'
        f'</td></tr></table></td></tr></table>'
    )


async def send_password_reset_email(*, to: str, name: str, raw_token: str) -> None:
    reset_url = f"{APP_PUBLIC_URL}/redefinir-senha?token={raw_token}"
    inner = (
        f'<h1 style="font-size:22px;color:#ffffff;margin:0 0 16px 0">Olá, {escape(name)}</h1>'
        f'<p style="color:#cccccc;line-height:1.6;margin:0 0 20px 0">Recebemos um pedido '
        f'para redefinir sua senha no Vértice Sports. Toque no botão abaixo para criar '
        f'uma nova senha.</p>'
        f'<p style="margin:24px 0"><a href="{reset_url}" '
        f'style="background:#CCFF00;color:#000000;padding:14px 28px;border-radius:8px;'
        f'text-decoration:none;font-weight:700;display:inline-block">Redefinir minha senha</a></p>'
        f'<p style="color:#888;font-size:13px;line-height:1.5;margin:16px 0 0 0">'
        f'Este link expira em <strong style="color:#CCFF00">30 minutos</strong> e pode ser '
        f'usado apenas uma vez. Se você não solicitou esta redefinição, ignore este e-mail — '
        f'sua senha permanece a mesma.</p>'
    )
    await _send_email(
        to=to,
        subject="Redefinição de senha — Vértice Sports",
        html=_wrap(inner),
    )


async def send_password_changed_email(*, to: str, name: str) -> None:
    inner = (
        f'<h1 style="font-size:22px;color:#ffffff;margin:0 0 16px 0">Sua senha foi alterada</h1>'
        f'<p style="color:#cccccc;line-height:1.6;margin:0 0 20px 0">Olá, {escape(name)}. '
        f'Confirmamos que a senha da sua conta no Vértice Sports foi alterada com sucesso.</p>'
        f'<p style="color:#888;font-size:13px;line-height:1.5;margin:16px 0 0 0">'
        f'Se você não reconhece esta alteração, entre em contato imediatamente com nosso '
        f'suporte respondendo a este e-mail.</p>'
    )
    await _send_email(
        to=to,
        subject="Sua senha do Vértice Sports foi alterada",
        html=_wrap(inner),
    )
