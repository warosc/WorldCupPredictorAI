from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth.rbac import require_analyst
from app.database import get_db
from app.models.historical_result import HistoricalResult
from app.models.match import Match
from app.models.prediction import Prediction
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamOut

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/", response_model=list[TeamOut])
async def list_teams(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).order_by(Team.elo_rating.desc()))
    return result.scalars().all()


# /compare must be declared before /{team_id} — FastAPI matches routes in order
# and /{team_id} would otherwise capture the literal string "compare"
@router.get("/compare")
async def compare_teams(
    home_id: UUID = Query(...),
    away_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    home = await db.get(Team, home_id)
    away = await db.get(Team, away_id)
    if not home or not away:
        raise HTTPException(status_code=404, detail="One or both teams not found")

    # Head-to-head from historical_results
    h2h_result = await db.execute(
        select(HistoricalResult)
        .where(
            ((HistoricalResult.home_team_id == home_id) & (HistoricalResult.away_team_id == away_id))
            | ((HistoricalResult.home_team_id == away_id) & (HistoricalResult.away_team_id == home_id))
        )
        .order_by(HistoricalResult.match_date.desc())
        .limit(10)
    )
    h2h = h2h_result.scalars().all()

    home_wins = sum(1 for m in h2h if (str(m.home_team_id) == str(home_id) and m.home_goals > m.away_goals)
                                    or (str(m.away_team_id) == str(home_id) and m.away_goals > m.home_goals))
    away_wins = sum(1 for m in h2h if (str(m.home_team_id) == str(away_id) and m.home_goals > m.away_goals)
                                    or (str(m.away_team_id) == str(away_id) and m.away_goals > m.home_goals))
    draws = len(h2h) - home_wins - away_wins

    # Latest prediction for the direct match (if it exists)
    scheduled_result = await db.execute(
        select(Match)
        .where(
            ((Match.home_team_id == home_id) & (Match.away_team_id == away_id))
            | ((Match.home_team_id == away_id) & (Match.away_team_id == home_id))
        )
        .options(joinedload(Match.predictions))
        .order_by(Match.match_date)
        .limit(1)
    )
    direct_match = scheduled_result.unique().scalar_one_or_none()
    latest_prediction = None
    if direct_match and direct_match.predictions:
        p = sorted(direct_match.predictions, key=lambda x: x.created_at, reverse=True)[0]
        latest_prediction = {
            "home_win_prob": p.home_win_prob,
            "draw_prob": p.draw_prob,
            "away_win_prob": p.away_win_prob,
            "most_likely_score": p.most_likely_score,
            "confidence": p.confidence,
        }

    return {
        "home_team": {"id": str(home.id), "name": home.name, "elo": home.elo_rating, "fifa_ranking": home.fifa_ranking},
        "away_team": {"id": str(away.id), "name": away.name, "elo": away.elo_rating, "fifa_ranking": away.fifa_ranking},
        "head_to_head": {
            "matches": len(h2h),
            "home_wins": home_wins,
            "draws": draws,
            "away_wins": away_wins,
        },
        "prediction": latest_prediction,
    }


@router.get("/{team_id}", response_model=TeamOut)
async def get_team(team_id: UUID, db: AsyncSession = Depends(get_db)):
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team


@router.post("/", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
async def create_team(
    data: TeamCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_analyst),
):
    team = Team(**data.model_dump())
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return team
