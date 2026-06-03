# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Quiniesys / WorldCup Predictor AI** — A dockerized platform that analyzes World Cup football matches daily and generates probabilistic predictions for sports betting quinielas. The system uses statistical modeling (ELO, Poisson, Monte Carlo, Bayesian) combined with machine learning ensembles.

The full specification is in [quiniesys.md](quiniesys.md) (Spanish).

## Running the Project

```bash
# Start all services
docker-compose up --build

# Start detached
docker-compose up -d

# Stop
docker-compose down

# View logs for a specific service
docker-compose logs -f api
docker-compose logs -f ml-engine
```

## Architecture

The system is a **microservices architecture** with six Docker services defined in `docker-compose.yml`:

| Service | Tech | Role |
|---|---|---|
| `api` | Python 3.12 / FastAPI | REST API serving predictions, match data, recommendations |
| `ml-engine` | Python 3.12 + ML libs | Trains and runs predictive models |
| `scheduler` | Celery + Redis | Runs ETL every 6h; triggers training/simulation tasks |
| `frontend` | Next.js + TailwindCSS + Shadcn/UI | Dashboard UI |
| `postgres` | PostgreSQL | Primary data store |
| `redis` | Redis | Task queue (Celery) + cache for rankings/predictions |

### Backend (`api` + `ml-engine`)

- **FastAPI** exposes: `/teams`, `/matches`, `/predictions`, `/simulations`, `/rankings`, `/worldcup`, `/quiniela/recommendations`
- **ML stack**: Scikit-Learn, XGBoost, LightGBM, TensorFlow, Prophet, PyMC, SciPy, Pandas, NumPy
- **Security**: JWT auth, RBAC, rate limiting

### ML Models

Five model types run in parallel and are ensembled for final predictions:
1. **ELO Rating** — team relative strength (`R' = R + K × (S − E)`)
2. **Poisson Distribution** — goal count probabilities per team
3. **Monte Carlo** — 100,000 simulations per match for win/draw/loss %
4. **Bayesian** — daily-updated probabilities incorporating injuries, form, recent results
5. **ML Ensemble** — Random Forest, XGBoost, LightGBM, Neural Network trained on goals, possession, shots, xG, FIFA ranking, ELO, head-to-head history

### ETL Pipeline (`scheduler`)

Runs every 6 hours, pulling from: FIFA, SofaScore, FBref, Understat, API-Football, Football-Data.
Steps: Download → Clean → Validate → Enrich → Store → Re-predict.

### Database Schema (PostgreSQL)

Tables: `teams`, `players`, `matches`, `predictions`, `simulations`, `rankings`, `betting_odds`, `historical_results`, `worldcup_stats`

### Frontend

Next.js app with TailwindCSS + Shadcn/UI. Visualizations via Chart.js and Recharts. Shows:
- Top 10 most predictable matches
- Rising/falling team trends
- Monte Carlo heatmaps
- Team vs. team comparator
- LLM-powered natural language query agent

### Quiniela Recommendation Strategies

Three output modes: **Conservative** (max probability), **Balanced** (probability + risk), **Aggressive** (seek upsets).

## Monitoring

Prometheus + Grafana for service metrics. GitHub Actions for CI/CD with automated tests.
