import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class BettingOdds(Base):
    __tablename__ = "betting_odds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id"))
    bookmaker = Column(String(100))
    home_win_odds = Column(Float)
    draw_odds = Column(Float)
    away_win_odds = Column(Float)
    home_win_implied_prob = Column(Float)
    draw_implied_prob = Column(Float)
    away_win_implied_prob = Column(Float)
    fetched_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", back_populates="betting_odds")
