"""
ML Ensemble: Random Forest, XGBoost, LightGBM, Neural Network.
"""
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

MODELS_DIR = Path(os.getenv("MODELS_DIR", "/app/models/saved"))
MODELS_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_COLS = [
    "home_goals_avg", "away_goals_avg",
    "home_goals_conceded_avg", "away_goals_conceded_avg",
    "home_possession_avg", "away_possession_avg",
    "home_shots_avg", "away_shots_avg",
    "home_xg_avg", "away_xg_avg",
    "home_fifa_ranking", "away_fifa_ranking",
    "home_elo", "away_elo",
    "home_form", "away_form",
    "h2h_home_wins", "h2h_draws", "h2h_away_wins",
]


class MLEnsemble:
    def __init__(self):
        self.rf = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
        self.scaler = StandardScaler()
        self._trained = False

    def _load(self):
        rf_path = MODELS_DIR / "rf_model.joblib"
        scaler_path = MODELS_DIR / "scaler.joblib"
        if rf_path.exists() and scaler_path.exists():
            self.rf = joblib.load(rf_path)
            self.scaler = joblib.load(scaler_path)
            self._trained = True

    def train(self, df: pd.DataFrame) -> dict:
        X = df[FEATURE_COLS].fillna(0)
        y = df["result"]  # 0=home_win, 1=draw, 2=away_win

        X_scaled = self.scaler.fit_transform(X)

        try:
            import xgboost as xgb
            self.xgb = xgb.XGBClassifier(n_estimators=200, random_state=42, eval_metric="mlogloss")
            self.xgb.fit(X_scaled, y)
        except ImportError:
            self.xgb = None

        try:
            import lightgbm as lgb
            self.lgb = lgb.LGBMClassifier(n_estimators=200, random_state=42, verbose=-1)
            self.lgb.fit(X_scaled, y)
        except ImportError:
            self.lgb = None

        self.rf.fit(X_scaled, y)
        self._trained = True

        joblib.dump(self.rf, MODELS_DIR / "rf_model.joblib")
        joblib.dump(self.scaler, MODELS_DIR / "scaler.joblib")

        # Also train the neural network
        from models.neural_network import NeuralNetworkModel
        nn = NeuralNetworkModel()
        nn.train(df)

        return {"status": "trained", "samples": len(df)}

    def predict_proba(self, features: dict) -> dict:
        self._load()
        if not self._trained:
            return None

        X = np.array([[features.get(col, 0) for col in FEATURE_COLS]])
        X_scaled = self.scaler.transform(X)

        probas = []
        probas.append(self.rf.predict_proba(X_scaled)[0])

        if hasattr(self, "xgb") and self.xgb:
            probas.append(self.xgb.predict_proba(X_scaled)[0])
        if hasattr(self, "lgb") and self.lgb:
            probas.append(self.lgb.predict_proba(X_scaled)[0])

        avg = np.mean(probas, axis=0)
        classes = self.rf.classes_

        result = {"home_win": 0.0, "draw": 0.0, "away_win": 0.0}
        label_map = {0: "home_win", 1: "draw", 2: "away_win"}
        for cls, prob in zip(classes, avg):
            result[label_map.get(cls, "home_win")] = float(prob)
        return result
