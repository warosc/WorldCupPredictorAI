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
    "etl-every-6-hours": {
        "task": "tasks.etl.run_etl_pipeline",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    "daily-predictions": {
        "task": "tasks.predictions.generate_all_predictions",
        "schedule": crontab(minute=30, hour=4),
    },
    "daily-rankings": {
        "task": "tasks.predictions.update_rankings",
        "schedule": crontab(minute=0, hour=5),
    },
    "weekly-model-training": {
        "task": "tasks.training.train_models",
        "schedule": crontab(minute=0, hour=2, day_of_week=1),
    },
}

app.conf.timezone = "UTC"
