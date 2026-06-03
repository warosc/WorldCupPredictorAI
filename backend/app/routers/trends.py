"""
Trends: ascending / descending teams based on recent match results.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.match import Match
from app.models.team import Team

router = APIRouter(prefix="/trends", tags=["trends"])


def _team_trend(results: list[str]) -> dict:
    """
    results: list of 'W'/'D'/'L' (chronological, most recent last).
    Returns trend: ascending | descending | stable.
    """
    if not results:
        return {"trend": "stable", "form": "---", "trend_value": 0.0}

    weights = [0.5, 0.7, 1.0, 1.3, 1.6]  # More weight to recent matches
    score_map = {"W": 3, "D": 1, "L": 0}
    recent = results[-5:]

    weighted_pts = sum(
        score_map.get(r, 0) * weights[i] for i, r in enumerate(recent[-len(weights):])
    )
    total_weight = sum(weights[: len(recent)])
    avg = weighted_pts / total_weight if total_weight else 0

    # Compare first half vs second half form
    half = max(len(recent) // 2, 1)
    first_avg = sum(score_map.get(r, 0) for r in recent[:half]) / half
    second_avg = sum(score_map.get(r, 0) for r in recent[half:]) / max(len(recent) - half, 1)
    trend_value = second_avg - first_avg

    if trend_value > 0.5:
        trend = "ascending"
    elif trend_value < -0.5:
        trend = "descending"
    else:
        trend = "stable"

    return {
        "trend": trend,
        "trend_value": round(trend_value, 3),
        "form": "".join(recent[-5:]),
        "weighted_form": round(avg, 2),
    }


@router.get("/")
async def get_trends(db: AsyncSession = Depends(get_db)):
    teams_result = await db.execute(select(Team))
    teams = teams_result.scalars().all()

    matches_result = await db.execute(
        select(Match)
        .where(Match.status == "finished")
        .options(joinedload(Match.home_team), joinedload(Match.away_team))
        .order_by(Match.match_date)
    )
    finished = matches_result.unique().scalars().all()

    team_results: dict[str, list[str]] = {t.id: [] for t in teams}
    team_goals: dict[str, list[int]] = {t.id: [] for t in teams}

    for match in finished:
        if match.home_goals is None:
            continue
        hg, ag = match.home_goals, match.away_goals
        home_id, away_id = str(match.home_team_id), str(match.away_team_id)

        if hg > ag:
            team_results.setdefault(home_id, []).append("W")
            team_results.setdefault(away_id, []).append("L")
        elif hg == ag:
            team_results.setdefault(home_id, []).append("D")
            team_results.setdefault(away_id, []).append("D")
        else:
            team_results.setdefault(home_id, []).append("L")
            team_results.setdefault(away_id, []).append("W")

        team_goals.setdefault(home_id, []).append(hg)
        team_goals.setdefault(away_id, []).append(ag)

    team_map = {str(t.id): t for t in teams}
    output = []
    for team in teams:
        tid = str(team.id)
        trend_data = _team_trend(team_results.get(tid, []))
        output.append({
            "team_id": tid,
            "team_name": team.name,
            "elo_rating": team.elo_rating,
            **trend_data,
        })

    output.sort(key=lambda x: x["trend_value"], reverse=True)
    return {
        "ascending": [t for t in output if t["trend"] == "ascending"],
        "stable": [t for t in output if t["trend"] == "stable"],
        "descending": [t for t in output if t["trend"] == "descending"],
    }
