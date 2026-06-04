"use client";

import { useState, useEffect } from "react";
import type { RichPrediction } from "@/lib/api";

type Pick = "1" | "X" | "2" | null;

const PICK_LABELS: Record<string, string> = { "1": "Local", "X": "Empate", "2": "Visitante" };
const PICK_COLORS: Record<string, string> = {
  "1": "bg-blue-600 border-blue-500 text-white",
  "X": "bg-yellow-600 border-yellow-500 text-white",
  "2": "bg-red-600 border-red-500 text-white",
};
const PICK_IDLE = "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600";

const STORAGE_KEY = "quiniesys_my_picks";

function ConfBadge({ conf }: { conf: string | null }) {
  const colors: Record<string, string> = {
    "Muy Alta": "text-green-400", "Alta": "text-blue-400",
    "Media": "text-yellow-400", "Baja": "text-red-400",
  };
  return <span className={`text-xs ${colors[conf ?? ""] ?? "text-slate-400"}`}>{conf ?? "?"}</span>;
}

export default function MiQuinielaForm({ matches }: { matches: RichPrediction[] }) {
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPicks(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  function setPick(matchId: string, pick: Pick) {
    setPicks((prev) => ({ ...prev, [matchId]: prev[matchId] === pick ? null : pick }));
    setSaved(false);
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function clear() {
    setPicks({});
    localStorage.removeItem(STORAGE_KEY);
  }

  const filled = Object.values(picks).filter(Boolean).length;
  const total = matches.filter((m) => m.prediction).length;

  // Score: how many of my picks match the model
  const matching = matches.filter(
    (m) => picks[m.match_id] && picks[m.match_id] === m.prediction?.quiniela_recommendation
  ).length;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Progreso: {filled}/{total} partidos</span>
          <div className="flex gap-2">
            {filled > 0 && (
              <span className="text-sm text-blue-400">
                Coincides con el modelo en {matching}/{filled} ({filled > 0 ? Math.round(matching/filled*100) : 0}%)
              </span>
            )}
          </div>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${total > 0 ? filled/total*100 : 0}%` }} />
        </div>
      </div>

      {/* Match rows */}
      <div className="space-y-2">
        {matches.filter((m) => m.prediction).map((m) => {
          const p = m.prediction!;
          const myPick = picks[m.match_id];
          const modelPick = p.quiniela_recommendation;
          const agree = myPick && myPick === modelPick;

          return (
            <div key={m.match_id} className={`bg-slate-800 rounded-lg border px-4 py-3 flex items-center gap-3 ${
              myPick ? "border-slate-600" : "border-slate-700"
            }`}>
              {/* Teams */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {m.home_team.crest_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.home_team.crest_url} alt="" className="w-4 h-4 object-contain" />
                  )}
                  <span className="text-sm font-medium truncate">{m.home_team.name}</span>
                  <span className="text-slate-500 text-xs shrink-0">vs</span>
                  {m.away_team.crest_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.away_team.crest_url} alt="" className="w-4 h-4 object-contain" />
                  )}
                  <span className="text-sm font-medium truncate">{m.away_team.name}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-500">
                    {(p.home_win_prob*100).toFixed(0)}% · {(p.draw_prob*100).toFixed(0)}% · {(p.away_win_prob*100).toFixed(0)}%
                  </span>
                  <ConfBadge conf={p.confidence} />
                  <span className="text-xs text-slate-500">
                    Modelo: <span className="text-slate-300 font-medium">{PICK_LABELS[modelPick ?? ""] ?? "?"}</span>
                  </span>
                </div>
              </div>

              {/* My picks */}
              <div className="flex gap-1.5 shrink-0">
                {(["1","X","2"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setPick(m.match_id, opt)}
                    className={`w-10 h-8 rounded text-xs font-bold border transition-all ${
                      myPick === opt ? PICK_COLORS[opt] : PICK_IDLE
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Match/disagree indicator */}
              {myPick && (
                <span className="shrink-0 text-sm">
                  {agree ? "✅" : "⚡"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 flex gap-3 justify-end">
        <button
          onClick={clear}
          className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Limpiar
        </button>
        <button
          onClick={save}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${
            saved ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          {saved ? "✓ Guardado" : "Guardar mi quiniela"}
        </button>
      </div>
    </div>
  );
}
