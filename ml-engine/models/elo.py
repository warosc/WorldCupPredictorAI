"""
ELO Rating model for relative team strength.
Formula: R' = R + K * (S - E)
"""


class EloModel:
    K = 32  # K-factor (higher = faster rating change)

    def expected_score(self, rating_a: float, rating_b: float) -> float:
        return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))

    def update_ratings(
        self, home_rating: float, away_rating: float, home_goals: int, away_goals: int
    ) -> tuple[float, float]:
        if home_goals > away_goals:
            home_score, away_score = 1.0, 0.0
        elif home_goals == away_goals:
            home_score, away_score = 0.5, 0.5
        else:
            home_score, away_score = 0.0, 1.0

        home_expected = self.expected_score(home_rating, away_rating)
        away_expected = 1 - home_expected

        new_home = home_rating + self.K * (home_score - home_expected)
        new_away = away_rating + self.K * (away_score - away_expected)
        return new_home, new_away

    def win_probability(self, home_rating: float, away_rating: float, home_advantage: float = 50.0) -> dict:
        """Returns win/draw/loss probabilities using ELO difference."""
        adjusted_home = home_rating + home_advantage
        home_win_prob = self.expected_score(adjusted_home, away_rating)

        # Approximate draw probability based on how close teams are
        rating_diff = abs(adjusted_home - away_rating)
        draw_prob = max(0.15, 0.30 - rating_diff / 1000)

        away_win_prob = max(0.0, 1.0 - home_win_prob - draw_prob)

        # Normalize
        total = home_win_prob + draw_prob + away_win_prob
        return {
            "home_win": home_win_prob / total,
            "draw": draw_prob / total,
            "away_win": away_win_prob / total,
        }
