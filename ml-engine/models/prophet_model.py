"""
Prophet model for time-series forecasting of team form and goal trends.
Used to detect teams in ascending/descending form within the tournament.
"""
from pathlib import Path
import os
from datetime import datetime

import numpy as np
import pandas as pd

MODELS_DIR = Path(os.getenv("MODELS_DIR", "/app/models/saved"))
MODELS_DIR.mkdir(parents=True, exist_ok=True)


class ProphetTrendModel:
    """
    For each team, fits a Prophet model on goals_scored over time.
    Returns forecast + trend direction (ascending / descending / stable).
    """

    def forecast_team_form(
        self,
        team_name: str,
        match_dates: list[str],
        goals_scored: list[int],
        points: list[int],
    ) -> dict:
        """
        Returns trend direction and forecasted value for next match.
        match_dates: ISO date strings
        goals_scored / points: one value per match, chronological order
        """
        if len(match_dates) < 3:
            return {"trend": "stable", "forecasted_goals": None, "team": team_name}

        try:
            from prophet import Prophet

            df = pd.DataFrame({
                "ds": pd.to_datetime(match_dates),
                "y": goals_scored,
            })

            model = Prophet(
                yearly_seasonality=False,
                weekly_seasonality=False,
                daily_seasonality=False,
                changepoint_prior_scale=0.5,
            )
            # Suppress Stan output
            import logging
            logging.getLogger("prophet").setLevel(logging.WARNING)
            logging.getLogger("cmdstanpy").setLevel(logging.WARNING)

            model.fit(df)

            future = model.make_future_dataframe(periods=1, freq="W")
            forecast = model.predict(future)

            last_actual = goals_scored[-1]
            forecasted = float(forecast["yhat"].iloc[-1])
            trend_value = float(forecast["trend"].iloc[-1] - forecast["trend"].iloc[-2])

            if trend_value > 0.15:
                trend = "ascending"
            elif trend_value < -0.15:
                trend = "descending"
            else:
                trend = "stable"

            return {
                "team": team_name,
                "trend": trend,
                "trend_value": round(trend_value, 3),
                "forecasted_goals": round(max(forecasted, 0), 2),
                "last_actual_goals": last_actual,
            }
        except Exception as exc:
            # Fallback: simple linear trend
            if len(goals_scored) >= 2:
                diffs = np.diff(goals_scored[-3:])
                avg_change = float(np.mean(diffs))
                trend = "ascending" if avg_change > 0.2 else "descending" if avg_change < -0.2 else "stable"
            else:
                trend = "stable"
                avg_change = 0.0
            return {
                "team": team_name,
                "trend": trend,
                "trend_value": round(avg_change, 3),
                "forecasted_goals": None,
                "last_actual_goals": goals_scored[-1] if goals_scored else None,
            }

    def tournament_trends(self, team_stats: list[dict]) -> list[dict]:
        """
        team_stats: list of dicts per team:
            {name, match_dates, goals_scored, points}
        Returns sorted list by trend_value desc.
        """
        results = []
        for ts in team_stats:
            r = self.forecast_team_form(
                ts["name"],
                ts.get("match_dates", []),
                ts.get("goals_scored", []),
                ts.get("points", []),
            )
            results.append(r)

        results.sort(key=lambda x: x.get("trend_value", 0), reverse=True)
        return results
