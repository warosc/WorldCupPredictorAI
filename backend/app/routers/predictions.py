from uuid import UUID, uuid4
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
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
    result = await db.execute(select(Prediction).order_by(Prediction.created_at.desc()).limit(50))
    return result.scalars().all()


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


@router.post("/generate", summary="Genera predicciones reales para todos los partidos programados")
async def generate_predictions(db: AsyncSession = Depends(get_db)):
    """
    Llama al ML Engine con los datos reales de ELO/FIFA de cada equipo
    y almacena las predicciones en la base de datos.
    """
    # Fetch all scheduled matches with their teams
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

            features = {
                "match_id": str(match.id),
                "home_elo": home.elo_rating or 1500.0,
                "away_elo": away.elo_rating or 1500.0,
                "home_fifa_ranking": home.fifa_ranking or 50,
                "away_fifa_ranking": away.fifa_ranking or 50,
                "home_form": 0.5,
                "away_form": 0.5,
                "home_injuries": 0,
                "away_injuries": 0,
                "home_suspended": 0,
                "away_suspended": 0,
                "home_goals_avg": 1.4,
                "away_goals_avg": 1.1,
                "home_goals_conceded_avg": 1.0,
                "away_goals_conceded_avg": 1.2,
                "home_possession_avg": 52.0,
                "away_possession_avg": 48.0,
                "home_shots_avg": 13.0,
                "away_shots_avg": 11.0,
                "home_xg_avg": 1.4,
                "away_xg_avg": 1.1,
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
