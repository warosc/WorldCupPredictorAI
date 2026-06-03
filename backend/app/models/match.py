import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Match(Base):
    __tablename__ = "matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    home_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"))
    away_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"))
    match_date = Column(DateTime, nullable=False)
    stage = Column(String(50))
    venue = Column(String(150))
    home_goals = Column(Integer)
    away_goals = Column(Integer)
    home_xg = Column(Float)
    away_xg = Column(Float)
    home_possession = Column(Float)
    away_possession = Column(Float)
    home_shots = Column(Integer)
    away_shots = Column(Integer)
    status = Column(String(20), default="scheduled")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    home_team = relationship("Team", back_populates="home_matches", foreign_keys=[home_team_id])
    away_team = relationship("Team", back_populates="away_matches", foreign_keys=[away_team_id])
    predictions = relationship("Prediction", back_populates="match")
    simulations = relationship("Simulation", back_populates="match")
    betting_odds = relationship("BettingOdds", back_populates="match")
