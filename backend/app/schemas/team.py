from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class TeamCreate(BaseModel):
    name: str
    code: str
    confederation: str | None = None
    fifa_ranking: int | None = None
    elo_rating: float = 1500.0


class TeamOut(BaseModel):
    id: UUID
    name: str
    code: str
    confederation: str | None
    fifa_ranking: int | None
    elo_rating: float
    updated_at: datetime

    model_config = {"from_attributes": True}
