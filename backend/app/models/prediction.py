import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id"))
    home_win_prob = Column(Float, nullable=False)
    draw_prob = Column(Float, nullable=False)
    away_win_prob = Column(Float, nullable=False)
    predicted_home_goals = Column(Float)
    predicted_away_goals = Column(Float)
    most_likely_score = Column(String(10))
    score_probability = Column(Float)
    confidence = Column(String(20))
    model_version = Column(String(50))
    quiniela_recommendation = Column(String(5))
    created_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", back_populates="predictions")
