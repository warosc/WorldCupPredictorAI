"""
Seed script: inserts 48 World Cup 2026 teams + sample matches + predictions.
Run with: python database/seed_data.py
Requires: DATABASE_URL env var (or defaults to local postgres).
"""
import os
import sys
import uuid
from datetime import datetime, timedelta

import psycopg2
from psycopg2.extras import execute_values

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://quiniesys:quiniesys_pass@localhost:5432/quiniesys",
)

# 48 qualified teams for FIFA World Cup 2026 with realistic ELO and FIFA rankings
TEAMS = [
    # CONMEBOL (6)
    ("Brazil",        "BRA", "CONMEBOL", 1,  2015.0),
    ("Argentina",     "ARG", "CONMEBOL", 2,  2050.0),
    ("France",        "FRA", "UEFA",     3,  2005.0),
    ("England",       "ENG", "UEFA",     4,  1975.0),
    ("Spain",         "ESP", "UEFA",     5,  1980.0),
    ("Portugal",      "POR", "UEFA",     6,  1960.0),
    ("Netherlands",   "NED", "UEFA",     7,  1940.0),
    ("Belgium",       "BEL", "UEFA",     8,  1920.0),
    ("Germany",       "GER", "UEFA",     9,  1930.0),
    ("Croatia",       "CRO", "UEFA",     10, 1880.0),
    ("Uruguay",       "URU", "CONMEBOL", 11, 1870.0),
    ("Colombia",      "COL", "CONMEBOL", 12, 1850.0),
    ("USA",           "USA", "CONCACAF", 13, 1810.0),
    ("Mexico",        "MEX", "CONCACAF", 14, 1800.0),
    ("Japan",         "JPN", "AFC",      15, 1820.0),
    ("South Korea",   "KOR", "AFC",      16, 1790.0),
    ("Morocco",       "MAR", "CAF",      17, 1800.0),
    ("Senegal",       "SEN", "CAF",      18, 1770.0),
    ("Australia",     "AUS", "AFC",      19, 1740.0),
    ("Switzerland",   "SUI", "UEFA",     20, 1800.0),
    ("Denmark",       "DEN", "UEFA",     21, 1790.0),
    ("Austria",       "AUT", "UEFA",     22, 1760.0),
    ("Ukraine",       "UKR", "UEFA",     23, 1760.0),
    ("Turkey",        "TUR", "UEFA",     24, 1750.0),
    ("Chile",         "CHI", "CONMEBOL", 25, 1740.0),
    ("Ecuador",       "ECU", "CONMEBOL", 26, 1740.0),
    ("Canada",        "CAN", "CONCACAF", 27, 1720.0),
    ("Costa Rica",    "CRC", "CONCACAF", 28, 1700.0),
    ("Panama",        "PAN", "CONCACAF", 29, 1680.0),
    ("Iran",          "IRN", "AFC",      30, 1710.0),
    ("Saudi Arabia",  "KSA", "AFC",      31, 1700.0),
    ("Qatar",         "QAT", "AFC",      32, 1690.0),
    ("Nigeria",       "NGA", "CAF",      33, 1730.0),
    ("Egypt",         "EGY", "CAF",      34, 1720.0),
    ("Ivory Coast",   "CIV", "CAF",      35, 1700.0),
    ("Cameroon",      "CMR", "CAF",      36, 1690.0),
    ("Ghana",         "GHA", "CAF",      37, 1680.0),
    ("Algeria",       "ALG", "CAF",      38, 1670.0),
    ("Serbia",        "SRB", "UEFA",     39, 1760.0),
    ("Poland",        "POL", "UEFA",     40, 1740.0),
    ("Czech Republic","CZE", "UEFA",     41, 1730.0),
    ("Scotland",      "SCO", "UEFA",     42, 1710.0),
    ("Venezuela",     "VEN", "CONMEBOL", 43, 1680.0),
    ("Paraguay",      "PAR", "CONMEBOL", 44, 1670.0),
    ("New Zealand",   "NZL", "OFC",      45, 1600.0),
    ("Jamaica",       "JAM", "CONCACAF", 46, 1650.0),
    ("Bahrain",       "BHR", "AFC",      47, 1590.0),
    ("Indonesia",     "IDN", "AFC",      48, 1570.0),
]

