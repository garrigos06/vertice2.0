"""Matches routes — API-Football + football-data.org."""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Query

from deps import get_secret
from http_client import fetch_json

logger = logging.getLogger("vertice.matches")
router = APIRouter(prefix="/matches", tags=["matches"])

# Brasil não utiliza horário de verão atualmente.
BRASILIA_TZ = timezone(timedelta(hours=-3))


def _local_today() -> date:
    """Retorna a data atual no horário de Brasília."""
    return datetime.now(timezone.utc).astimezone(BRASILIA_TZ).date()


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        normalized = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)

        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        return dt
    except (ValueError, TypeError):
        return None


def _local_date_from_kickoff(value: str | None) -> date | None:
    dt = _parse_datetime(value)
    if not dt:
        return None

    return dt.astimezone(BRASILIA_TZ).date()


def _normalize_status(source: str, value: str | None) -> str:
    status = (value or "").upper()

    if source == "api-football":
        mapping = {
            "TBD": "SCHEDULED",
            "NS": "SCHEDULED",
            "1H": "LIVE",
            "HT": "HALFTIME",
            "2H": "LIVE",
            "ET": "LIVE",
            "BT": "LIVE",
            "P": "LIVE",
            "SUSP": "SUSPENDED",
            "INT": "INTERRUPTED",
            "FT": "FINISHED",
            "AET": "FINISHED",
            "PEN": "FINISHED",
            "PST": "POSTPONED",
            "CANC": "CANCELED",
            "ABD": "ABANDONED",
            "AWD": "FINISHED",
            "WO": "FINISHED",
        }

        return mapping.get(status, status)

    mapping = {
        "TIMED": "SCHEDULED",
        "SCHEDULED": "SCHEDULED",
        "IN_PLAY": "LIVE",
        "PAUSED": "HALFTIME",
        "FINISHED": "FINISHED",
        "POSTPONED": "POSTPONED",
        "SUSPENDED": "SUSPENDED",
        "CANCELLED": "CANCELED",
        "CANCELED": "CANCELED",
    }

    return mapping.get(status, status)


async def _api_football_fixtures(
    target_date: date | None,
    live: bool = False,
) -> list[dict]:
    key = get_secret("API_FOOTBALL_KEY")

    if not key:
        return []

    if live:
        params = "live=all&timezone=America%2FSao_Paulo"
    else:
        params = (
            f"date={target_date.isoformat()}"
            "&timezone=America%2FSao_Paulo"
        )

    status, data = await fetch_json(
        f"https://v3.football.api-sports.io/fixtures?{params}",
        headers={"x-apisports-key": key},
    )

    if status >= 400 or not isinstance(data, dict):
        logger.warning(
            "API-Football retornou status inválido: %s",
            status,
        )
        return []

    out = []

    for f in data.get("response") or []:
        fx = f.get("fixture", {}) or {}
        tm = f.get("teams", {}) or {}
        lg = f.get("league", {}) or {}
        gl = f.get("goals", {}) or {}

        kickoff = fx.get("date")

        # Segurança extra:
        # mesmo usando timezone na API, garante que o jogo pertence
        # ao dia correto no horário brasileiro.
        if not live and target_date:
            local_date = _local_date_from_kickoff(kickoff)

            if local_date and local_date != target_date:
                continue

        raw_status = (fx.get("status") or {}).get("short", "")

        out.append(
            {
                "id": f"af_{fx.get('id')}",
                "provider_id": fx.get("id"),
                "kickoff": kickoff,
                "status": _normalize_status(
                    "api-football",
                    raw_status,
                ),
                "status_raw": raw_status,
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
            }
        )

    return out


