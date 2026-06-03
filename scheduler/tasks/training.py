"""
Model training task: runs weekly to retrain ML ensemble on latest data.
"""
import logging
import os

import httpx

from celery_app import app

logger = logging.getLogger(__name__)

ML_BASE = os.getenv("ML_ENGINE_URL", "http://ml-engine:8001")
API_BASE = os.getenv("API_URL", "http://api:8000")


@app.task
def train_models():
    logger.info("Starting weekly model training")
    with httpx.Client(base_url=API_BASE, timeout=60) as api_client:
        # Fetch historical results to build training dataset
        hist_resp = api_client.get("/matches/", params={"status": "finished"})
        if hist_resp.status_code != 200:
            logger.error("Cannot fetch finished matches for training")
            return

        matches = hist_resp.json()
        logger.info("Training on %d finished matches", len(matches))

    with httpx.Client(base_url=ML_BASE, timeout=300) as ml_client:
        try:
            resp = ml_client.post("/train", json={"matches": matches})
            logger.info("Training result: %s", resp.json())
        except Exception as exc:
            logger.error("Training request failed: %s", exc)
