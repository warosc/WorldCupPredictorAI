"use client";

import type { Prediction } from "@/lib/api";

const CONFIDENCE_COLOR: Record<string, string> = {
  "Muy Alta": "text-green-400",
  "Alta": "text-lime-400",
  "Media": "text-yellow-400",
  "Baja": "text-red-400",
};

const REC_LABEL: Record<string, string> = { "1": "Local", "X": "Empate", "2": "Visitante" };

export default function PredictionsTable({ predictions }: { predictions: Prediction[] }) {
  if (!predictions.length) {
    return <p className="text-slate-400">No hay predicciones disponibles.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-800 text-slate-400">
          <tr>
            <th className="px-4 py-2 text-left">Local %</th>
            <th className="px-4 py-2 text-left">Empate %</th>
            <th className="px-4 py-2 text-left">Visitante %</th>
            <th className="px-4 py-2 text-left">Marcador</th>
            <th className="px-4 py-2 text-left">Confianza</th>
            <th className="px-4 py-2 text-left">Quiniela</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((p) => (
            <tr key={p.id} className="border-t border-slate-700 hover:bg-slate-800/50">
              <td className="px-4 py-3">{(p.home_win_prob * 100).toFixed(1)}%</td>
              <td className="px-4 py-3">{(p.draw_prob * 100).toFixed(1)}%</td>
              <td className="px-4 py-3">{(p.away_win_prob * 100).toFixed(1)}%</td>
              <td className="px-4 py-3 font-mono">{p.most_likely_score ?? "—"}</td>
              <td className={`px-4 py-3 font-medium ${CONFIDENCE_COLOR[p.confidence ?? ""] ?? ""}`}>
                {p.confidence ?? "—"}
              </td>
              <td className="px-4 py-3 font-bold text-blue-300">
                {REC_LABEL[p.quiniela_recommendation ?? ""] ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
