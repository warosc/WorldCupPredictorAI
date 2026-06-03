from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.cache import cache_get, cache_set
from app.database import get_db
from app.models.ranking import Ranking

router = APIRouter(prefix="/rankings", tags=["rankings"])


@router.get("/")
async def get_rankings(db: AsyncSession = Depends(get_db)):
    cache_key = "rankings:all"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    result = await db.execute(
        select(Ranking)
        .options(joinedload(Ranking.team))
        .order_by(Ranking.elo_rating.desc())
    )
    rankings = result.scalars().all()

    data = [
        {
            "position": i + 1,
            "team_id": str(r.team_id),
            "team_name": r.team.name if r.team else None,
            "elo_rating": r.elo_rating,
            "fifa_ranking": r.fifa_ranking,
            "form_score": r.form_score,
            "tournament_points": r.tournament_points,
            "goals_for": r.goals_for,
            "goals_against": r.goals_against,
            "matches_played": r.matches_played,
        }
        for i, r in enumerate(rankings)
    ]
    await cache_set(cache_key, data, ttl=300)
    return data
