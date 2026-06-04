from uuid import UUID, uuid4
from datetime import datetime
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.cache import cache_get, cache_set
from app.config import settings
from app.database import get_db
from app.models.match import Match
from app.models.prediction import Prediction
from app.models.team import Team
from app.schemas.prediction import PredictionOut

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("/", response_model=list[PredictionOut])
async def list_predictions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prediction).order_by(Prediction.created_at.desc()).limit(100))
    return result.scalars().all()


@router.get("/rich", summary="Predicciones enriquecidas con datos de equipos y partido")
async def rich_predictions(
    status: str | None = Query(None, description="scheduled | finished | live"),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Match)
        .options(
            joinedload(Match.home_team),
            joinedload(Match.away_team),
            joinedload(Match.predictions),
        )
        .order_by(Match.match_date)
    )
    if status:
        query = query.where(Match.status == status)

    result = await db.execute(query)
    matches = result.unique().scalars().all()

    def _team(t: Team | None) -> dict:
        if not t:
            return {"id": None, "name": "TBD", "code": "?", "confederation": None,
                    "fifa_ranking": None, "elo_rating": 1500.0, "crest_url": None}
        return {
            "id": str(t.id), "name": t.name, "code": t.code,
            "confederation": t.confederation, "fifa_ranking": t.fifa_ranking,
            "elo_rating": t.elo_rating,
            "crest_url": getattr(t, "crest_url", None),
        }

    output = []
    for m in matches:
        latest_pred = None
        if m.predictions:
            p = sorted(m.predictions, key=lambda x: x.created_at, reverse=True)[0]
            latest_pred = {
                "id": str(p.id), "match_id": str(p.match_id),
                "home_win_prob": p.home_win_prob, "draw_prob": p.draw_prob,
                "away_win_prob": p.away_win_prob,
                "predicted_home_goals": p.predicted_home_goals,
                "predicted_away_goals": p.predicted_away_goals,
                "most_likely_score": p.most_likely_score,
                "score_probability": p.score_probability,
                "confidence": p.confidence,
                "quiniela_recommendation": p.quiniela_recommendation,
            }
        output.append({
            "match_id": str(m.id),
            "match_date": m.match_date.isoformat() if m.match_date else None,
            "stage": m.stage,
            "status": m.status,
            "home_goals": m.home_goals,
            "away_goals": m.away_goals,
            "home_team": _team(m.home_team),
            "away_team": _team(m.away_team),
            "prediction": latest_pred,
        })
    return output


@router.get("/match/{match_id}", response_model=PredictionOut)
async def get_prediction_for_match(match_id: UUID, db: AsyncSession = Depends(get_db)):
    cache_key = f"prediction:{match_id}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    result = await db.execute(
        select(Prediction)
        .where(Prediction.match_id == match_id)
        .order_by(Prediction.created_at.desc())
        .limit(1)
    )
    prediction = result.scalar_one_or_none()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    await cache_set(cache_key, prediction.__dict__, ttl=600)
    return prediction


import math as _math

# WC historical averages (goals per game, 1990-2022)
_WC_HOME_AVG = 1.32
_WC_AWAY_AVG = 0.97
_ELO_REF = 1700.0   # reference ELO ≈ average WC team
_ELO_SCALE = 500.0  # sensitivity factor


def _elo_xg(home_elo: float, away_elo: float, home_advantage: float = 0.12) -> tuple[float, float]:
    """
    Estimate expected goals for each team using ELO-based attack/defense strength.
    attack_i  = exp((elo_i  - ELO_REF) / ELO_SCALE)
    defense_j = exp((ELO_REF - elo_j) / ELO_SCALE)   ← opponent's weakness
    home_xg = AVG_HOME * attack_home * defense_away * (1 + home_adv)
    away_xg = AVG_AWAY * attack_away * defense_home
    """
    attack_h  = _math.exp((home_elo - _ELO_REF) / _ELO_SCALE)
    defense_h = _math.exp((_ELO_REF - home_elo) / _ELO_SCALE)
    attack_a  = _math.exp((away_elo - _ELO_REF) / _ELO_SCALE)
    defense_a = _math.exp((_ELO_REF - away_elo) / _ELO_SCALE)

    home_xg = _WC_HOME_AVG * attack_h * defense_a * (1 + home_advantage)
    away_xg = _WC_AWAY_AVG * attack_a * defense_h
    return round(max(home_xg, 0.3), 3), round(max(away_xg, 0.2), 3)


