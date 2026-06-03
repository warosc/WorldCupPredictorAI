"""
Poisson distribution model for goal prediction.
Calculates exact score probabilities.
"""
from scipy.stats import poisson
import numpy as np


class PoissonModel:
    def __init__(self, max_goals: int = 8):
        self.max_goals = max_goals

    def expected_goals(
        self,
        home_attack: float,
        home_defence: float,
        away_attack: float,
        away_defence: float,
        avg_home_goals: float = 1.5,
        avg_away_goals: float = 1.1,
        home_advantage: float = 0.15,
    ) -> tuple[float, float]:
        home_xg = avg_home_goals * home_attack * away_defence * (1 + home_advantage)
        away_xg = avg_away_goals * away_attack * home_defence
        return max(home_xg, 0.1), max(away_xg, 0.1)

    def score_matrix(self, home_xg: float, away_xg: float) -> np.ndarray:
        matrix = np.zeros((self.max_goals + 1, self.max_goals + 1))
        for h in range(self.max_goals + 1):
            for a in range(self.max_goals + 1):
                matrix[h, a] = poisson.pmf(h, home_xg) * poisson.pmf(a, away_xg)
        return matrix

    def outcome_probabilities(self, home_xg: float, away_xg: float) -> dict:
        matrix = self.score_matrix(home_xg, away_xg)
        home_win = float(np.sum(np.tril(matrix, -1)))
        draw = float(np.sum(np.diag(matrix)))
        away_win = float(np.sum(np.triu(matrix, 1)))
        total = home_win + draw + away_win
        return {
            "home_win": home_win / total,
            "draw": draw / total,
            "away_win": away_win / total,
            "home_xg": home_xg,
            "away_xg": away_xg,
        }

    def most_likely_score(self, home_xg: float, away_xg: float) -> tuple[str, float]:
        matrix = self.score_matrix(home_xg, away_xg)
        idx = np.unravel_index(np.argmax(matrix), matrix.shape)
        score = f"{idx[0]}-{idx[1]}"
        prob = float(matrix[idx])
        return score, prob
