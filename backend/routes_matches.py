"""Live matches + calendar via API-Football / football-data.org.

If no provider is configured, endpoints return `configured: false` and empty
data so the UI shows a proper "não configurado" fallback (never fake stats).
"""
from __future__ import annotations

import logging
import os
from datetime import date, datetime, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/matches", tags=["matches"])

API_FOOTBALL_KEY = os.environ.get("API_FOOTBALL_KEY", "").strip()
FOOTBALL_DATA_KEY = os.environ.get("FOOTBALL_DATA_API_KEY", "").strip()


async def _api_football_fixtures(when: str) -> list[dict]:
    if not API_FOOTBALL_KEY:
        return []
    params = {"date": when} if when != "live" else {"live": "all"}
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(
            "https://v3.football.api-sports.io/fixtures",
            headers={"x-apisports-key": API_FOOTBALL_KEY},
            params=params,
        )
        r.raise_for_status()
        data = r.json().get("response", [])
    out = []
    for f in data:
        fx = f.get("fixture", {}); tm = f.get("teams", {}); lg = f.get("league", {})
        gl = f.get("goals", {})
        out.append({
            "id": f"af_{fx.get('id')}",
            "kickoff": fx.get("date"),
            "status": (fx.get("status") or {}).get("short", ""),
            "elapsed": (fx.get("status") or {}).get("elapsed"),
            "home": (tm.get("home") or {}).get("name"),
            "away": (tm.get("away") or {}).get("name"),
            "home_logo": (tm.get("home") or {}).get("logo"),
            "away_logo": (tm.get("away") or {}).get("logo"),
            "score_home": gl.get("home"),
            "score_away": gl.get("away"),
            "competition": lg.get("name"),
            "competition_logo": lg.get("logo"),
            "country": lg.get("country"),
            "source": "api-football",
        })
    return out


async def _football_data_fixtures(when: str) -> list[dict]:
    if not FOOTBALL_DATA_KEY or when == "live":
        return []  # football-data doesn't have easy live endpoint on free tier
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(
            "https://api.football-data.org/v4/matches",
            headers={"X-Auth-Token": FOOTBALL_DATA_KEY},
            params={"dateFrom": when, "dateTo": when},
        )
        r.raise_for_status()
        data = r.json().get("matches", [])
    out = []
    for m in data:
        out.append({
            "id": f"fd_{m.get('id')}",
            "kickoff": m.get("utcDate"),
            "status": m.get("status"),
            "home": (m.get("homeTeam") or {}).get("name"),
            "away": (m.get("awayTeam") or {}).get("name"),
            "home_logo": (m.get("homeTeam") or {}).get("crest"),
            "away_logo": (m.get("awayTeam") or {}).get("crest"),
            "score_home": ((m.get("score") or {}).get("fullTime") or {}).get("home"),
            "score_away": ((m.get("score") or {}).get("fullTime") or {}).get("away"),
            "competition": (m.get("competition") or {}).get("name"),
            "competition_logo": (m.get("competition") or {}).get("emblem"),
            "country": ((m.get("area") or {}).get("name")),
            "source": "football-data",
        })
    return out


def _dedupe(items: list[dict]) -> list[dict]:
    seen = {}
    for it in items:
        key = f"{(it.get('home') or '').lower()}|{(it.get('away') or '').lower()}|{(it.get('kickoff') or '')[:10]}"
        if key not in seen:
            seen[key] = it
    return list(seen.values())


@router.get("/health")
async def providers_health():
    """Status card for the Inteligência health panel."""
    return {
        "providers": [
            {"name": "API-Football", "configured": bool(API_FOOTBALL_KEY)},
            {"name": "football-data.org", "configured": bool(FOOTBALL_DATA_KEY)},
            {"name": "TheSportsDB", "configured": False},
        ]
    }


@router.get("")
async def list_matches(
    when: str = Query("today", pattern="^(today|tomorrow|yesterday|live)$"),
):
    if not API_FOOTBALL_KEY and not FOOTBALL_DATA_KEY:
        return {"configured": False, "items": [], "message": "Nenhum provedor esportivo configurado."}

    if when == "today":
        d = date.today().isoformat()
    elif when == "tomorrow":
        d = (date.today() + timedelta(days=1)).isoformat()
    elif when == "yesterday":
        d = (date.today() - timedelta(days=1)).isoformat()
    else:
        d = "live"

    items: list[dict] = []
    errors: list[str] = []
    for fn in (_api_football_fixtures, _football_data_fixtures):
        try:
            items.extend(await fn(d))
        except httpx.HTTPStatusError as e:
            errors.append(f"{fn.__name__}: {e.response.status_code}")
        except Exception as e:
            errors.append(f"{fn.__name__}: {str(e)[:120]}")

    return {
        "configured": True,
        "items": _dedupe(items),
        "errors": errors,
    }