async def _football_data_fixtures(
    target_date: date,
) -> list[dict]:
    key = get_secret("FOOTBALL_DATA_API_KEY")

    if not key:
        return []

    # football-data.org trabalha com datas UTC.
    #
    # Um dia em Brasília (UTC-3) atravessa duas datas UTC:
    # por exemplo:
    #
    # 16/08 00:00 BRT = 16/08 03:00 UTC
    # 16/08 23:59 BRT = 17/08 02:59 UTC
    #
    # Por isso buscamos também o dia UTC seguinte e depois
    # filtramos corretamente pelo horário brasileiro.
    utc_end_date = target_date + timedelta(days=1)

    status, data = await fetch_json(
        (
            "https://api.football-data.org/v4/matches"
            f"?dateFrom={target_date.isoformat()}"
            f"&dateTo={utc_end_date.isoformat()}"
        ),
        headers={"X-Auth-Token": key},
    )

    if status >= 400 or not isinstance(data, dict):
        logger.warning(
            "football-data.org retornou status inválido: %s",
            status,
        )
        return []

    out = []

    for m in data.get("matches") or []:
        kickoff = m.get("utcDate")

        # ESSA É A CORREÇÃO PRINCIPAL:
        # converte UTC -> Brasília antes de decidir se é
        # Hoje, Ontem ou Amanhã.
        local_date = _local_date_from_kickoff(kickoff)

        if local_date != target_date:
            continue

        raw_status = m.get("status")

        out.append(
            {
                "id": f"fd_{m.get('id')}",
                "provider_id": m.get("id"),
                "kickoff": kickoff,
                "status": _normalize_status(
                    "football-data",
                    raw_status,
                ),
                "status_raw": raw_status,
                "elapsed": None,
                "home": (m.get("homeTeam") or {}).get("name"),
                "away": (m.get("awayTeam") or {}).get("name"),
                "home_logo": (m.get("homeTeam") or {}).get("crest"),
                "away_logo": (m.get("awayTeam") or {}).get("crest"),
                "score_home": (
                    ((m.get("score") or {}).get("fullTime") or {}).get(
                        "home"
                    )
                ),
                "score_away": (
                    ((m.get("score") or {}).get("fullTime") or {}).get(
                        "away"
                    )
                ),
                "competition": (
                    (m.get("competition") or {}).get("name")
                ),
                "competition_logo": (
                    (m.get("competition") or {}).get("emblem")
                ),
                "country": (m.get("area") or {}).get("name"),
                "source": "football-data",
            }
        )

    return out


def _dedupe(items: list[dict]) -> list[dict]:
    """
    Remove partidas duplicadas quando dois provedores retornam
    o mesmo confronto.

    API-Football tem prioridade porque será também a fonte das
    estatísticas avançadas.
    """
    seen: dict[str, dict] = {}

    ordered = sorted(
        items,
        key=lambda item: (
            0 if item.get("source") == "api-football" else 1
        ),
    )

    for item in ordered:
        home = (item.get("home") or "").strip().lower()
        away = (item.get("away") or "").strip().lower()

        local_date = _local_date_from_kickoff(
            item.get("kickoff")
        )

        key = (
            f"{home}|{away}|"
            f"{local_date.isoformat() if local_date else ''}"
        )

        if key not in seen:
            seen[key] = item

    return list(seen.values())


def _sort_matches(items: list[dict]) -> list[dict]:
    def sort_key(item: dict):
        dt = _parse_datetime(item.get("kickoff"))

        if dt is None:
            return datetime.max.replace(tzinfo=timezone.utc)

        return dt.astimezone(timezone.utc)

    return sorted(items, key=sort_key)


@router.get("/health")
async def providers_health():
    return {
        "timezone": "America/Sao_Paulo",
        "local_date": _local_today().isoformat(),
        "providers": [
            {
                "name": "API-Football",
                "configured": bool(
                    get_secret("API_FOOTBALL_KEY")
                ),
            },
            {
                "name": "football-data.org",
                "configured": bool(
                    get_secret("FOOTBALL_DATA_API_KEY")
                ),
            },
            {
                "name": "TheSportsDB",
                "configured": False,
            },
        ],
    }


@router.get("")
async def list_matches(
    when: str = Query(
        "today",
        pattern="^(today|tomorrow|yesterday|live)$",
    ),
):
    if (
        not get_secret("API_FOOTBALL_KEY")
        and not get_secret("FOOTBALL_DATA_API_KEY")
    ):
        return {
            "configured": False,
            "items": [],
            "message": "Nenhum provedor esportivo configurado.",
        }

    today = _local_today()

    if when == "today":
        target_date = today
    elif when == "tomorrow":
        target_date = today + timedelta(days=1)
    elif when == "yesterday":
        target_date = today - timedelta(days=1)
    else:
        target_date = None

    items: list[dict] = []
    errors: list[str] = []

    # API-Football
    try:
        items.extend(
            await _api_football_fixtures(
                target_date,
                live=when == "live",
            )
        )
    except Exception as exc:
        error = f"api-football: {str(exc)[:120]}"
        errors.append(error)
        logger.warning("provider api-football falhou: %s", exc)

    # football-data.org não é utilizado na aba AO VIVO
    if when != "live" and target_date:
        try:
            items.extend(
                await _football_data_fixtures(target_date)
            )
        except Exception as exc:
            error = f"football-data: {str(exc)[:120]}"
            errors.append(error)
            logger.warning(
                "provider football-data falhou: %s",
                exc,
            )

    items = _dedupe(items)
    items = _sort_matches(items)

    return {
        "configured": True,
        "timezone": "America/Sao_Paulo",
        "date": (
            target_date.isoformat()
            if target_date
            else None
        ),
        "items": items,
        "errors": errors,
    }
# deploy trigger

