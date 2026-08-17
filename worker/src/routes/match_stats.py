"""Detalhes e estatísticas de partidas via API-Football.

A rota é carregada sob demanda quando o usuário abre uma partida.
Assim o calendário continua leve e a cota da API não é consumida
para todos os jogos da lista.
"""
from __future__ import annotations

from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException

from deps import get_secret
from http_client import fetch_json

router = APIRouter(prefix="/match-stats", tags=["match-stats"])

API_BASE = "https://v3.football.api-sports.io"

STARTED_STATUSES = {
    "1H",
    "HT",
    "2H",
    "ET",
    "BT",
    "P",
    "SUSP",
    "INT",
    "FT",
    "AET",
    "PEN",
    "AWD",
    "WO",
}

STAT_LABELS = {
    "Ball Possession": "Posse de bola",
    "expected_goals": "xG",
    "Total Shots": "Finalizações",
    "Shots on Goal": "Chutes no gol",
    "Shots off Goal": "Chutes para fora",
    "Blocked Shots": "Chutes bloqueados",
    "Shots insidebox": "Chutes dentro da área",
    "Shots outsidebox": "Chutes fora da área",
    "Corner Kicks": "Escanteios",
    "Offsides": "Impedimentos",
    "Fouls": "Faltas",
    "Yellow Cards": "Cartões amarelos",
    "Red Cards": "Cartões vermelhos",
    "Goalkeeper Saves": "Defesas do goleiro",
    "Total passes": "Passes",
    "Passes accurate": "Passes certos",
    "Passes %": "Precisão dos passes",
}

STAT_ORDER = [
    "Ball Possession",
    "expected_goals",
    "Total Shots",
    "Shots on Goal",
    "Shots off Goal",
    "Blocked Shots",
    "Shots insidebox",
    "Shots outsidebox",
    "Corner Kicks",
    "Offsides",
    "Fouls",
    "Yellow Cards",
    "Red Cards",
    "Goalkeeper Saves",
    "Total passes",
    "Passes accurate",
    "Passes %",
]


def _as_number(value):
    if value is None:
        return None

    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip().replace("%", "")

    try:
        return float(text)
    except (TypeError, ValueError):
        return None


async def _api_get(
    endpoint: str,
    params: dict,
) -> tuple[dict | None, str | None]:
    key = get_secret("API_FOOTBALL_KEY")

    if not key:
        return None, "API_FOOTBALL_KEY não configurada"

    query = urlencode(
        {
            name: value
            for name, value in params.items()
            if value is not None
        }
    )

    status, data = await fetch_json(
        f"{API_BASE}/{endpoint}?{query}",
        headers={"x-apisports-key": key},
    )

    if status >= 400:
        return None, f"API-Football HTTP {status}"

    if not isinstance(data, dict):
        return None, "Resposta inválida da API-Football"

    errors = data.get("errors")

    if errors:
        if isinstance(errors, dict):
            message = "; ".join(
                f"{name}: {value}"
                for name, value in errors.items()
            )
        else:
            message = str(errors)

        return None, message[:240]

    return data, None


def _normalize_match(item: dict) -> dict:
    fixture = item.get("fixture") or {}
    teams = item.get("teams") or {}
    league = item.get("league") or {}
    goals = item.get("goals") or {}
    status = fixture.get("status") or {}

    home = teams.get("home") or {}
    away = teams.get("away") or {}

    return {
        "id": f"af_{fixture.get('id')}",
        "provider_id": fixture.get("id"),
        "kickoff": fixture.get("date"),
        "status": status.get("short"),
        "status_long": status.get("long"),
        "elapsed": status.get("elapsed"),
        "home": {
            "id": home.get("id"),
            "name": home.get("name"),
            "logo": home.get("logo"),
            "winner": home.get("winner"),
            "score": goals.get("home"),
        },
        "away": {
            "id": away.get("id"),
            "name": away.get("name"),
            "logo": away.get("logo"),
            "winner": away.get("winner"),
            "score": goals.get("away"),
        },
        "competition": {
            "id": league.get("id"),
            "name": league.get("name"),
            "country": league.get("country"),
            "logo": league.get("logo"),
            "season": league.get("season"),
            "round": league.get("round"),
        },
        "venue": fixture.get("venue") or {},
    }


