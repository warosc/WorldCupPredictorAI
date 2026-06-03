from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any

from models.predictor import Predictor
from models.ml_ensemble import MLEnsemble
from models.prophet_model import ProphetTrendModel
import pandas as pd

app = FastAPI(title="Quiniesys ML Engine", version="1.0.0")
predictor = Predictor()
ensemble = MLEnsemble()
prophet = ProphetTrendModel()


class TeamStats(BaseModel):
    name: str
    match_dates: list[str] = []
    goals_scored: list[int] = []
    points: list[int] = []


class MatchFeatures(BaseModel):
    match_id: str
    home_elo: float = 1500.0
    away_elo: float = 1500.0
    home_xg: float = 1.3
    away_xg: float = 1.0
    home_form: float = 0.5
    away_form: float = 0.5
    home_injuries: int = 0
    away_injuries: int = 0
    home_suspended: int = 0
    away_suspended: int = 0
    home_goals_avg: float = 1.3
    away_goals_avg: float = 1.0
    home_fifa_ranking: int = 50
    away_fifa_ranking: int = 50
    h2h_home_wins: int = 0
    h2h_draws: int = 0
    h2h_away_wins: int = 0


class TrainRequest(BaseModel):
    matches: list[dict[str, Any]]


@app.post("/predict")
async def predict(features: MatchFeatures):
    result = predictor.predict(features.model_dump())
    return {"match_id": features.match_id, **result}


@app.post("/train")
async def train(request: TrainRequest):
    """Retrain ML ensemble on latest finished matches."""
    if not request.matches:
        return {"status": "skipped", "reason": "no matches provided"}
    try:
        df = pd.DataFrame(request.matches)
        # Map result column from goals
        if "home_goals" in df.columns and "away_goals" in df.columns:
            df["result"] = df.apply(
                lambda r: 0 if r["home_goals"] > r["away_goals"]
                else 1 if r["home_goals"] == r["away_goals"]
                else 2,
                axis=1,
            )
        result = ensemble.train(df)
        return result
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


@app.post("/trends")
async def trends(teams: list[TeamStats]):
    """Compute Prophet-based form trends for a list of teams."""
    results = prophet.tournament_trends([t.model_dump() for t in teams])
    return results


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
