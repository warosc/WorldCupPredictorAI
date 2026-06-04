from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.rbac import require_analyst
from app.database import get_db
from app.models.match import Match
from app.schemas.match import MatchCreate, MatchOut

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("/", response_model=list[MatchOut])
async def list_matches(
    status: str | None = Query(None),
    stage: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Match).order_by(Match.match_date)
    if status:
        query = query.where(Match.status == status)
    if stage:
        query = query.where(Match.stage == stage)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{match_id}", response_model=MatchOut)
async def get_match(match_id: UUID, db: AsyncSession = Depends(get_db)):
    match = await db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.post("/", response_model=MatchOut, status_code=status.HTTP_201_CREATED)
async def create_match(
    data: MatchCreate,
    db: AsyncSession = Depends(get_db),
):
    match = Match(**data.model_dump())
    db.add(match)
    await db.commit()
    await db.refresh(match)
    return match
