import os
from uuid import uuid4
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.historical_result import HistoricalResult
from app.models.match import Match
from app.models.ranking import Ranking
from app.models.team import Team
from app.models.worldcup_stats import WorldcupStats

router = APIRouter(prefix="/worldcup", tags=["worldcup"])

FOOTBALL_DATA_KEY = os.getenv("FOOTBALL_DATA_KEY", "")
FD_BASE = "https://api.football-data.org/v4"
FD_HEADERS = {"X-Auth-Token": FOOTBALL_DATA_KEY}

CONFEDERATION_MAP = {
    "South America": "CONMEBOL",
    "Europe": "UEFA",
    "North/Central America and Caribbean": "CONCACAF",
    "Africa": "CAF",
    "Asia": "AFC",
    "Oceania": "OFC",
}

STATUS_MAP = {
    "SCHEDULED": "scheduled", "TIMED": "scheduled", "IN_PLAY": "live",
    "PAUSED": "live", "FINISHED": "finished", "SUSPENDED": "scheduled",
    "POSTPONED": "scheduled", "CANCELLED": "scheduled", "AWARDED": "finished",
}


@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    total = await db.scalar(select(func.count(Match.id))) or 0
    played = await db.scalar(select(func.count(Match.id)).where(Match.status == "finished")) or 0
    live = await db.scalar(select(func.count(Match.id)).where(Match.status == "live")) or 0
    return {"total_matches": total, "matches_played": played,
            "matches_remaining": total - played, "matches_live": live}


@router.get("/standings", summary="Tabla de posiciones de todos los grupos")
async def get_standings(db: AsyncSession = Depends(get_db)):
    """
    Calcula las tablas de grupos en tiempo real desde los partidos terminados.
    Solo aplica a GROUP_STAGE. Devuelve grupos ordenados con equipos por puntos.
    """
    result = await db.execute(
        select(Match)
        .where(Match.stage == "GROUP_STAGE")
        .options(joinedload(Match.home_team), joinedload(Match.away_team))
        .order_by(Match.match_date)
    )
    matches = result.unique().scalars().all()

    # Build team stats per group
    # We need to infer group from the match stage/group label
    # football-data.org has group info in the match — use team pairs to identify groups
    # Simple approach: group teams by their set of opponents

    team_stats: dict[str, dict] = {}

    for m in matches:
        if not m.home_team or not m.away_team:
            continue

        for team, is_home in [(m.home_team, True), (m.away_team, False)]:
            tid = str(team.id)
            if tid not in team_stats:
                team_stats[tid] = {
                    "team_id": tid,
                    "team_name": team.name,
                    "team_code": team.code,
                    "crest_url": getattr(team, "crest_url", None),
                    "elo_rating": team.elo_rating,
                    "played": 0, "won": 0, "drawn": 0, "lost": 0,
                    "goals_for": 0, "goals_against": 0,
                    "points": 0, "opponents": set(),
                }
            team_stats[tid]["opponents"].add(
                str(m.away_team.id) if is_home else str(m.home_team.id)
            )

        if m.status == "finished" and m.home_goals is not None:
            hid = str(m.home_team.id)
            aid = str(m.away_team.id)
            hg, ag = m.home_goals, m.away_goals

            team_stats[hid]["played"] += 1
            team_stats[hid]["goals_for"] += hg
            team_stats[hid]["goals_against"] += ag

            team_stats[aid]["played"] += 1
            team_stats[aid]["goals_for"] += ag
            team_stats[aid]["goals_against"] += hg

            if hg > ag:
                team_stats[hid]["won"] += 1
                team_stats[hid]["points"] += 3
                team_stats[aid]["lost"] += 1
            elif hg == ag:
                team_stats[hid]["drawn"] += 1
                team_stats[hid]["points"] += 1
                team_stats[aid]["drawn"] += 1
                team_stats[aid]["points"] += 1
            else:
                team_stats[aid]["won"] += 1
                team_stats[aid]["points"] += 3
                team_stats[hid]["lost"] += 1

    # Group teams by their opponent sets (teams in same group share opponents)
    # Assign group letters by clustering
    groups: dict[str, list] = {}
    assigned: dict[str, str] = {}
    group_letter = ord("A")

    for tid, stats in team_stats.items():
        key = frozenset(stats["opponents"] | {tid})
        label = None
        for existing_key, existing_label in list(groups.items()):
            if frozenset(existing_key.split(",")) & key:
                # merge check: if all 4 members overlap
                if len(frozenset(existing_key.split(",")) & key) >= 2:
                    label = existing_label[0]["_group"] if existing_label else None
                    break
        if label is None:
            label = chr(group_letter)
            group_letter += 1

        stats["_group"] = label
        stats["gd"] = stats["goals_for"] - stats["goals_against"]
        stats.pop("opponents", None)
        groups.setdefault(label, []).append(stats)

    # Sort each group: points → GD → GF
    for label in groups:
        groups[label].sort(key=lambda x: (-x["points"], -x["gd"], -x["goals_for"]))
        for i, t in enumerate(groups[label]):
            t["position"] = i + 1
            t.pop("_group", None)

    return {"groups": groups, "total_teams": len(team_stats)}


