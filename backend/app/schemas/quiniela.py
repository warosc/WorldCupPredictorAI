from uuid import UUID
from pydantic import BaseModel


class MatchPick(BaseModel):
    match_id: UUID
    home_team: str
    away_team: str
    recommendation: str  # "1", "X", "2"
    home_win_prob: float
    draw_prob: float
    away_win_prob: float
    confidence: str


class QuinielaRecommendation(BaseModel):
    strategy: str  # conservative | balanced | aggressive
    picks: list[MatchPick]
    expected_accuracy: float
    description: str
