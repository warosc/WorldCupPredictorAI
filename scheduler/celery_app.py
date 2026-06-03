import os
from celery import Celery
from celery.schedules import crontab

BROKER = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/1")
BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/2")

app = Celery(
    "quiniesys",
    broker=BROKER,
    backend=BACKEND,
    include=["tasks.etl", "tasks.predictions", "tasks.training"],
)

app.conf.beat_schedule = {
    # Ciclo principal: sync datos reales + regenerar predicciones cada 6 horas
    # Activo siempre; antes del 11 Jun solo actualiza ELO/rankings, sin partidos nuevos
    "sync-and-predict-every-6h": {
        "task": "tasks.predictions.sync_and_predict",
        "schedule": crontab(minute=0, hour="*/6"),
    },

    # ETL adicional: descarga datos de fuentes externas cada 6 horas (offset 30 min)
    "etl-every-6h": {
        "task": "tasks.etl.run_etl_pipeline",
        "schedule": crontab(minute=30, hour="*/6"),
    },

    # Reentrenamiento ML semanal (lunes 2am)
    "weekly-model-training": {
        "task": "tasks.training.train_models",
        "schedule": crontab(minute=0, hour=2, day_of_week=1),
    },
}

app.conf.timezone = "UTC"
