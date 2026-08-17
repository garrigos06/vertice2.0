"""Central pública de performance do Vértice Sports.

Retorna somente métricas agregadas de bilhetes publicados e liquidados.
Nenhuma seleção, justificativa, link ou conteúdo premium é exposto.

Metodologia flat:
- cada bilhete = 1 unidade de stake;
- GREEN = odd total - 1;
- RED = -1 unidade;
- VOID = 0 unidade;
- ROI flat = lucro acumulado / unidades apostadas.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from deps import get_db
from repo import bets_history


router = APIRouter(
    prefix="/performance",
    tags=["performance"],
)


VALID_PERIODS = {
    "30d": 30,
    "90d": 90,
    "all": None,
}


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        parsed = datetime.fromisoformat(
            str(value).replace("Z", "+00:00")
        )

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        return parsed.astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


def _safe_odd(value: Any) -> float:
    try:
        odd = float(value)
    except (TypeError, ValueError):
        return 1.0

    return odd if odd >= 1.0 else 1.0


def _profit_units(row: dict) -> float:
    status = row.get("status")
    odd = _safe_odd(row.get("total_odd"))

    if status == "GREEN":
        return odd - 1.0

    if status == "RED":
        return -1.0

    return 0.0


def _odd_band(odd: float) -> str:
    if odd < 1.50:
        return "1.00–1.49"

    if odd < 2.00:
        return "1.50–1.99"

    if odd < 3.00:
        return "2.00–2.99"

    return "3.00+"


def _summary(rows: list[dict]) -> dict:
    total = len(rows)

    green = sum(
        row.get("status") == "GREEN"
        for row in rows
    )

    red = sum(
        row.get("status") == "RED"
        for row in rows
    )

    void = sum(
        row.get("status") == "VOID"
        for row in rows
    )

    decisions = green + red

    profit_units = sum(
        _profit_units(row)
        for row in rows
    )

    odds = [
        _safe_odd(row.get("total_odd"))
        for row in rows
        if row.get("status") in ("GREEN", "RED")
    ]

    average_odd = (
        sum(odds) / len(odds)
        if odds
        else 0.0
    )

    return {
        "total": total,
        "green": green,
        "red": red,
        "void": void,
        "decisions": decisions,
        "hit_rate": (
            round(green / decisions * 100, 1)
            if decisions
            else 0.0
        ),
        "profit_units": round(profit_units, 2),
        "roi_flat_pct": (
            round(profit_units / total * 100, 1)
            if total
            else 0.0
        ),
        "average_odd": round(average_odd, 2),
    }


def _group_rows(rows: list[dict], key_fn) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)

    for row in rows:
        key = str(
            key_fn(row) or "Não informado"
        ).strip()

        if not key:
            key = "Não informado"

        grouped[key].append(row)

    result = [
        {
            "label": label,
            **_summary(items),
        }
        for label, items in grouped.items()
    ]

    result.sort(
        key=lambda item: (
            item["total"],
            item["profit_units"],
        ),
        reverse=True,
    )

    return result


def _equity_curve(rows: list[dict]) -> list[dict]:
    ordered = sorted(
        rows,
        key=lambda row: (
            _parse_datetime(row.get("created_at"))
            or datetime.min.replace(tzinfo=timezone.utc)
        ),
    )

    cumulative = 0.0
    points = [
        {
            "index": 0,
            "profit_units": 0.0,
        }
    ]

    for index, row in enumerate(ordered, start=1):
        cumulative += _profit_units(row)

        points.append(
            {
                "index": index,
                "profit_units": round(cumulative, 2),
            }
        )

    if len(points) <= 80:
        return points

    last_index = len(points) - 1
    sampled = []

    for position in range(80):
        source_index = round(
            position * last_index / 79
        )

        point = points[source_index]

        if (
            not sampled
            or sampled[-1]["index"] != point["index"]
        ):
            sampled.append(point)

    return sampled


@router.get("")
async def get_performance(
    period: str = Query("all"),
    db=Depends(get_db),
):
    if period not in VALID_PERIODS:
        raise HTTPException(
            status_code=400,
            detail="Período inválido. Use 30d, 90d ou all.",
        )

    # bets_history já retorna apenas:
    # published = 1 e status GREEN/RED/VOID.
    rows = await bets_history(
        db,
        limit=10000,
    )

    days = VALID_PERIODS[period]

    if days is not None:
        cutoff = (
            datetime.now(timezone.utc)
            - timedelta(days=days)
        )

        filtered = []

        for row in rows:
            created_at = _parse_datetime(
                row.get("created_at")
            )

            if (
                created_at is not None
                and created_at >= cutoff
            ):
                filtered.append(row)

        rows = filtered

    by_category = _group_rows(
        rows,
        lambda row: row.get("category") or "Não informada",
    )

    by_plan = _group_rows(
        rows,
        lambda row: row.get("required_plan") or "FREE",
    )

    by_competition = _group_rows(
        rows,
        lambda row: row.get("competition") or "Não informada",
    )[:10]

    by_odd_range = _group_rows(
        rows,
        lambda row: _odd_band(
            _safe_odd(row.get("total_odd"))
        ),
    )

    odd_order = {
        "1.00–1.49": 0,
        "1.50–1.99": 1,
        "2.00–2.99": 2,
        "3.00+": 3,
    }

    by_odd_range.sort(
        key=lambda item: odd_order.get(
            item["label"],
            99,
        )
    )

    return {
        "period": period,
        "methodology": {
            "name": "flat_1u",
            "stake_per_bet": 1,
            "green_profit": "odd total - 1",
            "red_profit": -1,
            "void_profit": 0,
            "roi_definition": (
                "lucro em unidades dividido pelo total "
                "de unidades apostadas"
            ),
            "note": (
                "Métrica padronizada para transparência. "
                "Não representa a stake real de usuários."
            ),
        },
        "summary": _summary(rows),
        "equity_curve": _equity_curve(rows),
        "breakdown": {
            "category": by_category,
            "plan": by_plan,
            "competition": by_competition,
            "odd_range": by_odd_range,
        },
    }
