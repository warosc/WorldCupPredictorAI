from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.simulation import Simulation
from app.schemas.simulation import SimulationOut

router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.get("/match/{match_id}", response_model=SimulationOut)
async def get_simulation(match_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Simulation)
        .where(Simulation.match_id == match_id)
        .order_by(Simulation.run_at.desc())
        .limit(1)
    )
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return sim


@router.get("/", response_model=list[SimulationOut])
async def list_simulations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Simulation).order_by(Simulation.run_at.desc()).limit(20))
    return result.scalars().all()
