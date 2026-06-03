"""
LLM-powered AI agent for natural language queries about the tournament.
Uses Claude (Anthropic API) with current predictions/rankings as context.
"""
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.match import Match
from app.models.ranking import Ranking

router = APIRouter(prefix="/ai", tags=["ai-agent"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


class QueryRequest(BaseModel):
    question: str


async def _build_context(db: AsyncSession) -> str:
    # Top 10 rankings
    rank_result = await db.execute(
        select(Ranking)
        .options(joinedload(Ranking.team))
        .order_by(Ranking.elo_rating.desc())
        .limit(10)
    )
    rankings = rank_result.scalars().all()
    ranking_lines = "\n".join(
        f"{i+1}. {r.team.name} (ELO: {r.elo_rating:.0f}, Pts: {r.tournament_points})"
        for i, r in enumerate(rankings) if r.team
    )

    # Next 5 scheduled matches with predictions
    match_result = await db.execute(
        select(Match)
        .where(Match.status == "scheduled")
        .options(
            joinedload(Match.home_team),
            joinedload(Match.away_team),
            joinedload(Match.predictions),
        )
        .order_by(Match.match_date)
        .limit(5)
    )
    matches = match_result.unique().scalars().all()
    match_lines = []
    for m in matches:
        pred = sorted(m.predictions, key=lambda p: p.created_at, reverse=True)
        pred = pred[0] if pred else None
        home = m.home_team.name if m.home_team else "?"
        away = m.away_team.name if m.away_team else "?"
        if pred:
            match_lines.append(
                f"- {home} vs {away}: Local {pred.home_win_prob*100:.1f}% | "
                f"Empate {pred.draw_prob*100:.1f}% | Visitante {pred.away_win_prob*100:.1f}% "
                f"(confianza: {pred.confidence}, marcador más probable: {pred.most_likely_score})"
            )
        else:
            match_lines.append(f"- {home} vs {away}: sin predicción aún")

    return (
        f"RANKINGS TOP 10 (por ELO):\n{ranking_lines}\n\n"
        f"PRÓXIMOS PARTIDOS:\n" + "\n".join(match_lines)
    )


@router.post("/query")
async def query(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY not configured. Set it in .env to enable the AI agent.",
        )

    context = await _build_context(db)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=(
                "Eres un experto analista del Mundial de Fútbol 2026. "
                "Responde preguntas basándote ÚNICAMENTE en los datos actuales del torneo que se te proporcionan. "
                "Sé conciso, preciso y menciona probabilidades concretas cuando sea relevante. "
                "Responde siempre en español."
            ),
            messages=[
                {
                    "role": "user",
                    "content": f"Datos actuales del torneo:\n{context}\n\nPregunta: {request.question}",
                }
            ],
        )
        return {
            "question": request.question,
            "answer": message.content[0].text,
            "context_used": True,
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="anthropic package not installed")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"LLM error: {exc}")
