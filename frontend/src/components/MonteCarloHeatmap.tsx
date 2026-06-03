"use client";

import { useMemo } from "react";

interface HeatmapProps {
  scoreDistribution: Record<string, number>;
  homeTeam: string;
  awayTeam: string;
}

const MAX_GOALS = 5;

function getColor(prob: number, max: number): string {
  const intensity = max > 0 ? prob / max : 0;
  const r = Math.round(30 + intensity * 200);
  const g = Math.round(100 - intensity * 60);
  const b = Math.round(200 - intensity * 160);
  return `rgb(${r},${g},${b})`;
}

export default function MonteCarloHeatmap({ scoreDistribution, homeTeam, awayTeam }: HeatmapProps) {
  const matrix = useMemo(() => {
    const m: number[][] = Array.from({ length: MAX_GOALS + 1 }, () =>
      new Array(MAX_GOALS + 1).fill(0)
    );
    for (const [score, prob] of Object.entries(scoreDistribution)) {
      const [h, a] = score.split("-").map(Number);
      if (h <= MAX_GOALS && a <= MAX_GOALS) {
        m[h][a] = prob;
      }
    }
    return m;
  }, [scoreDistribution]);

  const maxProb = useMemo(
    () => Math.max(...Object.values(scoreDistribution)),
    [scoreDistribution]
  );

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-slate-400 mb-3">
        Goles <span className="text-blue-300">{homeTeam}</span> (filas) vs{" "}
        <span className="text-red-300">{awayTeam}</span> (columnas)
      </p>
      <table className="border-collapse text-xs font-mono">
        <thead>
          <tr>
            <th className="p-1 text-slate-500 w-8" />
            {Array.from({ length: MAX_GOALS + 1 }, (_, i) => (
              <th key={i} className="p-1 text-red-300 w-12 text-center">{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, h) => (
            <tr key={h}>
              <td className="p-1 text-blue-300 text-center font-bold">{h}</td>
              {row.map((prob, a) => (
                <td
                  key={a}
                  className="p-1 text-center rounded"
                  style={{
                    backgroundColor: getColor(prob, maxProb),
                    color: prob > maxProb * 0.5 ? "#fff" : "#94a3b8",
                  }}
                  title={`${h}-${a}: ${(prob * 100).toFixed(2)}%`}
                >
                  {(prob * 100).toFixed(1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <div className="w-16 h-2 rounded" style={{ background: "linear-gradient(to right, rgb(30,100,200), rgb(230,40,40))" }} />
        <span>Menor → Mayor probabilidad</span>
      </div>
    </div>
  );
}
