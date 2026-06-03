"use client";

import { useState } from "react";
import { api, type Team, type CompareResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Client component — teams fetched on-demand
export default function CompararPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [homeId, setHomeId] = useState("");
  const [awayId, setAwayId] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function loadTeams() {
    if (loaded) return;
    try {
      const data = await api.teams();
      setTeams(data);
      setLoaded(true);
    } catch {
      setError("No se pudieron cargar los equipos");
    }
  }

  async function compare() {
    if (!homeId || !awayId || homeId === awayId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.compareTeams(homeId, awayId);
      setResult(data);
    } catch {
      setError("Error al comparar equipos");
    } finally {
      setLoading(false);
    }
  }

  const CONFIDENCE_COLOR: Record<string, string> = {
    "Muy Alta": "success", "Alta": "info", "Media": "warning", "Baja": "danger",
  } as const;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold">Comparador de Equipos</h1>

      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Equipo Local</label>
              <select
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                value={homeId}
                onFocus={loadTeams}
                onChange={(e) => setHomeId(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Equipo Visitante</label>
              <select
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                value={awayId}
                onFocus={loadTeams}
                onChange={(e) => setAwayId(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={compare} disabled={!homeId || !awayId || homeId === awayId || loading}>
            {loading ? "Comparando..." : "Comparar"}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {result && (
        <div className="space-y-4">
          {/* ELO comparison */}
          <Card>
            <CardTitle className="mb-4">Comparativa ELO</CardTitle>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold">{result.home_team.name}</p>
                  <p className="text-3xl font-mono text-blue-400">{result.home_team.elo.toFixed(0)}</p>
                  <p className="text-xs text-slate-400">FIFA #{result.home_team.fifa_ranking ?? "—"}</p>
                </div>
                <div className="text-slate-500 font-bold text-xl">VS</div>
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold">{result.away_team.name}</p>
                  <p className="text-3xl font-mono text-blue-400">{result.away_team.elo.toFixed(0)}</p>
                  <p className="text-xs text-slate-400">FIFA #{result.away_team.fifa_ranking ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Head to head */}
          <Card>
            <CardTitle className="mb-4">Historial Directo</CardTitle>
            <CardContent>
              {result.head_to_head.matches === 0 ? (
                <p className="text-slate-400 text-sm">Sin enfrentamientos previos registrados</p>
              ) : (
                <div className="flex justify-around text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-400">{result.head_to_head.home_wins}</p>
                    <p className="text-xs text-slate-400">{result.home_team.name}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-400">{result.head_to_head.draws}</p>
                    <p className="text-xs text-slate-400">Empates</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{result.head_to_head.away_wins}</p>
                    <p className="text-xs text-slate-400">{result.away_team.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prediction */}
          {result.prediction && (
            <Card>
              <CardTitle className="mb-4">Predicción del Encuentro</CardTitle>
              <CardContent className="space-y-3">
                <div className="flex gap-3">
                  {[
                    { label: result.home_team.name, prob: result.prediction.home_win_prob, color: "bg-blue-500" },
                    { label: "Empate", prob: result.prediction.draw_prob, color: "bg-yellow-500" },
                    { label: result.away_team.name, prob: result.prediction.away_win_prob, color: "bg-red-500" },
                  ].map((item) => (
                    <div key={item.label} className="flex-1">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span className="truncate">{item.label}</span>
                        <span>{(item.prob * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${item.prob * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 text-sm text-slate-300 pt-1">
                  <span>Marcador más probable: <strong className="font-mono">{result.prediction.most_likely_score ?? "—"}</strong></span>
                  <Badge variant={(CONFIDENCE_COLOR[result.prediction.confidence ?? ""] as any) ?? "default"}>
                    {result.prediction.confidence ?? "—"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
