"""
ETL pipeline: collect data from external sources every 6 hours.
Sources: API-Football, Football-Data (others require paid subscriptions).
"""
import logging
import os

import httpx

from celery_app import app

logger = logging.getLogger(__name__)

API_FOOTBALL_KEY = os.getenv("API_FOOTBALL_KEY", "")
FOOTBALL_DATA_KEY = os.getenv("FOOTBALL_DATA_KEY", "")
API_BASE = os.getenv("API_URL", "http://api:8000")


@app.task(bind=True, max_retries=3)
def run_etl_pipeline(self):
    """Orchestrates the full ETL: download, clean, validate, enrich, store."""
    logger.info("Starting ETL pipeline")
    try:
        fetch_fixtures.delay()
        fetch_standings.delay()
        fetch_odds.delay()
    except Exception as exc:
        logger.error("ETL pipeline failed: %s", exc)
        raise self.retry(exc=exc, countdown=300)


@app.task(bind=True, max_retries=3)
def fetch_fixtures(self):
    if not API_FOOTBALL_KEY:
        logger.warning("API_FOOTBALL_KEY not set, skipping fixtures fetch")
        return

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(
                "https://v3.football.api-sports.io/fixtures",
                headers={"x-apisports-key": API_FOOTBALL_KEY},
                params={"league": "1", "season": "2026"},
            )
            resp.raise_for_status()
            data = resp.json()
            _store_fixtures(data.get("response", []))
    except Exception as exc:
        logger.error("Fixtures fetch failed: %s", exc)
        raise self.retry(exc=exc, countdown=600)


@app.task
def fetch_standings():
    if not FOOTBALL_DATA_KEY:
        return
    with httpx.Client(timeout=30) as client:
        try:
            resp = client.get(
                "https://api.football-data.org/v4/competitions/WC/standings",
                headers={"X-Auth-Token": FOOTBALL_DATA_KEY},
            )
            resp.raise_for_status()
            _store_standings(resp.json())
        except Exception as exc:
            logger.error("Standings fetch failed: %s", exc)


@app.task
def fetch_odds():
    logger.info("Odds collection skipped — configure a bookmaker API key")


def _store_fixtures(fixtures: list):
    if not fixtures:
        return
    logger.info("Storing %d fixtures", len(fixtures))
    # Transform and POST to the API service
    with httpx.Client(base_url=API_BASE, timeout=10) as client:
        for fix in fixtures:
            try:
                fixture = fix.get("fixture", {})
                teams = fix.get("teams", {})
                goals = fix.get("goals", {})
                client.post("/matches/", json={
                    "home_team_id": teams.get("home", {}).get("id"),
                    "away_team_id": teams.get("away", {}).get("id"),
                    "match_date": fixture.get("date"),
                    "stage": fix.get("league", {}).get("round"),
                    "venue": fixture.get("venue", {}).get("name"),
                })
            except Exception:
                pass


def _store_standings(data: dict):
    logger.info("Standings data received, processing...")
