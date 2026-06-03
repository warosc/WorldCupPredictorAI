from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.match import Match
from app.models.worldcup_stats import WorldcupStats

router = APIRouter(prefix="/worldcup", tags=["worldcup"])


@router.get("/stats")
async def get_worldcup_stats(edition: int | None = None, db: AsyncSession = Depends(get_db)):
    query = select(WorldcupStats).options(joinedload(WorldcupStats.team))
    if edition:
        query = query.where(WorldcupStats.edition == edition)
    result = await db.execute(query)
    stats = result.scalars().all()
    return [
        {
            "team": s.team.name if s.team else None,
            "edition": s.edition,
            "stage_reached": s.stage_reached,
            "matches_played": s.matches_played,
            "record": f"{s.wins}W-{s.draws}D-{s.losses}L",
            "goals": f"{s.goals_for}-{s.goals_against}",
        }
        for s in stats
    ]


@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    total_matches = await db.scalar(select(func.count(Match.id)))
    played = await db.scalar(select(func.count(Match.id)).where(Match.status == "finished"))
    return {"total_matches": total_matches, "matches_played": played, "matches_remaining": total_matches - played}
