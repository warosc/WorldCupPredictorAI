"""
Master predictor: combines ELO, Poisson, Monte Carlo, Bayesian, and ML Ensemble.
"""
from models.bayesian import BayesianModel
from models.elo import EloModel
from models.ml_ensemble import MLEnsemble
from models.monte_carlo import MonteCarloModel
from models.neural_network import NeuralNetworkModel
from models.poisson import PoissonModel


class Predictor:
    WEIGHTS = {
        "elo": 0.18,
        "poisson": 0.22,
        "monte_carlo": 0.22,
        "bayesian": 0.13,
        "ml": 0.13,
        "nn": 0.12,
    }

    def __init__(self):
        self.elo = EloModel()
        self.poisson = PoissonModel()
        self.mc = MonteCarloModel()
        self.bayesian = BayesianModel()
        self.ml = MLEnsemble()
        self.nn = NeuralNetworkModel()

    def predict(self, match_data: dict) -> dict:
        home_xg = match_data.get("home_xg", 1.3)
        away_xg = match_data.get("away_xg", 1.0)
        home_elo = match_data.get("home_elo", 1500)
        away_elo = match_data.get("away_elo", 1500)

        elo_probs = self.elo.win_probability(home_elo, away_elo)
        poisson_probs = self.poisson.outcome_probabilities(home_xg, away_xg)
        mc_result = self.mc.simulate(home_xg, away_xg)
        mc_probs = {
            "home_win": mc_result["home_win_prob"],
            "draw": mc_result["draw_prob"],
            "away_win": mc_result["away_win_prob"],
        }

        base_probs = {
            "home_win": (elo_probs["home_win"] + poisson_probs["home_win"] + mc_probs["home_win"]) / 3,
            "draw": (elo_probs["draw"] + poisson_probs["draw"] + mc_probs["draw"]) / 3,
            "away_win": (elo_probs["away_win"] + poisson_probs["away_win"] + mc_probs["away_win"]) / 3,
        }

        bayesian_probs = self.bayesian.update_probability(
            base_probs["home_win"],
            base_probs["draw"],
            base_probs["away_win"],
            home_injured_key_players=match_data.get("home_injuries", 0),
            away_injured_key_players=match_data.get("away_injuries", 0),
            home_form=match_data.get("home_form", 0.5),
            away_form=match_data.get("away_form", 0.5),
            home_suspended=match_data.get("home_suspended", 0),
            away_suspended=match_data.get("away_suspended", 0),
        )

        ml_probs = self.ml.predict_proba(match_data)
        nn_probs = self.nn.predict_proba(match_data)

        # Build weighted sum; skip models not yet trained (None)
        sources = [
            (elo_probs, self.WEIGHTS["elo"]),
            (poisson_probs, self.WEIGHTS["poisson"]),
            (mc_probs, self.WEIGHTS["monte_carlo"]),
            (bayesian_probs, self.WEIGHTS["bayesian"]),
        ]
        if ml_probs:
            sources.append((ml_probs, self.WEIGHTS["ml"]))
        if nn_probs:
            sources.append((nn_probs, self.WEIGHTS["nn"]))

        total_weight = sum(w for _, w in sources)
        final = {
            "home_win": sum(p["home_win"] * w for p, w in sources) / total_weight,
            "draw":     sum(p["draw"] * w for p, w in sources) / total_weight,
            "away_win": sum(p["away_win"] * w for p, w in sources) / total_weight,
        }

        # Normalize
        total = sum(final.values())
        final = {k: round(v / total, 4) for k, v in final.items()}

        score, score_prob = self.poisson.most_likely_score(home_xg, away_xg)
        top_prob = max(final.values())
        confidence = (
            "Muy Alta" if top_prob > 0.65
            else "Alta" if top_prob > 0.50
            else "Media" if top_prob > 0.38
            else "Baja"
        )

        quiniela_rec = (
            "1" if final["home_win"] == top_prob
            else "X" if final["draw"] == top_prob
            else "2"
        )

        return {
            "home_win_prob": final["home_win"],
            "draw_prob": final["draw"],
            "away_win_prob": final["away_win"],
            "predicted_home_goals": round(home_xg, 2),
            "predicted_away_goals": round(away_xg, 2),
            "most_likely_score": score,
            "score_probability": round(score_prob, 4),
            "confidence": confidence,
            "quiniela_recommendation": quiniela_rec,
            "monte_carlo": mc_result,
        }