@router.get("/stats")
async def get_worldcup_stats(edition: int | None = None, db: AsyncSession = Depends(get_db)):
    query = select(WorldcupStats).options(joinedload(WorldcupStats.team))
    if edition:
        query = query.where(WorldcupStats.edition == edition)
    result = await db.execute(query)
    return [
        {
            "team": s.team.name if s.team else None, "edition": s.edition,
            "stage_reached": s.stage_reached, "matches_played": s.matches_played,
            "record": f"{s.wins}W-{s.draws}D-{s.losses}L",
            "goals": f"{s.goals_for}-{s.goals_against}",
        }
        for s in (result.scalars().all())
    ]


@router.post("/sync", summary="Sincroniza equipos y partidos reales desde football-data.org")
async def sync_worldcup(db: AsyncSession = Depends(get_db)):
    if not FOOTBALL_DATA_KEY:
        return {"error": "FOOTBALL_DATA_KEY no configurada en .env"}

    async with httpx.AsyncClient(base_url=FD_BASE, headers=FD_HEADERS, timeout=30) as client:
        teams_resp = await client.get("/competitions/WC/teams")
        teams_resp.raise_for_status()
        fd_teams = teams_resp.json().get("teams", [])

        team_id_map: dict[int, str] = {}
        teams_created = teams_updated = 0

        for ft in fd_teams:
            name = ft.get("name", "")
            tla = ft.get("tla", "")[:10]
            area = ft.get("area", {}).get("name", "")
            confederation = CONFEDERATION_MAP.get(area, "OTHER")
            crest = ft.get("crest") or ft.get("crestUrl") or None

            existing = await db.execute(select(Team).where(Team.name == name))
            team = existing.scalar_one_or_none()

            if team:
                team.code = tla
                team.confederation = confederation
                if crest:
                    team.crest_url = crest
                teams_updated += 1
            else:
                team = Team(id=uuid4(), name=name, code=tla,
                            confederation=confederation, elo_rating=1500.0, crest_url=crest)
                db.add(team)
                teams_created += 1

            await db.flush()
            team_id_map[ft["id"]] = str(team.id)

            rank_result = await db.execute(select(Ranking).where(Ranking.team_id == team.id))
            if not rank_result.scalar_one_or_none():
                db.add(Ranking(id=uuid4(), team_id=team.id,
                               elo_rating=team.elo_rating, tournament_points=0))

        matches_resp = await client.get("/competitions/WC/matches")
        matches_resp.raise_for_status()
        fd_matches = matches_resp.json().get("matches", [])

        matches_created = matches_updated = hist_added = 0

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
                fm["utcDate"].replace("Z", "+00:00")).replace(tzinfo=None)
            stage = fm.get("stage", "")
            score = fm.get("score", {})
            home_goals = score.get("fullTime", {}).get("home")
            away_goals = score.get("fullTime", {}).get("away")
            status = STATUS_MAP.get(fm.get("status", "SCHEDULED"), "scheduled")
            group_label = fm.get("group")  # e.g. "GROUP_A"

            existing = await db.execute(
                select(Match).where(
                    Match.home_team_id == home_uuid,
                    Match.away_team_id == away_uuid,
                    Match.match_date == match_date,
                )
            )
            match = existing.scalar_one_or_none()

            # Store group info in stage field when available
            stage_val = group_label if group_label else stage

            if match:
                match.status = status
                match.home_goals = home_goals
                match.away_goals = away_goals
                if group_label:
                    match.stage = stage_val
                matches_updated += 1
            else:
                match = Match(
                    id=uuid4(), home_team_id=home_uuid, away_team_id=away_uuid,
                    match_date=match_date, stage=stage_val,
                    venue=fm.get("venue"), home_goals=home_goals,
                    away_goals=away_goals, status=status,
                )
                db.add(match)
                matches_created += 1

            # Copy finished matches to historical_results
            if status == "finished" and home_goals is not None and away_goals is not None:
                existing_hist = await db.execute(
                    select(HistoricalResult).where(
                        HistoricalResult.home_team_id == home_uuid,
                        HistoricalResult.away_team_id == away_uuid,
                        HistoricalResult.match_date == match_date.date(),
                    )
                )
                if not existing_hist.scalar_one_or_none():
                    db.add(HistoricalResult(
                        id=uuid4(), home_team_id=home_uuid, away_team_id=away_uuid,
                        match_date=match_date.date(), competition="FIFA World Cup 2026",
                        home_goals=home_goals, away_goals=away_goals, neutral_venue=True,
                    ))
                    hist_added += 1

    await db.commit()
    hist_total = await db.scalar(select(func.count(HistoricalResult.id)))

    return {
        "teams": {"created": teams_created, "updated": teams_updated, "total": len(fd_teams)},
        "matches": {"created": matches_created, "updated": matches_updated, "total": len(fd_matches)},
        "historical_results": hist_total,
        "message": "Sincronización completada.",
    }
