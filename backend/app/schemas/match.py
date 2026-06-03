from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class MatchCreate(BaseModel):
    home_team_id: UUID
    away_team_id: UUID
    match_date: datetime
    stage: str | None = None
    venue: str | None = None


class MatchOut(BaseModel):
    id: UUID
    home_team_id: UUID
    away_team_id: UUID
    match_date: datetime
    stage: str | None
    venue: str | None
    home_goals: int | None
    away_goals: int | None
    status: str

    model_config = {"from_attributes": True}