# Sample group-stage matches: (home_code, away_code, date_offset_days, stage)
MATCHES = [
    ("ARG", "MAR", 0,  "Group A"),
    ("BRA", "MEX", 0,  "Group B"),
    ("FRA", "GER", 1,  "Group C"),
    ("ENG", "USA", 1,  "Group D"),
    ("ESP", "JPN", 2,  "Group E"),
    ("POR", "URU", 2,  "Group F"),
    ("NED", "SEN", 3,  "Group G"),
    ("BEL", "CRO", 3,  "Group H"),
    ("ARG", "MEX", 4,  "Group A"),
    ("BRA", "MAR", 4,  "Group B"),
    ("FRA", "USA", 5,  "Group C"),
    ("ENG", "GER", 5,  "Group D"),
]

# Tournament start date
START_DATE = datetime(2026, 6, 11)


def seed():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print("Inserting teams...")
    team_ids: dict[str, str] = {}
    for name, code, conf, ranking, elo in TEAMS:
        tid = str(uuid.uuid4())
        team_ids[code] = tid
        cur.execute(
            """
            INSERT INTO teams (id, name, code, confederation, fifa_ranking, elo_rating)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (name) DO UPDATE
              SET elo_rating = EXCLUDED.elo_rating,
                  fifa_ranking = EXCLUDED.fifa_ranking
            RETURNING id
            """,
            (tid, name, code, conf, ranking, elo),
        )
        row = cur.fetchone()
        if row:
            team_ids[code] = str(row[0])

    print(f"  {len(TEAMS)} teams inserted/updated")

    print("Inserting sample matches...")
    match_ids = []
    for home_code, away_code, day_offset, stage in MATCHES:
        mid = str(uuid.uuid4())
        match_date = START_DATE + timedelta(days=day_offset)
        cur.execute(
            """
            INSERT INTO matches (id, home_team_id, away_team_id, match_date, stage, status)
            VALUES (%s, %s, %s, %s, %s, 'scheduled')
            ON CONFLICT DO NOTHING
            """,
            (mid, team_ids[home_code], team_ids[away_code], match_date, stage),
        )
        match_ids.append((mid, team_ids[home_code], team_ids[away_code]))

    print(f"  {len(MATCHES)} matches inserted")

    print("Inserting sample predictions...")
    import random
    random.seed(42)
    for mid, home_id, away_id in match_ids:
        hw = round(random.uniform(0.35, 0.65), 4)
        aw = round(random.uniform(0.10, 0.35), 4)
        draw = round(1.0 - hw - aw, 4)
        top = max(hw, draw, aw)
        confidence = "Muy Alta" if top > 0.65 else "Alta" if top > 0.50 else "Media"
        rec = "1" if hw == top else "X" if draw == top else "2"
        cur.execute(
            """
            INSERT INTO predictions
              (id, match_id, home_win_prob, draw_prob, away_win_prob,
               predicted_home_goals, predicted_away_goals, most_likely_score,
               score_probability, confidence, model_version, quiniela_recommendation)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (
                str(uuid.uuid4()), mid, hw, draw, aw,
                round(random.uniform(0.9, 2.2), 1),
                round(random.uniform(0.6, 1.8), 1),
                f"{random.randint(0,3)}-{random.randint(0,2)}",
                round(random.uniform(0.10, 0.22), 4),
                confidence, "seed-v1", rec,
            ),
        )

    print(f"  {len(match_ids)} predictions inserted")

    print("Inserting rankings...")
    for name, code, conf, ranking, elo in TEAMS:
        tid = team_ids[code]
        cur.execute(
            """
            INSERT INTO rankings (id, team_id, elo_rating, fifa_ranking, form_score,
                                  tournament_points, goals_for, goals_against, matches_played)
            VALUES (%s, %s, %s, %s, %s, 0, 0, 0, 0)
            ON CONFLICT DO NOTHING
            """,
            (str(uuid.uuid4()), tid, elo, ranking, round(random.uniform(0.4, 0.8), 2)),
        )

    print(f"  {len(TEAMS)} ranking rows inserted")

    conn.commit()
    cur.close()
    conn.close()
    print("\nSeed complete.")


if __name__ == "__main__":
    seed()
