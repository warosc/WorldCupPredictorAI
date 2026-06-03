"""
Model performance metrics: Accuracy, Precision, Recall, F1, Log Loss, ROI.
Computed by comparing past predictions against actual match results.
"""
import math

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.match import Match
from app.models.prediction import Prediction

router = APIRouter(prefix="/metrics", tags=["metrics"])


def _safe_log(p: float) -> float:
    return math.log(max(p, 1e-7))


@router.get("/model")
async def model_metrics(db: AsyncSession = Depends(get_db)):
    """
    Returns prediction quality metrics for all finished matches that have predictions.
    """
    result = await db.execute(
        select(Match)
        .where(Match.status == "finished")
        .options(joinedload(Match.predictions))
    )
    finished = result.unique().scalars().all()

    if not finished:
        return {"message": "No finished matches with predictions yet", "metrics": {}}

    # Per-class TP/FP/FN counters
    tp = {"1": 0, "X": 0, "2": 0}
    fp = {"1": 0, "X": 0, "2": 0}
    fn = {"1": 0, "X": 0, "2": 0}

    correct = 0
    total = 0
    log_loss_sum = 0.0
    roi_sum = 0.0  # Assume €1 stake per quiniela pick, payout = 1/prob if correct

    for match in finished:
        if match.home_goals is None or match.away_goals is None:
            continue
        pred = sorted(match.predictions, key=lambda p: p.created_at, reverse=True)
        if not pred:
            continue
        pred = pred[0]

        # Actual outcome
        if match.home_goals > match.away_goals:
            actual = "1"
        elif match.home_goals == match.away_goals:
            actual = "X"
        else:
            actual = "2"

        rec = pred.quiniela_recommendation or "1"
        total += 1

        # Accuracy
        if rec == actual:
            correct += 1
            roi_sum += (1.0 / max({"1": pred.home_win_prob, "X": pred.draw_prob, "2": pred.away_win_prob}[actual], 0.05)) - 1.0
        else:
            roi_sum -= 1.0

        # Log-loss
        prob_actual = {"1": pred.home_win_prob, "X": pred.draw_prob, "2": pred.away_win_prob}[actual]
        log_loss_sum += -_safe_log(prob_actual)

        # Precision/Recall per class
        for cls in ("1", "X", "2"):
            pred_cls = rec == cls
            act_cls = actual == cls
            if pred_cls and act_cls:
                tp[cls] += 1
            elif pred_cls and not act_cls:
                fp[cls] += 1
            elif not pred_cls and act_cls:
                fn[cls] += 1

    if total == 0:
        return {"message": "No scorable predictions yet", "metrics": {}}

    accuracy = correct / total
    log_loss = log_loss_sum / total
    roi = roi_sum / total

    def precision(cls):
        return tp[cls] / max(tp[cls] + fp[cls], 1)

    def recall(cls):
        return tp[cls] / max(tp[cls] + fn[cls], 1)

    def f1(cls):
        p, r = precision(cls), recall(cls)
        return 2 * p * r / max(p + r, 1e-7)

    macro_precision = sum(precision(c) for c in ("1", "X", "2")) / 3
    macro_recall = sum(recall(c) for c in ("1", "X", "2")) / 3
    macro_f1 = sum(f1(c) for c in ("1", "X", "2")) / 3

    return {
        "matches_evaluated": total,
        "metrics": {
            "accuracy": round(accuracy, 4),
            "precision": round(macro_precision, 4),
            "recall": round(macro_recall, 4),
            "f1_score": round(macro_f1, 4),
            "log_loss": round(log_loss, 4),
            "roi_theoretical": round(roi, 4),
        },
        "per_class": {
            cls: {
                "precision": round(precision(cls), 4),
                "recall": round(recall(cls), 4),
                "f1": round(f1(cls), 4),
            }
            for cls in ("1", "X", "2")
        },
    }


@router.get("/confidence-calibration")
async def confidence_calibration(db: AsyncSession = Depends(get_db)):
    """
    Checks whether confidence levels correspond to actual accuracy rates.
    """
    result = await db.execute(
        select(Match)
        .where(Match.status == "finished")
        .options(joinedload(Match.predictions))
    )
    finished = result.unique().scalars().all()

    buckets: dict[str, dict] = {
        "Muy Alta": {"correct": 0, "total": 0},
        "Alta":     {"correct": 0, "total": 0},
        "Media":    {"correct": 0, "total": 0},
        "Baja":     {"correct": 0, "total": 0},
    }

    for match in finished:
        if match.home_goals is None:
            continue
        pred = sorted(match.predictions, key=lambda p: p.created_at, reverse=True)
        if not pred:
            continue
        pred = pred[0]

        actual = "1" if match.home_goals > match.away_goals else "X" if match.home_goals == match.away_goals else "2"
        conf = pred.confidence or "Media"
        if conf in buckets:
            buckets[conf]["total"] += 1
            if pred.quiniela_recommendation == actual:
                buckets[conf]["correct"] += 1

    return {
        level: {
            "accuracy": round(v["correct"] / v["total"], 4) if v["total"] else None,
            "sample_size": v["total"],
        }
        for level, v in buckets.items()
    }
