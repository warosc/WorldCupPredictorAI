from uuid import UUID
from datetime import datetime
from typing import Any
from pydantic import BaseModel


class SimulationOut(BaseModel):
    id: UUID
    match_id: UUID
    num_simulations: int
    home_win_count: int | None
    draw_count: int | None
    away_win_count: int | None
    score_distribution: Any
    run_at: datetime

    model_config = {"from_attributes": True}
