"""
Bayesian model: updates match probabilities daily using contextual signals.
"""
import numpy as np


class BayesianModel:
    def update_probability(
        self,
        prior_home_win: float,
        prior_draw: float,
        prior_away_win: float,
        home_injured_key_players: int = 0,
        away_injured_key_players: int = 0,
        home_form: float = 0.5,
        away_form: float = 0.5,
        home_suspended: int = 0,
        away_suspended: int = 0,
    ) -> dict:
        """
        Updates prior probabilities based on injury/form/suspension signals.
        Uses a multiplicative Bayesian update approach.
        """
        # Likelihood ratios from contextual signals
        injury_penalty = 0.07
        suspension_penalty = 0.05

        home_strength = (
            1.0
            - home_injured_key_players * injury_penalty
            - home_suspended * suspension_penalty
            + (home_form - 0.5) * 0.2
        )
        away_strength = (
            1.0
            - away_injured_key_players * injury_penalty
            - away_suspended * suspension_penalty
            + (away_form - 0.5) * 0.2
        )

        home_strength = max(0.5, min(1.5, home_strength))
        away_strength = max(0.5, min(1.5, away_strength))

        updated_home = prior_home_win * home_strength
        updated_away = prior_away_win * away_strength
        updated_draw = prior_draw

        total = updated_home + updated_draw + updated_away
        return {
            "home_win": updated_home / total,
            "draw": updated_draw / total,
            "away_win": updated_away / total,
        }

    def form_score(self, results: list[str]) -> float:
        """
        Computes form score (0-1) from last N results.
        results: list of "W", "D", "L" (most recent last)
        """
        if not results:
            return 0.5
        weights = np.exp(np.linspace(0, 1, len(results)))
        scores = {"W": 1.0, "D": 0.5, "L": 0.0}
        weighted = sum(scores.get(r, 0.5) * w for r, w in zip(results, weights))
        return float(weighted / weights.sum())