@router.post("/generate", summary="Genera predicciones reales para todos los partidos programados")
async def generate_predictions(db: AsyncSession = Depends(get_db)):
    """
    Llama al ML Engine con xG dinámico calculado desde ELO de cada equipo.
    Argentina vs Morocco ≠ Argentina vs Algeria.
    """
    result = await db.execute(
        select(Match)
        .where(Match.status == "scheduled")
        .options(joinedload(Match.home_team), joinedload(Match.away_team))
        .order_by(Match.match_date)
    )
    matches = result.unique().scalars().all()

    if not matches:
        return {"generated": 0, "message": "No hay partidos programados"}

    generated = []
    errors = []

    async with httpx.AsyncClient(base_url=settings.ml_engine_url, timeout=30) as ml:
        for match in matches:
            home: Team = match.home_team
            away: Team = match.away_team
            if not home or not away:
                continue

            home_elo = home.elo_rating or 1500.0
            away_elo = away.elo_rating or 1500.0
            home_xg, away_xg = _elo_xg(home_elo, away_elo)

            features = {
                "match_id": str(match.id),
                "home_elo": home_elo,
                "away_elo": away_elo,
                "home_fifa_ranking": home.fifa_ranking or 50,
                "away_fifa_ranking": away.fifa_ranking or 50,
                "home_form": 0.5,
                "away_form": 0.5,
                "home_injuries": 0,
                "away_injuries": 0,
                "home_suspended": 0,
                "away_suspended": 0,
                # xG dinámico — nombres que lee el ML Engine predictor
                "home_xg": home_xg,
                "away_xg": away_xg,
                "home_xg_avg": home_xg,
                "away_xg_avg": away_xg,
                "home_goals_avg": home_xg,
                "away_goals_avg": away_xg,
                "home_goals_conceded_avg": away_xg,
                "away_goals_conceded_avg": home_xg,
                "home_possession_avg": 50 + (home_elo - away_elo) / 100,
                "away_possession_avg": 50 - (home_elo - away_elo) / 100,
                "home_shots_avg": 10 + home_xg * 3,
                "away_shots_avg": 10 + away_xg * 3,
                "h2h_home_wins": 0,
                "h2h_draws": 0,
                "h2h_away_wins": 0,
            }

            try:
                resp = await ml.post("/predict", json=features)
                resp.raise_for_status()
                pred_data = resp.json()

                # Delete old prediction for this match to avoid duplicates
                await db.execute(delete(Prediction).where(Prediction.match_id == match.id))

                pred = Prediction(
                    id=uuid4(),
                    match_id=match.id,
                    home_win_prob=pred_data["home_win_prob"],
                    draw_prob=pred_data["draw_prob"],
                    away_win_prob=pred_data["away_win_prob"],
                    predicted_home_goals=pred_data.get("predicted_home_goals"),
                    predicted_away_goals=pred_data.get("predicted_away_goals"),
                    most_likely_score=pred_data.get("most_likely_score"),
                    score_probability=pred_data.get("score_probability"),
                    confidence=pred_data.get("confidence"),
                    model_version="ensemble-v1",
                    quiniela_recommendation=pred_data.get("quiniela_recommendation"),
                )
                db.add(pred)
                generated.append({
                    "match": f"{home.name} vs {away.name}",
                    "date": match.match_date.strftime("%Y-%m-%d"),
                    "home_win": f"{pred_data['home_win_prob']*100:.1f}%",
                    "draw": f"{pred_data['draw_prob']*100:.1f}%",
                    "away_win": f"{pred_data['away_win_prob']*100:.1f}%",
                    "score": pred_data.get("most_likely_score"),
                    "confidence": pred_data.get("confidence"),
                    "quiniela": pred_data.get("quiniela_recommendation"),
                })
            except Exception as exc:
                errors.append({"match_id": str(match.id), "error": str(exc)})

    await db.commit()
    return {
        "generated": len(generated),
        "predictions": generated,
        "errors": errors,
    }
