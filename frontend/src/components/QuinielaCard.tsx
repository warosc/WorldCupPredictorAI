"use client";

import type { QuinielaRec } from "@/lib/api";

const COLOR_MAP: Record<string, { border: string; badge: string }> = {
  blue: { border: "border-blue-500", badge: "bg-blue-500" },
  yellow: { border: "border-yellow-500", badge: "bg-yellow-500 text-black" },
  red: { border: "border-red-500", badge: "bg-red-500" },
};

export default function QuinielaCard({
  data,
  label,
  color,
}: {
  data: QuinielaRec | null;
  strategy: string;
  label: string;
  color: string;
}) {
  const colors = COLOR_MAP[color] ?? COLOR_MAP.blue;

  return (
    <div className={`bg-slate-800 rounded-xl border-2 ${colors.border} p-5 space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{label}</h3>
        {data && (
          <span className="text-xs text-slate-400">
            ~{(data.expected_accuracy * 100).toFixed(0)}% precisión
          </span>
        )}
      </div>

      {!data && <p className="text-slate-400 text-sm">Sin datos disponibles</p>}

      {data && (
        <div className="space-y-2">
          {data.picks.map((pick) => (
            <div
              key={pick.match_id}
              className="flex items-center justify-between text-sm border-b border-slate-700 pb-2"
            >
              <span className="text-slate-300 truncate max-w-[160px]">
                {pick.home_team} vs {pick.away_team}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors.badge}`}>
                {pick.recommendation}
              </span>
            </div>
          ))}
        </div>
      )}

      {data && (
        <p className="text-xs text-slate-500">{data.description}</p>
      )}
    </div>
  );
}
