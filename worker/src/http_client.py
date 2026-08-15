"""Outbound HTTP via `js.fetch` (runtime nativo do Cloudflare Workers).

Não usa httpx/urllib. Compatível 100% com Python Workers (Pyodide).
"""
from __future__ import annotations

import json
from typing import Any, Optional

try:
    import js  # type: ignore
    from pyodide.ffi import to_js  # type: ignore

    _HAS_RUNTIME = True
except Exception:  # pragma: no cover — só acontece em ambientes fora do Worker
    _HAS_RUNTIME = False


async def fetch_json(
    url: str,
    *,
    method: str = "GET",
    headers: Optional[dict] = None,
    json_body: Optional[Any] = None,
    timeout_ms: int = 30_000,
) -> tuple[int, Any]:
    """Retorna (status_code, parsed_json_or_text)."""
    if not _HAS_RUNTIME:
        raise RuntimeError(
            "fetch_json só pode ser chamado dentro do runtime Cloudflare Python Worker"
        )
    hdrs = dict(headers or {})
    init: dict = {"method": method, "headers": hdrs}
    if json_body is not None:
        init["body"] = json.dumps(json_body)
        hdrs["Content-Type"] = "application/json"

    resp = await js.fetch(url, to_js(init, dict_converter=js.Object.fromEntries))
    status = int(resp.status)
    text = await resp.text()
    try:
        return status, json.loads(text)
    except Exception:
        return status, text
