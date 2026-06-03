from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.database import Base, engine
from app.routers import matches, predictions, quiniela, rankings, simulations, teams, worldcup
from app.routers import metrics, trends, ai_agent

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Quiniesys - WorldCup Predictor AI",
    description="Plataforma de predicción probabilística para quinielas del Mundial",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app)

app.include_router(teams.router)
app.include_router(matches.router)
app.include_router(predictions.router)
app.include_router(simulations.router)
app.include_router(rankings.router)
app.include_router(worldcup.router)
app.include_router(quiniela.router)
app.include_router(metrics.router)
app.include_router(trends.router)
app.include_router(ai_agent.router)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health():
    return {"status": "ok"}
