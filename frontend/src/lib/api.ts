const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export interface Team {
  id: string;
  name: string;
  code: string;
  confederation: string | null;
  fifa_ranking: number | null;
  elo_rating: number;
}

export interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  stage: string | null;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
}

export interface Prediction {
  id: string;
  match_id: string;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  most_likely_score: string | null;
  score_probability: number | null;
  confidence: string | null;
  quiniela_recommendation: string | null;
}

export interface RankingEntry {
  position: number;
  team_id: string;
  team_name: string;
  elo_rating: number;
  fifa_ranking: number | null;
  form_score: number | null;
  tournament_points: number;
}

export interface MatchPick {
  match_id: string;
  home_team: string;
  away_team: string;
  recommendation: string;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  confidence: string;
}

export interface QuinielaRec {
  strategy: string;
  picks: MatchPick[];
  expected_accuracy: number;
  description: string;
}

export interface TrendTeam {
  team_id: string;
  team_name: string;
  elo_rating: number;
  trend: "ascending" | "descending" | "stable";
  trend_value: number;
  form: string;
  weighted_form: number;
}

export interface TrendsData {
  ascending: TrendTeam[];
  descending: TrendTeam[];
  stable: TrendTeam[];
}

export interface ModelMetrics {
  matches_evaluated: number;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    log_loss: number;
    roi_theoretical: number;
  };
  per_class: Record<string, { precision: number; recall: number; f1: number }>;
}

export interface CompareResult {
  home_team: { id: string; name: string; elo: number; fifa_ranking: number | null };
  away_team: { id: string; name: string; elo: number; fifa_ranking: number | null };
  head_to_head: { matches: number; home_wins: number; draws: number; away_wins: number };
  prediction: {
    home_win_prob: number; draw_prob: number; away_win_prob: number;
    most_likely_score: string | null; confidence: string | null;
  } | null;
}

export interface SimulationOut {
  id: string;
  match_id: string;
  num_simulations: number;
  home_win_count: number;
  draw_count: number;
  away_win_count: number;
  score_distribution: Record<string, number>;
}

export const api = {
  teams: () => fetcher<Team[]>("/teams/"),
  matches: (status?: string) => fetcher<Match[]>(`/matches/${status ? `?status=${status}` : ""}`),
  rankings: () => fetcher<RankingEntry[]>("/rankings/"),
  predictions: () => fetcher<Prediction[]>("/predictions/"),
  quiniela: (strategy: string) => fetcher<QuinielaRec>(`/quiniela/recommendations/${strategy}`),
  worldcupOverview: () => fetcher<{ total_matches: number; matches_played: number; matches_remaining: number }>("/worldcup/overview"),
  trends: () => fetcher<TrendsData>("/trends/"),
  metrics: () => fetcher<ModelMetrics>("/metrics/model"),
  compareTeams: (homeId: string, awayId: string) =>
    fetcher<CompareResult>(`/teams/compare?home_id=${homeId}&away_id=${awayId}`),
  simulation: (matchId: string) => fetcher<SimulationOut>(`/simulations/match/${matchId}`),
  aiQuery: async (question: string): Promise<{ answer: string }> => {
    const res = await fetch(`${API}/ai/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    return res.json();
  },
};
