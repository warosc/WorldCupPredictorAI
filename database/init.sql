CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL,
    confederation VARCHAR(50),
    fifa_ranking INTEGER,
    elo_rating FLOAT DEFAULT 1500.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id),
    name VARCHAR(150) NOT NULL,
    position VARCHAR(50),
    age INTEGER,
    injured BOOLEAN DEFAULT FALSE,
    suspended BOOLEAN DEFAULT FALSE,
    form_rating FLOAT DEFAULT 5.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_team_id UUID REFERENCES teams(id),
    away_team_id UUID REFERENCES teams(id),
    match_date TIMESTAMP NOT NULL,
    stage VARCHAR(50),
    venue VARCHAR(150),
    home_goals INTEGER,
    away_goals INTEGER,
    home_xg FLOAT,
    away_xg FLOAT,
    home_possession FLOAT,
    away_possession FLOAT,
    home_shots INTEGER,
    away_shots INTEGER,
    status VARCHAR(20) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id),
    home_win_prob FLOAT NOT NULL,
    draw_prob FLOAT NOT NULL,
    away_win_prob FLOAT NOT NULL,
    predicted_home_goals FLOAT,
    predicted_away_goals FLOAT,
    most_likely_score VARCHAR(10),
    score_probability FLOAT,
    confidence VARCHAR(20),
    model_version VARCHAR(50),
    quiniela_recommendation VARCHAR(5),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id),
    num_simulations INTEGER DEFAULT 100000,
    home_win_count INTEGER,
    draw_count INTEGER,
    away_win_count INTEGER,
    score_distribution JSONB,
    run_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id),
    elo_rating FLOAT NOT NULL,
    fifa_ranking INTEGER,
    form_score FLOAT,
    tournament_points INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS betting_odds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id),
    bookmaker VARCHAR(100),
    home_win_odds FLOAT,
    draw_odds FLOAT,
    away_win_odds FLOAT,
    home_win_implied_prob FLOAT,
    draw_implied_prob FLOAT,
    away_win_implied_prob FLOAT,
    fetched_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historical_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_team_id UUID REFERENCES teams(id),
    away_team_id UUID REFERENCES teams(id),
    match_date DATE NOT NULL,
    competition VARCHAR(100),
    home_goals INTEGER NOT NULL,
    away_goals INTEGER NOT NULL,
    neutral_venue BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS worldcup_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id),
    edition INTEGER NOT NULL,
    stage_reached VARCHAR(50),
    matches_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    UNIQUE(team_id, edition)
);

CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_predictions_match ON predictions(match_id);
CREATE INDEX idx_historical_teams ON historical_results(home_team_id, away_team_id);
CREATE INDEX idx_rankings_team ON rankings(team_id);
