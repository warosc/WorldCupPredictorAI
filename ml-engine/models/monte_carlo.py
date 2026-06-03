"""
Monte Carlo simulation: 100,000 runs per match.
"""
from collections import Counter

import numpy as np
from scipy.stats import poisson


class MonteCarloModel:
    def __init__(self, n_simulations: int = 100_000):
        self.n_simulations = n_simulations

    def simulate(self, home_xg: float, away_xg: float) -> dict:
        rng = np.random.default_rng()
        home_goals = rng.poisson(home_xg, self.n_simulations)
        away_goals = rng.poisson(away_xg, self.n_simulations)

        home_wins = int(np.sum(home_goals > away_goals))
        draws = int(np.sum(home_goals == away_goals))
        away_wins = int(np.sum(home_goals < away_goals))

        # Top-10 most frequent scores
        scores = Counter(zip(home_goals.tolist(), away_goals.tolist()))
        top_scores = {
            f"{h}-{a}": round(count / self.n_simulations, 4)
            for (h, a), count in scores.most_common(10)
        }

        return {
            "home_win_count": home_wins,
            "draw_count": draws,
            "away_win_count": away_wins,
            "home_win_prob": round(home_wins / self.n_simulations, 4),
            "draw_prob": round(draws / self.n_simulations, 4),
            "away_win_prob": round(away_wins / self.n_simulations, 4),
            "score_distribution": top_scores,
            "num_simulations": self.n_simulations,
        }
