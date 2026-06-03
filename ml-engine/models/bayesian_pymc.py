"""
Bayesian model with PyMC for match outcome inference.
Uses ADVI (variational inference) for fast posterior approximation.
Falls back to manual heuristics if PyMC is not available.
"""
from pathlib import Path
import os
import numpy as np

MODELS_DIR = Path(os.getenv("MODELS_DIR", "/app/models/saved"))
MODELS_DIR.mkdir(parents=True, exist_ok=True)


class BayesianPyMCModel:
    """
    Hierarchical Bayesian model: each team has attack/defence strength drawn
    from a shared prior. Goals scored ~ Poisson(exp(home_adv + attack_i - defence_j)).
    Uses ADVI for fast (~seconds) posterior approximation.
    """

    def __init__(self):
        self._fitted = False
        self._attack: dict[str, float] = {}
        self._defence: dict[str, float] = {}
        self._home_advantage: float = 0.25

    def fit(self, matches: list[dict]) -> dict:
        """
        matches: list of dicts with keys:
            home_team, away_team, home_goals, away_goals
        """
        try:
            import pymc as pm
            import pytensor.tensor as pt

            teams = sorted(
                set(m["home_team"] for m in matches) | set(m["away_team"] for m in matches)
            )
            team_idx = {t: i for i, t in enumerate(teams)}
            n_teams = len(teams)

            home_idx = np.array([team_idx[m["home_team"]] for m in matches])
            away_idx = np.array([team_idx[m["away_team"]] for m in matches])
            home_goals = np.array([m["home_goals"] for m in matches])
            away_goals = np.array([m["away_goals"] for m in matches])

            with pm.Model() as model:
                home_adv = pm.Normal("home_adv", mu=0.25, sigma=0.1)
                attack = pm.Normal("attack", mu=0, sigma=0.5, shape=n_teams)
                defence = pm.Normal("defence", mu=0, sigma=0.5, shape=n_teams)

                home_rate = pm.math.exp(home_adv + attack[home_idx] - defence[away_idx])
                away_rate = pm.math.exp(attack[away_idx] - defence[home_idx])

                pm.Poisson("home_goals_obs", mu=home_rate, observed=home_goals)
                pm.Poisson("away_goals_obs", mu=away_rate, observed=away_goals)

                approx = pm.fit(n=10000, method="advi", progressbar=False)
                trace = approx.sample(500)

            self._home_advantage = float(trace.posterior["home_adv"].values.mean())
            attack_mean = trace.posterior["attack"].values.mean(axis=(0, 1))
            defence_mean = trace.posterior["defence"].values.mean(axis=(0, 1))

            self._attack = {t: float(attack_mean[i]) for t, i in team_idx.items()}
            self._defence = {t: float(defence_mean[i]) for t, i in team_idx.items()}
            self._fitted = True

            # Persist
            np.save(str(MODELS_DIR / "pymc_attack.npy"), attack_mean)
            np.save(str(MODELS_DIR / "pymc_defence.npy"), defence_mean)
            import json
            (MODELS_DIR / "pymc_teams.json").write_text(json.dumps({
                "teams": teams,
                "home_advantage": self._home_advantage,
            }))
            return {"status": "fitted", "teams": n_teams, "matches": len(matches)}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def _load(self):
        attack_path = MODELS_DIR / "pymc_attack.npy"
        teams_path = MODELS_DIR / "pymc_teams.json"
        if not (attack_path.exists() and teams_path.exists()):
            return
        import json
        meta = json.loads(teams_path.read_text())
        teams = meta["teams"]
        self._home_advantage = meta.get("home_advantage", 0.25)
        attack_arr = np.load(str(attack_path))
        defence_arr = np.load(str(MODELS_DIR / "pymc_defence.npy"))
        self._attack = {t: float(attack_arr[i]) for i, t in enumerate(teams)}
        self._defence = {t: float(defence_arr[i]) for i, t in enumerate(teams)}
        self._fitted = True

    def predict_xg(self, home_team: str, away_team: str) -> tuple[float, float]:
        """Returns (home_xg, away_xg) from the fitted model."""
        if not self._fitted:
            self._load()
        if not self._fitted:
            return 1.3, 1.0

        ha = self._attack.get(home_team, 0.0)
        hd = self._defence.get(home_team, 0.0)
        aa = self._attack.get(away_team, 0.0)
        ad = self._defence.get(away_team, 0.0)

        home_xg = np.exp(self._home_advantage + ha - ad)
        away_xg = np.exp(aa - hd)
        return float(np.clip(home_xg, 0.3, 5.0)), float(np.clip(away_xg, 0.3, 5.0))

    def outcome_probabilities(
        self, home_team: str, away_team: str, n_samples: int = 5000
    ) -> dict:
        home_xg, away_xg = self.predict_xg(home_team, away_team)

        from scipy.stats import poisson
        import itertools
        max_g = 8
        home_win = draw = away_win = 0.0
        for h, a in itertools.product(range(max_g + 1), range(max_g + 1)):
            p = poisson.pmf(h, home_xg) * poisson.pmf(a, away_xg)
            if h > a:
                home_win += p
            elif h == a:
                draw += p
            else:
                away_win += p

        total = home_win + draw + away_win
        return {
            "home_win": home_win / total,
            "draw": draw / total,
            "away_win": away_win / total,
            "home_xg": home_xg,
            "away_xg": away_xg,
        }
