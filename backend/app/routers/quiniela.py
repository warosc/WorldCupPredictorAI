from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.match import Match
from app.models.prediction import Prediction
from app.schemas.quiniela import MatchPick, QuinielaRecommendation

router = APIRouter(prefix="/quiniela", tags=["quiniela"])

STRATEGIES = {
    "conservative": "Elige el resultado con mayor probabilidad en cada partido",
    "balanced": "Mezcla resultados probables con algunos riesgos calculados",
    "aggressive": "Busca sorpresas y upset para maximizar el puntaje potencial",
}


def _pick_conservative(home: float, draw: float, away: float) -> str:
    probs = {"1": home, "X": draw, "2": away}
    return max(probs, key=probs.get)


def _pick_balanced(home: float, draw: float, away: float) -> str:
    # Favour the top-2 result with some weight on second-best
    probs = {"1": home, "X": draw, "2": away}
    sorted_picks = sorted(probs, key=probs.get, reverse=True)
    # If top probability < 50%, consider second option
    if probs[sorted_picks[0]] < 0.50 and probs[sorted_picks[1]] > 0.28:
        return sorted_picks[1]
    return sorted_picks[0]


def _pick_aggressive(home: float, draw: float, away: float) -> str:
    # Prefer upset: away win if reasonably likely, otherwise draw
    if away > 0.25:
        return "2"
    if draw > 0.30:
        return "X"
    return "1"


PICKERS = {
    "conservative": _pick_conservative,
    "balanced": _pick_balanced,
    "aggressive": _pick_aggressive,
}


@router.get("/recommendations/{strategy}", response_model=QuinielaRecommendation)
async def get_recommendations(strategy: str, db: AsyncSession = Depends(get_db)):
    if strategy not in STRATEGIES:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Strategy must be one of {list(STRATEGIES)}")

    result = await db.execute(
        select(Match)
        .where(Match.status == "scheduled")
        .options(joinedload(Match.home_team), joinedload(Match.away_team), joinedload(Match.predictions))
        .order_by(Match.match_date)
    )
    matches = result.unique().scalars().all()

    picker = PICKERS[strategy]
    picks = []
    for match in matches:
        pred = sorted(match.predictions, key=lambda p: p.created_at, reverse=True)
        pred = pred[0] if pred else None
        if not pred:
            continue

        rec = picker(pred.home_win_prob, pred.draw_prob, pred.away_win_prob)
        picks.append(MatchPick(
            match_id=match.id,
            home_team=match.home_team.name if match.home_team else "?",
            away_team=match.away_team.name if match.away_team else "?",
            recommendation=rec,
            home_win_prob=pred.home_win_prob,
            draw_prob=pred.draw_prob,
            away_win_prob=pred.away_win_prob,
            confidence=pred.confidence or "medium",
        ))

    # Rough accuracy estimate based on average top-probability
    avg_top_prob = sum(
        max(p.home_win_prob, p.draw_prob, p.away_win_prob) for p in picks
    ) / max(len(picks), 1) if picks else 0.0

    return QuinielaRecommendation(
        strategy=strategy,
        picks=picks,
        expected_accuracy=round(avg_top_prob, 3),
        description=STRATEGIES[strategy],
    )
