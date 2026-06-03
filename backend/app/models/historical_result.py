import uuid

from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class HistoricalResult(Base):
    __tablename__ = "historical_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    home_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"))
    away_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"))
    match_date = Column(Date, nullable=False)
    competition = Column(String(100))
    home_goals = Column(Integer, nullable=False)
    away_goals = Column(Integer, nullable=False)
    neutral_venue = Column(Boolean, default=False)

    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])
