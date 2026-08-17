"""Forma recente dos times com dados do football-data.org.

Calcula métricas dos últimos X jogos da mesma competição.
Não usa API-Football e não inventa estatísticas que o provedor não fornece.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Query

from deps import get_secret
from http_client import fetch_json


router = APIRouter(
    prefix="/team-form",
    tags=["team-form"],
)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"

BRASILIA_TZ = timezone(
    timedelta(hours=-3)
)


def _parse_datetime(
    value: str | None,
) -> datetime | None:
    if not value:
        return None

    try:
        dt = datetime.fromisoformat(
            value.replace(
                "Z",
                "+00:00",
            )
        )

        if not dt.tzinfo:
            dt = dt.replace(
                tzinfo=timezone.utc
            )

        return dt
    except (
        TypeError,
        ValueError,
    ):
        return None


def _local_today() -> date:
    return (
        datetime.now(timezone.utc)
        .astimezone(BRASILIA_TZ)
        .date()
    )


def _pct(
    part: int,
    total: int,
) -> float:
    if not total:
        return 0.0

    return round(
        (part / total) * 100,
        1,
    )


async def _football_data_get(
    path: str,
    params: dict | None = None,
) -> tuple[
    dict | None,
    str | None,
]:
    key = get_secret(
        "FOOTBALL_DATA_API_KEY"
    )

    if not key:
        return (
            None,
            (
                "FOOTBALL_DATA_API_KEY "
                "não configurada"
            ),
        )

    query = urlencode(
        {
            name: value
            for name, value
            in (params or {}).items()
            if value is not None
        }
    )

    url = (
        f"{FOOTBALL_DATA_BASE}"
        f"{path}"
    )

    if query:
        url += f"?{query}"

    status, data = await fetch_json(
        url,
        headers={
            "X-Auth-Token": key,
        },
    )

    if status >= 400:
        return (
            None,
            (
                "football-data.org "
                f"HTTP {status}"
            ),
        )

    if not isinstance(
        data,
        dict,
    ):
        return (
            None,
            (
                "Resposta inválida da "
                "football-data.org"
            ),
        )

    return data, None


async def _find_requested_match(
    provider_id: int,
) -> tuple[
    dict | None,
    dict,
]:
    """
    Localiza a partida fd_ usando o mesmo
    endpoint de listagem que já funciona
    no calendário.
    """

    today = _local_today()

    date_from = (
        today
        - timedelta(days=2)
    )

    date_to = (
        today
        + timedelta(days=2)
    )

    data, error = (
        await _football_data_get(
            "/matches",
            {
                "dateFrom": (
                    date_from.isoformat()
                ),
                "dateTo": (
                    date_to.isoformat()
                ),
            },
        )
    )

    if error:
        return (
            None,
            {
                "status": (
                    "football_data_error"
                ),
                "error": error,
            },
        )

    matches = (
        (data or {}).get("matches")
        or []
    )

    for match in matches:
        try:
            match_id = int(
                match.get("id")
            )
        except (
            TypeError,
            ValueError,
        ):
            continue

        if match_id == provider_id:
            return (
                match,
                {
                    "status": "resolved",
                    "matches_scanned": (
                        len(matches)
                    ),
                },
            )

    return (
        None,
        {
            "status": (
                "match_not_found"
            ),
            "matches_scanned": (
                len(matches)
            ),
            "searched_from": (
                date_from.isoformat()
            ),
            "searched_to": (
                date_to.isoformat()
            ),
        },
    )


def _team_result(
    match: dict,
    team_id: int,
) -> dict | None:
    home = (
        match.get("homeTeam")
        or {}
    )

    away = (
        match.get("awayTeam")
        or {}
    )

    score = (
        (
            match.get("score")
            or {}
        ).get("fullTime")
        or {}
    )

    home_id = home.get("id")
    away_id = away.get("id")

    home_goals = score.get(
        "home"
    )

    away_goals = score.get(
        "away"
    )

    if (
        home_goals is None
        or away_goals is None
        or team_id
        not in (
            home_id,
            away_id,
        )
    ):
        return None

    is_home = (
        team_id == home_id
    )

    goals_for = int(
        home_goals
        if is_home
        else away_goals
    )

    goals_against = int(
        away_goals
        if is_home
        else home_goals
    )

    if (
        goals_for
        > goals_against
    ):
        result = "W"

    elif (
        goals_for
        < goals_against
    ):
        result = "L"

    else:
        result = "D"

    competition = (
        match.get(
            "competition"
        )
        or {}
    )

    return {
        "id": match.get("id"),

        "kickoff": (
            match.get(
                "utcDate"
            )
        ),

        "competition": (
            competition.get(
                "name"
            )
        ),

        "home": home.get(
            "name"
        ),

        "away": away.get(
            "name"
        ),

        "home_logo": (
            home.get("crest")
        ),

        "away_logo": (
            away.get("crest")
        ),

        "score_home": (
            home_goals
        ),

        "score_away": (
            away_goals
        ),

        "venue": (
            "HOME"
            if is_home
            else "AWAY"
        ),

        "goals_for": (
            goals_for
        ),

        "goals_against": (
            goals_against
        ),

        "result": result,
    }


def _aggregate_team(
    team: dict,
    matches: list[dict],
    requested_sample: int,
) -> dict:
    team_id = int(
        team.get("id")
    )

    rows = []

    for match in matches:
        row = _team_result(
            match,
            team_id,
        )

        if row:
            rows.append(row)

    rows.sort(
        key=lambda item: (
            _parse_datetime(
                item.get(
                    "kickoff"
                )
            )
            or datetime.min.replace(
                tzinfo=timezone.utc
            )
        ),
        reverse=True,
    )

    rows = rows[
        :requested_sample
    ]

    played = len(rows)

    wins = sum(
        row["result"] == "W"
        for row in rows
    )

    draws = sum(
        row["result"] == "D"
        for row in rows
    )

    losses = sum(
        row["result"] == "L"
        for row in rows
    )

    goals_for = sum(
        row["goals_for"]
        for row in rows
    )

    goals_against = sum(
        row["goals_against"]
        for row in rows
    )

    clean_sheets = sum(
        row["goals_against"]
        == 0
        for row in rows
    )

    failed_to_score = sum(
        row["goals_for"]
        == 0
        for row in rows
    )

    btts = sum(
        (
            row["goals_for"]
            > 0
        )
        and (
            row["goals_against"]
            > 0
        )
        for row in rows
    )

    over_1_5 = sum(
        (
            row["goals_for"]
            + row["goals_against"]
        )
        >= 2
        for row in rows
    )

    over_2_5 = sum(
        (
            row["goals_for"]
            + row["goals_against"]
        )
        >= 3
        for row in rows
    )

    over_3_5 = sum(
        (
            row["goals_for"]
            + row["goals_against"]
        )
        >= 4
        for row in rows
    )

    points = (
        wins * 3
        + draws
    )

    return {
        "id": team_id,

        "name": team.get(
            "name"
        ),

        "short_name": (
            team.get(
                "shortName"
            )
        ),

        "logo": team.get(
            "crest"
        ),

        "sample_requested": (
            requested_sample
        ),

        "sample_actual": (
            played
        ),

        "form": "".join(
            row["result"]
            for row in rows
        ),

        "summary": {
            "played": played,

            "wins": wins,

            "draws": draws,

            "losses": losses,

            "win_rate": _pct(
                wins,
                played,
            ),

            "draw_rate": _pct(
                draws,
                played,
            ),

            "loss_rate": _pct(
                losses,
                played,
            ),

            "points": points,

            "points_per_game": (
                round(
                    points
                    / played,
                    2,
                )
                if played
                else 0.0
            ),

            "goals_for": (
                goals_for
            ),

            "goals_against": (
                goals_against
            ),

            "avg_goals_for": (
                round(
                    goals_for
                    / played,
                    2,
                )
                if played
                else 0.0
            ),

            "avg_goals_against": (
                round(
                    goals_against
                    / played,
                    2,
                )
                if played
                else 0.0
            ),

            "avg_total_goals": (
                round(
                    (
                        goals_for
                        + goals_against
                    )
                    / played,
                    2,
                )
                if played
                else 0.0
            ),

            "clean_sheets": (
                clean_sheets
            ),

            "clean_sheet_rate": (
                _pct(
                    clean_sheets,
                    played,
                )
            ),

            "failed_to_score": (
                failed_to_score
            ),

            "failed_to_score_rate": (
                _pct(
                    failed_to_score,
                    played,
                )
            ),

            "btts": btts,

            "btts_rate": (
                _pct(
                    btts,
                    played,
                )
            ),

            "over_1_5": (
                over_1_5
            ),

            "over_1_5_rate": (
                _pct(
                    over_1_5,
                    played,
                )
            ),

            "over_2_5": (
                over_2_5
            ),

            "over_2_5_rate": (
                _pct(
                    over_2_5,
                    played,
                )
            ),

            "over_3_5": (
                over_3_5
            ),

            "over_3_5_rate": (
                _pct(
                    over_3_5,
                    played,
                )
            ),
        },

        "matches": rows,
    }


@router.get(
    "/{match_id}"
)
async def get_team_form(
    match_id: str,

    last: int = Query(
        5,
        ge=3,
        le=15,
    ),
):
    if not match_id.startswith(
        "fd_"
    ):
        return {
            "available": False,

            "source": (
                "football-data"
            ),

            "message": (
                "A forma recente está "
                "disponível para partidas "
                "identificadas pelo "
                "football-data.org."
            ),
        }

    try:
        provider_id = int(
            match_id[3:]
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,

            detail=(
                "ID da partida inválido"
            ),
        ) from exc

    (
        current_match,
        resolution,
    ) = (
        await _find_requested_match(
            provider_id
        )
    )

    if not current_match:
        return {
            "available": False,

            "source": (
                "football-data"
            ),

            "resolution": (
                resolution
            ),

            "message": (
                "Não foi possível localizar "
                "a partida para calcular "
                "a forma recente."
            ),
        }

    home = (
        current_match.get(
            "homeTeam"
        )
        or {}
    )

    away = (
        current_match.get(
            "awayTeam"
        )
        or {}
    )

    competition = (
        current_match.get(
            "competition"
        )
        or {}
    )

    season = (
        current_match.get(
            "season"
        )
        or {}
    )

    competition_id = (
        competition.get(
            "id"
        )
    )

    target_kickoff = (
        _parse_datetime(
            current_match.get(
                "utcDate"
            )
        )
    )

    if not competition_id:
        return {
            "available": False,

            "source": (
                "football-data"
            ),

            "resolution": {
                "status": (
                    "competition_missing"
                ),
            },

            "message": (
                "A competição da partida "
                "não foi identificada."
            ),
        }

    season_year = None

    season_start = (
        season.get(
            "startDate"
        )
    )

    if season_start:
        try:
            season_year = int(
                str(
                    season_start
                )[:4]
            )

        except (
            TypeError,
            ValueError,
        ):
            pass

    (
        history_data,
        history_error,
    ) = (
        await _football_data_get(
            (
                "/competitions/"
                f"{competition_id}"
                "/matches"
            ),
            {
                "season": (
                    season_year
                ),

                "status": (
                    "FINISHED"
                ),
            },
        )
    )

    if history_error:
        return {
            "available": False,

            "source": (
                "football-data"
            ),

            "resolution": {
                "status": (
                    "competition_matches_error"
                ),

                "error": (
                    history_error
                ),
            },

            "message": (
                "Não foi possível carregar "
                "o histórico da competição."
            ),
        }

    historical_matches = (
        (history_data or {}).get(
            "matches"
        )
        or []
    )

    eligible_matches = []

    for match in historical_matches:
        try:
            historical_id = int(
                match.get("id")
            )

        except (
            TypeError,
            ValueError,
        ):
            historical_id = None

        if (
            historical_id
            == provider_id
        ):
            continue

        kickoff = (
            _parse_datetime(
                match.get(
                    "utcDate"
                )
            )
        )

        if (
            target_kickoff
            and kickoff
            and kickoff
            >= target_kickoff
        ):
            continue

        eligible_matches.append(
            match
        )

    return {
        "available": True,

        "source": (
            "football-data"
        ),

        "scope": (
            "competition"
        ),

        "sample": last,

        "match": {
            "id": match_id,

            "kickoff": (
                current_match.get(
                    "utcDate"
                )
            ),

            "competition": (
                competition.get(
                    "name"
                )
            ),

            "competition_id": (
                competition_id
            ),

            "season": (
                season_year
            ),

            "home": {
                "id": home.get(
                    "id"
                ),

                "name": home.get(
                    "name"
                ),

                "logo": home.get(
                    "crest"
                ),
            },

            "away": {
                "id": away.get(
                    "id"
                ),

                "name": away.get(
                    "name"
                ),

                "logo": away.get(
                    "crest"
                ),
            },
        },

        "home": (
            _aggregate_team(
                home,
                eligible_matches,
                last,
            )
        ),

        "away": (
            _aggregate_team(
                away,
                eligible_matches,
                last,
            )
        ),

        "resolution": {
            **resolution,

            "competition_matches_scanned": (
                len(
                    historical_matches
                )
            ),
        },
    }