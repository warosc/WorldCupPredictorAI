import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id"))
    num_simulations = Column(Integer, default=100000)
    home_win_count = Column(Integer)
    draw_count = Column(Integer)
    away_win_count = Column(Integer)
    score_distribution = Column(JSONB)
    run_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", back_populates="simulations")
