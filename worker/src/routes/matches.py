"""Matches routes — API-Football + football-data.org via Workers `fetch`."""
from __future__ import annotations

import logging
from datetime import date, timedelta

from fastapi import APIRouter, Query

from deps import get_secret
from http_client import fetch_json

logger = logging.getLogger("vertice.matches")
router = APIRouter(prefix="/matches", tags=["matches"])


async def _api_football_fixtures(when: str) -> list[dict]:
    key = get_secret("API_FOOTBALL_KEY")
    if not key:
        return []
    params = "live=all" if when == "live" else f"date={when}"
    status, data = await fetch_json(
        f"https://v3.football.api-sports.io/fixtures?{params}",
        headers={"x-apisports-key": key},
    )
    if status >= 400 or not isinstance(data, dict):
        return []
    out = []
    for f in data.get("response") or []:
        fx = f.get("fixture", {}) or {}
        tm = f.get("teams", {}) or {}
        lg = f.get("league", {}) or {}
        gl = f.get("goals", {}) or {}
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
    key = get_secret("FOOTBALL_DATA_API_KEY")
    if not key or when == "live":
        return []
    status, data = await fetch_json(
        f"https://api.football-data.org/v4/matches?dateFrom={when}&dateTo={when}",
        headers={"X-Auth-Token": key},
    )
    if status >= 400 or not isinstance(data, dict):
        return []
    out = []
    for m in data.get("matches") or []:
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
            "country": (m.get("area") or {}).get("name"),
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
    return {
        "providers": [
            {"name": "API-Football", "configured": bool(get_secret("API_FOOTBALL_KEY"))},
            {"name": "football-data.org", "configured": bool(get_secret("FOOTBALL_DATA_API_KEY"))},
            {"name": "TheSportsDB", "configured": False},
        ]
    }


@router.get("")
async def list_matches(when: str = Query("today", pattern="^(today|tomorrow|yesterday|live)$")):
    if not get_secret("API_FOOTBALL_KEY") and not get_secret("FOOTBALL_DATA_API_KEY"):
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
    for name, fn in (
        ("api-football", _api_football_fixtures),
        ("football-data", _football_data_fixtures),
    ):
        try:
            items.extend(await fn(d))
        except Exception as e:
            errors.append(f"{name}: {str(e)[:120]}")
            logger.warning(f"provider {name} falhou: {e}")

    return {"configured": True, "items": _dedupe(items), "errors": errors}
