import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.elo import EloModel
from models.poisson import PoissonModel
from models.monte_carlo import MonteCarloModel
from models.bayesian import BayesianModel


def test_elo_expected_score():
    elo = EloModel()
    prob = elo.expected_score(1600, 1400)
    assert 0.5 < prob < 1.0


def test_elo_win_probability_sums_to_one():
    elo = EloModel()
    probs = elo.win_probability(1600, 1400)
    total = probs["home_win"] + probs["draw"] + probs["away_win"]
    assert abs(total - 1.0) < 0.001


def test_poisson_probabilities():
    model = PoissonModel()
    probs = model.outcome_probabilities(1.5, 1.0)
    total = probs["home_win"] + probs["draw"] + probs["away_win"]
    assert abs(total - 1.0) < 0.001


def test_poisson_most_likely_score():
    model = PoissonModel()
    score, prob = model.most_likely_score(1.5, 1.0)
    assert "-" in score
    assert 0 < prob < 1


def test_monte_carlo_probabilities():
    mc = MonteCarloModel(n_simulations=1000)
    result = mc.simulate(1.5, 1.0)
    total = result["home_win_prob"] + result["draw_prob"] + result["away_win_prob"]
    assert abs(total - 1.0) < 0.01


def test_bayesian_update():
    model = BayesianModel()
    probs = model.update_probability(0.5, 0.25, 0.25, home_injured_key_players=2)
    total = probs["home_win"] + probs["draw"] + probs["away_win"]
    assert abs(total - 1.0) < 0.001
    assert probs["home_win"] < 0.5


def test_bayesian_form_score():
    model = BayesianModel()
    score = model.form_score(["W", "W", "D", "L", "W"])
    assert 0 <= score <= 1
