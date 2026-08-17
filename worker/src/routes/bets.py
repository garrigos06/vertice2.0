"""Bet slip routes — public list/history + admin CRUD."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from deps import (
    get_current_user_optional,
    get_db,
    require_admin,
)
from models import (
    BetSlipCreate,
    BetSlipUpdate,
    BetStatus,
    Plan,
    new_id,
    now_iso,
)
from repo import (
    audit_log,
    bets_delete,
    bets_get,
    bets_history,
    bets_insert,
    bets_list,
    bets_set_public_preview,
    bets_update,
)


router = APIRouter(
    prefix="/bets",
    tags=["bets"],
)


_PLAN_LEVEL = {
    "FREE": 0,
    "PRO": 1,
    "FULL": 2,
}


# =========================================================
# HELPERS DE ACESSO / SEGURANÇA
# =========================================================

def _description_preview(
    text: Optional[str],
    limit: int = 220,
) -> str:
    """
    Gera uma pequena prévia pública.

    Nunca retorna a análise completa.
    """

    if not text:
        return ""

    clean = " ".join(
        str(text).split()
    ).strip()

    if len(clean) <= limit:
        return clean

    return (
        clean[: limit - 1].rstrip()
        + "…"
    )


def _public_matches(doc: dict) -> list[dict]:
    """
    Expõe somente informações básicas das partidas.

    Não retorna:
    - mercado;
    - seleção;
    - odd.
    """

    result = []

    for selection in doc.get(
        "selections",
        [],
    ):
        if not isinstance(
            selection,
            dict,
        ):
            continue

        match = (
            selection.get("match")
            or ""
        ).strip()

        if not match:
            continue

        result.append(
            {
                "match": match,
                "competition": (
                    selection.get(
                        "competition"
                    )
                    or doc.get(
                        "competition"
                    )
                    or ""
                ),
                "kickoff": (
                    selection.get(
                        "kickoff"
                    )
                    or doc.get(
                        "scheduled_at"
                    )
                ),
            }
        )

    return result


def _full_response(
    doc: dict,
) -> dict:
    """
    Resposta completa para quem possui acesso.

    Também inclui campos de preview para manter
    um contrato consistente com o frontend.
    """

    out = dict(doc)

    out["locked"] = False
    out["isLocked"] = False
    out["lock_reason"] = None

    out["description_preview"] = (
        _description_preview(
            out.get("description")
        )
    )

    out["public_matches"] = (
        _public_matches(out)
    )

    return out


def _locked_response(
    doc: dict,
    *,
    lock_reason: str,
) -> dict:
    """
    Cria a resposta segura para conteúdo bloqueado.

    IMPORTANTE:
    Utilizamos uma whitelist.

    Dados protegidos nunca são enviados para
    o navegador e depois escondidos com CSS.
    """

    return {
        # Identificação
        "id": doc.get("id"),
        "title": doc.get("title"),

        # Informações públicas da partida
        "category": doc.get("category"),
        "sport": doc.get("sport"),
        "competition": (
            doc.get("competition")
            or ""
        ),
        "scheduled_at": (
            doc.get("scheduled_at")
        ),

        # Preview limitado
        "description_preview": (
            _description_preview(
                doc.get("description")
            )
        ),
        "public_matches": (
            _public_matches(doc)
        ),

        # Plano / apresentação
        "required_plan": (
            doc.get("required_plan")
            or "FREE"
        ),
        "featured": bool(
            doc.get("featured")
        ),
        "image_url": (
            doc.get("image_url")
        ),
        "status": (
            doc.get("status")
        ),
        "published": bool(
            doc.get("published")
        ),
        "is_public_preview": bool(
            doc.get(
                "is_public_preview"
            )
        ),

        # Metadados públicos
        "created_at": (
            doc.get("created_at")
        ),
        "updated_at": (
            doc.get("updated_at")
        ),

        # Controle de acesso
        "locked": True,
        "isLocked": True,
        "lock_reason": lock_reason,
    }


def _serialize_bet(
    doc: dict,
    user: Optional[dict],
) -> dict:
    """
    Define exatamente o que cada visitante/usuário
    pode receber da API.

    REGRAS:

    Visitante:
    - FREE público selecionado -> completo
    - qualquer outro FREE -> bloqueado por cadastro
    - PRO/FULL -> bloqueados

    FREE:
    - FREE -> completo
    - PRO/FULL -> bloqueados

    PRO:
    - FREE/PRO -> completos
    - FULL -> bloqueado

    FULL:
    - tudo completo
    """

    required_plan = (
        doc.get("required_plan")
        or "FREE"
    )

    is_public_preview = (
        required_plan == "FREE"
        and bool(
            doc.get(
                "is_public_preview"
            )
        )
    )

    # -----------------------------------------------------
    # VISITANTE NÃO AUTENTICADO
    # -----------------------------------------------------

    if user is None:
        if is_public_preview:
            return _full_response(doc)

        if required_plan == "FREE":
            return _locked_response(
                doc,
                lock_reason=(
                    "SIGNUP_REQUIRED"
                ),
            )

        return _locked_response(
            doc,
            lock_reason="PLAN_REQUIRED",
        )

    # -----------------------------------------------------
    # USUÁRIO AUTENTICADO
    # -----------------------------------------------------

    user_plan = (
        user.get("plan")
        or "FREE"
    )

    user_level = _PLAN_LEVEL.get(
        user_plan,
        0,
    )

    required_level = (
        _PLAN_LEVEL.get(
            required_plan,
            0,
        )
    )

    if user_level >= required_level:
        return _full_response(doc)

    return _locked_response(
        doc,
        lock_reason="PLAN_REQUIRED",
    )


# =========================================================
# ROTAS PÚBLICAS
# =========================================================

@router.get("")
async def list_bets(
    status: Optional[BetStatus] = None,
    plan: Optional[Plan] = None,
    featured: Optional[bool] = None,
    published: bool = True,
    limit: int = Query(
        50,
        le=200,
    ),
    db=Depends(get_db),
    user=Depends(
        get_current_user_optional
    ),
):
    items = await bets_list(
        db,
        published=published,
        status=(
            status.value
            if status
            else None
        ),
        required_plan=(
            plan.value
            if plan
            else None
        ),
        featured=featured,
        limit=limit,
    )

    return {
        "items": [
            _serialize_bet(
                bet,
                user,
            )
            for bet in items
        ]
    }


@router.get("/history")
async def bets_history_route(
    limit: int = Query(
        200,
        le=500,
    ),
    db=Depends(get_db),
    user=Depends(
        get_current_user_optional
    ),
):
    items = await bets_history(
        db,
        limit=limit,
    )

    stats = {
        "total": len(items),
        "green": sum(
            1
            for item in items
            if item["status"] == "GREEN"
        ),
        "red": sum(
            1
            for item in items
            if item["status"] == "RED"
        ),
        "void": sum(
            1
            for item in items
            if item["status"] == "VOID"
        ),
    }

    settled = (
        stats["green"]
        + stats["red"]
    )

    stats["hit_rate"] = (
        round(
            stats["green"]
            / settled
            * 100,
            1,
        )
        if settled
        else 0.0
    )

    return {
        "items": [
            _serialize_bet(
                bet,
                user,
            )
            for bet in items
        ],
        "stats": stats,
    }


# =========================================================
# ADMIN — LISTAGEM COMPLETA
# =========================================================

@router.get("/admin/all")
async def admin_list_all(
    admin=Depends(require_admin),
    limit: int = Query(
        200,
        le=500,
    ),
    db=Depends(get_db),
):
    items = await bets_list(
        db,
        published=None,
        limit=limit,
    )

    return {
        "items": items,
    }


# =========================================================
# DETALHE DO BILHETE
# =========================================================

@router.get("/{bet_id}")
async def get_bet(
    bet_id: str,
    db=Depends(get_db),
    user=Depends(
        get_current_user_optional
    ),
):
    doc = await bets_get(
        db,
        bet_id,
    )

    if not doc:
        raise HTTPException(
            status_code=404,
            detail=(
                "Bilhete não encontrado"
            ),
        )

    # Bilhete não publicado não deve
    # ficar acessível publicamente.
    if (
        not doc.get("published")
        and (
            not user
            or user.get("role")
            not in (
                "ADMIN",
                "SUPER_ADMIN",
            )
        )
    ):
        raise HTTPException(
            status_code=404,
            detail=(
                "Bilhete não encontrado"
            ),
        )

    return _serialize_bet(
        doc,
        user,
    )


# =========================================================
# ADMIN — CRIAÇÃO
# =========================================================

@router.post(
    "/admin",
    status_code=201,
)
async def admin_create_bet(
    payload: BetSlipCreate,
    admin=Depends(require_admin),
    db=Depends(get_db),
):
    data = payload.model_dump()

    required_plan = (
        data["required_plan"].value
        if hasattr(
            data["required_plan"],
            "value",
        )
        else data["required_plan"]
    )

    wants_public_preview = bool(
        data.get(
            "is_public_preview"
        )
    )

    # PRO/FULL nunca podem virar
    # amostra pública.
    if (
        wants_public_preview
        and required_plan != "FREE"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Apenas bilhetes FREE "
                "podem ser amostra pública"
            ),
        )

    now = now_iso()

    bet = {
        "id": new_id(),
        "status": "PENDENTE",
        "created_at": now,
        "updated_at": now,
        **data,

        "category": (
            data["category"].value
            if hasattr(
                data["category"],
                "value",
            )
            else data["category"]
        ),

        "risk": (
            data["risk"].value
            if hasattr(
                data["risk"],
                "value",
            )
            else data["risk"]
        ),

        "required_plan": required_plan,

        "selections": [
            selection
            if isinstance(
                selection,
                dict,
            )
            else selection.model_dump()
            for selection
            in data.get(
                "selections",
                [],
            )
        ],

        # Criamos inicialmente como falso.
        #
        # Se o admin marcou como preview,
        # ativamos depois usando a função que
        # desativa a amostra anterior.
        "is_public_preview": False,
    }

    await bets_insert(
        db,
        bet,
    )

    if wants_public_preview:
        updated = (
            await bets_set_public_preview(
                db,
                bet["id"],
                True,
            )
        )

        if updated:
            bet = updated

    await audit_log(
        db,
        log_id=new_id(),
        admin_id=admin["id"],
        admin_email=admin["email"],
        action="bet.create",
        entity="bet",
        entity_id=bet["id"],
        metadata={
            "title": bet["title"],
            "is_public_preview": (
                bool(
                    bet.get(
                        "is_public_preview"
                    )
                )
            ),
        },
        created_at=now,
    )

    return bet


# =========================================================
# ADMIN — EDIÇÃO
# =========================================================

@router.patch(
    "/admin/{bet_id}"
)
async def admin_update_bet(
    bet_id: str,
    payload: BetSlipUpdate,
    admin=Depends(require_admin),
    db=Depends(get_db),
):
    existing = await bets_get(
        db,
        bet_id,
    )

    if not existing:
        raise HTTPException(
            status_code=404,
            detail=(
                "Bilhete não encontrado"
            ),
        )

    updates_raw = {
        key: value
        for key, value
        in payload.model_dump(
            exclude_unset=True
        ).items()
        if value is not None
    }

    if not updates_raw:
        raise HTTPException(
            status_code=400,
            detail=(
                "Nada a atualizar"
            ),
        )

    updates = {}

    for key, value in (
        updates_raw.items()
    ):
        if hasattr(
            value,
            "value",
        ):
            updates[key] = (
                value.value
            )

        elif key == "selections":
            updates[key] = [
                selection
                if isinstance(
                    selection,
                    dict,
                )
                else selection.model_dump()
                for selection in value
            ]

        else:
            updates[key] = value

    requested_preview = (
        updates.get(
            "is_public_preview"
        )
        if "is_public_preview"
        in updates
        else None
    )

    target_plan = (
        updates.get(
            "required_plan",
            existing.get(
                "required_plan",
                "FREE",
            ),
        )
    )

    # Tentativa explícita de publicar
    # PRO/FULL como preview.
    if (
        requested_preview is True
        and target_plan != "FREE"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Apenas bilhetes FREE "
                "podem ser amostra pública"
            ),
        )

    # Se um bilhete que era FREE/public preview
    # for convertido para PRO ou FULL,
    # a amostra pública é removida automaticamente.
    if target_plan != "FREE":
        updates[
            "is_public_preview"
        ] = False
        requested_preview = False

    # Quando vamos ATIVAR o preview,
    # retiramos esse campo do update comum.
    #
    # Depois chamamos bets_set_public_preview(),
    # que desativa qualquer outra amostra.
    activate_preview = (
        requested_preview is True
        and target_plan == "FREE"
    )

    if activate_preview:
        updates.pop(
            "is_public_preview",
            None,
        )

    updates["updated_at"] = (
        now_iso()
    )

    updated = await bets_update(
        db,
        bet_id,
        updates,
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail=(
                "Bilhete não encontrado"
            ),
        )

    if activate_preview:
        updated = (
            await bets_set_public_preview(
                db,
                bet_id,
                True,
            )
        )

    await audit_log(
        db,
        log_id=new_id(),
        admin_id=admin["id"],
        admin_email=admin["email"],
        action="bet.update",
        entity="bet",
        entity_id=bet_id,
        metadata={
            **updates,
            "is_public_preview": (
                bool(
                    updated.get(
                        "is_public_preview"
                    )
                )
                if updated
                else False
            ),
        },
        created_at=now_iso(),
    )

    return updated


# =========================================================
# ADMIN — EXCLUSÃO
# =========================================================

@router.delete(
    "/admin/{bet_id}"
)
async def admin_delete_bet(
    bet_id: str,
    admin=Depends(require_admin),
    db=Depends(get_db),
):
    ok = await bets_delete(
        db,
        bet_id,
    )

    if not ok:
        raise HTTPException(
            status_code=404,
            detail=(
                "Bilhete não encontrado"
            ),
        )

    await audit_log(
        db,
        log_id=new_id(),
        admin_id=admin["id"],
        admin_email=admin["email"],
        action="bet.delete",
        entity="bet",
        entity_id=bet_id,
        metadata={},
        created_at=now_iso(),
    )

    return {
        "ok": True,
    }
