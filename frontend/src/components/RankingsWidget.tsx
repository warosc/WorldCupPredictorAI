"use client";

import type { RankingEntry } from "@/lib/api";

export default function RankingsWidget({ rankings }: { rankings: RankingEntry[] }) {
  if (!rankings.length) {
    return <p className="text-slate-400">Sin datos de rankings.</p>;
  }

  return (
    <div className="space-y-2">
      {rankings.map((r) => (
        <div
          key={r.team_id}
          className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-2 border border-slate-700"
        >
          <span className="text-slate-500 w-6 text-right text-sm">{r.position}</span>
          <span className="flex-1 font-medium">{r.team_name}</span>
          <span className="text-blue-400 font-mono text-sm">{r.elo_rating.toFixed(0)}</span>
          <span className="text-xs text-slate-500">{r.tournament_points}pts</span>
        </div>
      ))}
    </div>
  );
}
