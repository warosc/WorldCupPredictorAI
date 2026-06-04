import math

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.cache import cache_delete, cache_get, cache_set
from app.database import get_db
from app.models.match import Match
from app.models.ranking import Ranking
from app.models.team import Team

router = APIRouter(prefix="/rankings", tags=["rankings"])

# ELO K-factor for World Cup (higher = faster rating change)
_K = 40


def _elo_expected(rating_a: float, rating_b: float) -> float:
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))


def _update_elo(home_r: float, away_r: float, home_goals: int, away_goals: int) -> tuple[float, float]:
    if home_goals > away_goals:
        s_h, s_a = 1.0, 0.0
    elif home_goals == away_goals:
        s_h, s_a = 0.5, 0.5
    else:
        s_h, s_a = 0.0, 1.0
    e_h = _elo_expected(home_r, away_r)
    new_h = home_r + _K * (s_h - e_h)
    new_a = away_r + _K * (s_a - (1 - e_h))
    return round(new_h, 2), round(new_a, 2)


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
            "crest_url": r.team.crest_url if r.team else None,
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


@router.post("/recalculate", summary="Recalcula ELO basado en partidos terminados")
async def recalculate_rankings(db: AsyncSession = Depends(get_db)):
    """
    Tras cada jornada:
    1. Recorre todos los partidos terminados
    2. Recalcula ELO acumulando el historial
    3. Actualiza rankings y equipos
    4. Invalida caché
    """
    # Reset all ELO to initial values before replaying (avoids double-counting)
    teams_result = await db.execute(select(Team))
    all_teams = {str(t.id): t for t in teams_result.scalars().all()}

    # Starting ELO map (preserved from seed / initial values)
    elo_map: dict[str, float] = {tid: t.elo_rating for tid, t in all_teams.items()}

    # Replay all finished matches in chronological order
    finished = await db.execute(
        select(Match)
        .where(Match.status == "finished")
        .where(Match.home_goals.isnot(None))
        .order_by(Match.match_date)
    )
    finished_matches = finished.scalars().all()

    points: dict[str, int] = {tid: 0 for tid in all_teams}
    goals_for: dict[str, int] = {tid: 0 for tid in all_teams}
    goals_against: dict[str, int] = {tid: 0 for tid in all_teams}
    played: dict[str, int] = {tid: 0 for tid in all_teams}

    for m in finished_matches:
        hid = str(m.home_team_id)
        aid = str(m.away_team_id)
        if hid not in elo_map or aid not in elo_map:
            continue

        hg, ag = m.home_goals, m.away_goals
        new_h, new_a = _update_elo(elo_map[hid], elo_map[aid], hg, ag)
        elo_map[hid] = new_h
        elo_map[aid] = new_a

        goals_for[hid] = goals_for.get(hid, 0) + hg
        goals_for[aid] = goals_for.get(aid, 0) + ag
        goals_against[hid] = goals_against.get(hid, 0) + ag
        goals_against[aid] = goals_against.get(aid, 0) + hg
        played[hid] = played.get(hid, 0) + 1
        played[aid] = played.get(aid, 0) + 1

        if hg > ag:
            points[hid] = points.get(hid, 0) + 3
        elif hg == ag:
            points[hid] = points.get(hid, 0) + 1
            points[aid] = points.get(aid, 0) + 1
        else:
            points[aid] = points.get(aid, 0) + 3

    # Persist updated ELO
    updated_teams = updated_rankings = 0
    for tid, new_elo in elo_map.items():
        team = all_teams.get(tid)
        if team:
            team.elo_rating = new_elo
            updated_teams += 1

        rank_result = await db.execute(select(Ranking).where(Ranking.team_id == tid))
        rank = rank_result.scalar_one_or_none()
        if rank:
            rank.elo_rating = new_elo
            rank.tournament_points = points.get(tid, 0)
            rank.goals_for = goals_for.get(tid, 0)
            rank.goals_against = goals_against.get(tid, 0)
            rank.matches_played = played.get(tid, 0)
            updated_rankings += 1

    await db.commit()
    await cache_delete("rankings:all")

    return {
        "matches_processed": len(finished_matches),
        "teams_updated": updated_teams,
        "rankings_updated": updated_rankings,
        "message": "ELO recalculado. Ejecuta /predictions/generate para actualizar predicciones.",
    }
