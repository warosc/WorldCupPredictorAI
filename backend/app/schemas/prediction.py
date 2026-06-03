from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class PredictionOut(BaseModel):
    id: UUID
    match_id: UUID
    home_win_prob: float
    draw_prob: float
    away_win_prob: float
    predicted_home_goals: float | None
    predicted_away_goals: float | None
    most_likely_score: str | None
    score_probability: float | None
    confidence: str | None
    quiniela_recommendation: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