def _normalize_prediction(data: dict | None) -> dict | None:
    if not data:
        return None

    response = data.get("response") or []

    if not response:
        return None

    item = response[0] or {}
    predictions = item.get("predictions") or {}
    percent = predictions.get("percent") or {}
    teams = item.get("teams") or {}
    comparison = item.get("comparison") or {}

    def team_data(side: str):
        team = teams.get(side) or {}
        last_5 = team.get("last_5") or {}
        goals = last_5.get("goals") or {}

        return {
            "id": team.get("id"),
            "name": team.get("name"),
            "logo": team.get("logo"),
            "last_5": {
                "form": _as_number(last_5.get("form")),
                "attack": _as_number(last_5.get("att")),
                "defense": _as_number(last_5.get("def")),
                "goals_for": (
                    (goals.get("for") or {}).get("total")
                ),
                "goals_against": (
                    (goals.get("against") or {}).get("total")
                ),
            },
        }

    comparison_out = {}

    for name, label in (
        ("form", "Forma"),
        ("att", "Ataque"),
        ("def", "Defesa"),
        ("poisson_distribution", "Poisson"),
        ("h2h", "Confronto direto"),
        ("goals", "Gols"),
        ("total", "Total"),
    ):
        value = comparison.get(name)

        if not isinstance(value, dict):
            continue

        comparison_out[name] = {
            "label": label,
            "home": _as_number(value.get("home")),
            "away": _as_number(value.get("away")),
        }

    winner = predictions.get("winner") or {}

    return {
        "advice": predictions.get("advice"),
        "winner": winner.get("name"),
        "winner_comment": winner.get("comment"),
        "win_or_draw": predictions.get("win_or_draw"),
        "under_over": predictions.get("under_over"),
        "goals": predictions.get("goals"),
        "percent": {
            "home": _as_number(percent.get("home")),
            "draw": _as_number(percent.get("draw")),
            "away": _as_number(percent.get("away")),
        },
        "comparison": comparison_out,
        "home": team_data("home"),
        "away": team_data("away"),
    }


def _normalize_statistics(
    data: dict | None,
    home_id: int | None,
    away_id: int | None,
) -> dict:
    if not data:
        return {"available": False, "rows": []}

    response = data.get("response") or []

    if not response:
        return {"available": False, "rows": []}

    by_team = {}

    for block in response:
        team = block.get("team") or {}
        team_id = team.get("id")

        stats = {
            stat.get("type"): stat.get("value")
            for stat in (block.get("statistics") or [])
            if stat.get("type")
        }

        if team_id is not None:
            by_team[int(team_id)] = stats

    home_stats = (
        by_team.get(int(home_id))
        if home_id is not None
        else {}
    ) or {}

    away_stats = (
        by_team.get(int(away_id))
        if away_id is not None
        else {}
    ) or {}

    if not home_stats and response:
        home_stats = {
            stat.get("type"): stat.get("value")
            for stat in (response[0].get("statistics") or [])
            if stat.get("type")
        }

    if not away_stats and len(response) > 1:
        away_stats = {
            stat.get("type"): stat.get("value")
            for stat in (response[1].get("statistics") or [])
            if stat.get("type")
        }

    available_types = set(home_stats) | set(away_stats)

    ordered = [
        item
        for item in STAT_ORDER
        if item in available_types
    ]

    ordered.extend(
        sorted(available_types - set(ordered))
    )

    rows = [
        {
            "type": stat_type,
            "label": STAT_LABELS.get(
                stat_type,
                stat_type,
            ),
            "home": home_stats.get(stat_type),
            "away": away_stats.get(stat_type),
        }
        for stat_type in ordered
    ]

    return {
        "available": bool(rows),
        "rows": rows,
    }


@router.get("/{match_id}")
async def get_match_stats(match_id: str):
    if not match_id.startswith("af_"):
        return {
            "available": False,
            "source": (
                "football-data"
                if match_id.startswith("fd_")
                else "unknown"
            ),
            "message": (
                "Esta partida veio do provedor secundário. "
                "As estatísticas avançadas exigem cobertura "
                "da API-Football."
            ),
        }

    try:
        fixture_id = int(match_id[3:])
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="ID da partida inválido",
        ) from exc

    fixture_data, fixture_error = await _api_get(
        "fixtures",
        {"id": fixture_id},
    )

    if fixture_error:
        raise HTTPException(
            status_code=502,
            detail=(
                "Falha ao carregar partida: "
                f"{fixture_error}"
            ),
        )

    fixtures = (
        fixture_data.get("response")
        if fixture_data
        else []
    ) or []

    if not fixtures:
        raise HTTPException(
            status_code=404,
            detail="Partida não encontrada",
        )

    match = _normalize_match(fixtures[0])

    prediction_data, prediction_error = (
        await _api_get(
            "predictions",
            {"fixture": fixture_id},
        )
    )

    prediction = _normalize_prediction(
        prediction_data
    )

    statistics = {
        "available": False,
        "rows": [],
    }

    statistics_error = None

    if match["status"] in STARTED_STATUSES:
        statistics_data, statistics_error = (
            await _api_get(
                "fixtures/statistics",
                {"fixture": fixture_id},
            )
        )

        statistics = _normalize_statistics(
            statistics_data,
            match["home"].get("id"),
            match["away"].get("id"),
        )

    return {
        "available": True,
        "source": "api-football",
        "match": match,
        "prediction": prediction,
        "statistics": statistics,
        "statistics_pending": (
            match["status"] not in STARTED_STATUSES
        ),
        "errors": {
            "prediction": prediction_error,
            "statistics": statistics_error,
        },
    }
