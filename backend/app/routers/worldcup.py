import os
from uuid import uuid4
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.match import Match
from app.models.ranking import Ranking
from app.models.team import Team
from app.models.worldcup_stats import WorldcupStats

router = APIRouter(prefix="/worldcup", tags=["worldcup"])

FOOTBALL_DATA_KEY = os.getenv("FOOTBALL_DATA_KEY", "")
FD_BASE = "https://api.football-data.org/v4"
FD_HEADERS = {"X-Auth-Token": FOOTBALL_DATA_KEY}

# Confederation lookup by area name
CONFEDERATION_MAP = {
    "South America": "CONMEBOL",
    "Europe": "UEFA",
    "North/Central America and Caribbean": "CONCACAF",
    "Africa": "CAF",
    "Asia": "AFC",
    "Oceania": "OFC",
}

# Status mapping football-data.org → our schema
STATUS_MAP = {
    "SCHEDULED": "scheduled",
    "TIMED": "scheduled",
    "IN_PLAY": "live",
    "PAUSED": "live",
    "FINISHED": "finished",
    "SUSPENDED": "scheduled",
    "POSTPONED": "scheduled",
    "CANCELLED": "scheduled",
    "AWARDED": "finished",
}


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
    return {
        "total_matches": total_matches,
        "matches_played": played,
        "matches_remaining": (total_matches or 0) - (played or 0),
    }


@router.post("/sync", summary="Sincroniza equipos y partidos reales desde football-data.org")
async def sync_worldcup(db: AsyncSession = Depends(get_db)):
    """
    Importa los 48 equipos y 104 partidos del Mundial 2026 desde football-data.org.
    Hace upsert por nombre de equipo y crea partidos nuevos sin duplicar.
    """
    if not FOOTBALL_DATA_KEY:
        return {"error": "FOOTBALL_DATA_KEY no configurada en .env"}

    async with httpx.AsyncClient(base_url=FD_BASE, headers=FD_HEADERS, timeout=30) as client:

        # ── 1. Equipos ────────────────────────────────────────────────
        teams_resp = await client.get("/competitions/WC/teams")
        teams_resp.raise_for_status()
        fd_teams = teams_resp.json().get("teams", [])

        team_id_map: dict[int, str] = {}  # fd_id → our UUID
        teams_created = teams_updated = 0

        for ft in fd_teams:
            name = ft.get("name", "")
            tla = ft.get("tla", "")[:10]
            area = ft.get("area", {}).get("name", "")
            confederation = CONFEDERATION_MAP.get(area, "OTHER")

            # Upsert by name
            existing = await db.execute(select(Team).where(Team.name == name))
            team = existing.scalar_one_or_none()

            crest = ft.get("crest") or ft.get("crestUrl") or None

            if team:
                team.code = tla
                team.confederation = confederation
                if crest:
                    team.crest_url = crest
                teams_updated += 1
            else:
                team = Team(
                    id=uuid4(),
                    name=name,
                    code=tla,
                    confederation=confederation,
                    elo_rating=1500.0,
                    crest_url=crest,
                )
                db.add(team)
                teams_created += 1

            await db.flush()
            team_id_map[ft["id"]] = str(team.id)

            # Upsert ranking row
            rank_result = await db.execute(select(Ranking).where(Ranking.team_id == team.id))
            rank = rank_result.scalar_one_or_none()
            if not rank:
                db.add(Ranking(
                    id=uuid4(),
                    team_id=team.id,
                    elo_rating=team.elo_rating,
                    tournament_points=0,
                ))

        # ── 2. Partidos ───────────────────────────────────────────────
        matches_resp = await client.get("/competitions/WC/matches")
        matches_resp.raise_for_status()
        fd_matches = matches_resp.json().get("matches", [])

        matches_created = matches_updated = 0

        for fm in fd_matches:
            home_fd_id = fm.get("homeTeam", {}).get("id")
            away_fd_id = fm.get("awayTeam", {}).get("id")
            if not home_fd_id or not away_fd_id:
                continue

            home_uuid = team_id_map.get(home_fd_id)
            away_uuid = team_id_map.get(away_fd_id)
            if not home_uuid or not away_uuid:
                continue

            match_date = datetime.fromisoformat(
                fm["utcDate"].replace("Z", "+00:00")
            ).replace(tzinfo=None)
            stage = fm.get("stage", "")
            matchday = fm.get("matchday")
            score = fm.get("score", {})
            home_goals = score.get("fullTime", {}).get("home")
            away_goals = score.get("fullTime", {}).get("away")
            status = STATUS_MAP.get(fm.get("status", "SCHEDULED"), "scheduled")

            # Check if match already exists (same home+away+date)
            existing = await db.execute(
                select(Match).where(
                    Match.home_team_id == home_uuid,
                    Match.away_team_id == away_uuid,
                    Match.match_date == match_date,
                )
            )
            match = existing.scalar_one_or_none()

            if match:
                match.status = status
                match.home_goals = home_goals
                match.away_goals = away_goals
                matches_updated += 1
            else:
                match = Match(
                    id=uuid4(),
                    home_team_id=home_uuid,
                    away_team_id=away_uuid,
                    match_date=match_date,
                    stage=stage,
                    venue=fm.get("venue"),
                    home_goals=home_goals,
                    away_goals=away_goals,
                    status=status,
                )
                db.add(match)
                matches_created += 1

    await db.commit()

    return {
        "teams": {"created": teams_created, "updated": teams_updated, "total": len(fd_teams)},
        "matches": {"created": matches_created, "updated": matches_updated, "total": len(fd_matches)},
        "message": "Sincronización completada. Ejecuta POST /predictions/generate para generar predicciones.",
    }
