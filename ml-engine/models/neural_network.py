"""
Neural Network model using TensorFlow/Keras for match outcome prediction.
Architecture: 19 inputs → 64 → 32 → 16 → 3 outputs (home/draw/away).
"""
from pathlib import Path
import os
import numpy as np
import pandas as pd

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


class NeuralNetworkModel:
    def __init__(self):
        self.model = None
        self._trained = False

    def _build(self, input_dim: int):
        try:
            import tensorflow as tf
            tf.get_logger().setLevel("ERROR")
            model = tf.keras.Sequential([
                tf.keras.layers.Input(shape=(input_dim,)),
                tf.keras.layers.Dense(64, activation="relu"),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(32, activation="relu"),
                tf.keras.layers.Dropout(0.2),
                tf.keras.layers.Dense(16, activation="relu"),
                tf.keras.layers.Dense(3, activation="softmax"),
            ])
            model.compile(
                optimizer="adam",
                loss="sparse_categorical_crossentropy",
                metrics=["accuracy"],
            )
            return model
        except ImportError:
            return None

    def train(self, df: pd.DataFrame) -> dict:
        X = df[FEATURE_COLS].fillna(0).values
        y = df["result"].values

        model = self._build(X.shape[1])
        if model is None:
            return {"status": "skipped", "reason": "tensorflow not available"}

        model.fit(
            X, y,
            epochs=50,
            batch_size=32,
            validation_split=0.1,
            verbose=0,
        )
        self.model = model
        self._trained = True
        model.save(str(MODELS_DIR / "nn_model.keras"))
        return {"status": "trained", "samples": len(df)}

    def predict_proba(self, features: dict) -> dict | None:
        if not self._trained:
            model_path = MODELS_DIR / "nn_model.keras"
            if model_path.exists():
                try:
                    import tensorflow as tf
                    tf.get_logger().setLevel("ERROR")
                    self.model = tf.keras.models.load_model(str(model_path))
                    self._trained = True
                except Exception:
                    return None
            else:
                return None

        X = np.array([[features.get(col, 0) for col in FEATURE_COLS]])
        probs = self.model.predict(X, verbose=0)[0]
        return {
            "home_win": float(probs[0]),
            "draw": float(probs[1]),
            "away_win": float(probs[2]),
        }
