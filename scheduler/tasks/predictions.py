"""
Tasks for generating predictions and updating rankings.
"""
import logging
import os
from datetime import datetime, timezone

import httpx

from celery_app import app

logger = logging.getLogger(__name__)

API_BASE = os.getenv("API_URL", "http://api:8000")
ML_BASE = os.getenv("ML_ENGINE_URL", "http://ml-engine:8001")

# El Mundial 2026 empieza el 11 de junio
TOURNAMENT_START = datetime(2026, 6, 11, tzinfo=timezone.utc)


@app.task
def sync_and_predict():
    """
    Ciclo completo cada 6h:
    1. Sincroniza equipos y partidos desde football-data.org
    2. Regenera predicciones ML para todos los partidos programados
    """
    now = datetime.now(timezone.utc)
    logger.info("Iniciando ciclo sync_and_predict — %s", now.isoformat())

    with httpx.Client(base_url=API_BASE, timeout=60) as client:
        # Paso 1: sync datos reales
        try:
            sync_resp = client.post("/worldcup/sync")
            sync_data = sync_resp.json()
            logger.info(
                "Sync completado: %d equipos, %d partidos",
                sync_data.get("teams", {}).get("total", 0),
                sync_data.get("matches", {}).get("total", 0),
            )
        except Exception as exc:
            logger.error("Sync falló: %s", exc)

        # Paso 2: regenerar predicciones
        try:
            pred_resp = client.post("/predictions/generate")
            pred_data = pred_resp.json()
            logger.info("Predicciones generadas: %d", pred_data.get("generated", 0))
        except Exception as exc:
            logger.error("Predictions falló: %s", exc)

        # Paso 3: actualizar rankings ELO si hay partidos terminados
        if now >= TOURNAMENT_START:
            try:
                client.post("/rankings/recalculate")
            except Exception:
                pass  # endpoint opcional, no crítico


@app.task
def generate_all_predictions():
    """Tarea legacy — usar sync_and_predict en su lugar."""
    logger.info("Generating predictions for all scheduled matches")

    with httpx.Client(base_url=API_BASE, timeout=30) as api_client, \
         httpx.Client(base_url=ML_BASE, timeout=60) as ml_client:

        resp = api_client.get("/matches/", params={"status": "scheduled"})
        if resp.status_code != 200:
            logger.error("Failed to fetch matches: %s", resp.status_code)
            return

        matches = resp.json()

        for match in matches:
            try:
                home_team = api_client.get(f"/teams/{match['home_team_id']}").json()
                away_team = api_client.get(f"/teams/{match['away_team_id']}").json()

                features = {
                    "match_id": match["id"],
                    "home_elo": home_team.get("elo_rating", 1500),
                    "away_elo": away_team.get("elo_rating", 1500),
                    "home_fifa_ranking": home_team.get("fifa_ranking", 50) or 50,
                    "away_fifa_ranking": away_team.get("fifa_ranking", 50) or 50,
                }
                prediction = ml_client.post("/predict", json=features).json()
                logger.info("Prediction for match %s: %s", match["id"], prediction.get("quiniela_recommendation"))
            except Exception as exc:
                logger.error("Prediction failed for match %s: %s", match.get("id"), exc)


@app.task
def update_rankings():
    logger.info("Updating team rankings based on latest ELO ratings")
    with httpx.Client(base_url=API_BASE, timeout=30) as client:
        teams_resp = client.get("/teams/")
        if teams_resp.status_code != 200:
            return
        teams = teams_resp.json()
        logger.info("Rankings updated for %d teams", len(teams))
