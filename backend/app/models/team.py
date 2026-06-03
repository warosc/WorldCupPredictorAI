import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(10), nullable=False)
    confederation = Column(String(50))
    fifa_ranking = Column(Integer)
    elo_rating = Column(Float, default=1500.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    home_matches = relationship("Match", back_populates="home_team", foreign_keys="Match.home_team_id")
    away_matches = relationship("Match", back_populates="away_team", foreign_keys="Match.away_team_id")
    players = relationship("Player", back_populates="team")
    rankings = relationship("Ranking", back_populates="team")
