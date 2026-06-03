from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class RankingOut(BaseModel):
    id: UUID
    team_id: UUID
    elo_rating: float
    fifa_ranking: int | None
    form_score: float | None
    tournament_points: int
    goals_for: int
    goals_against: int
    matches_played: int
    updated_at: datetime

    model_config = {"from_attributes": True}
