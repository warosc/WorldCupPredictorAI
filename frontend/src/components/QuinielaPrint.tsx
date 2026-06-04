"use client";

import type { QuinielaRec } from "@/lib/api";

const REC_MAP: Record<string, string> = { "1": "1", "X": "X", "2": "2" };

export default function QuinielaPrint({
  conservative, balanced, aggressive,
}: {
  conservative: QuinielaRec | null;
  balanced: QuinielaRec | null;
  aggressive: QuinielaRec | null;
}) {
  const picks = conservative?.picks ?? [];
  if (!picks.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tabla de Quiniela</h2>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          🖨 Imprimir / Guardar PDF
        </button>
      </div>

      {/* Printable table */}
      <div
        id="quiniela-print"
        className="bg-white text-black rounded-xl overflow-hidden border border-slate-200 print:shadow-none"
      >
        <div className="bg-blue-700 text-white px-6 py-4 print:bg-blue-700">
          <h3 className="text-lg font-bold">WorldCup Predictor AI — Quiniela 2026</h3>
          <p className="text-blue-200 text-sm">Generada por ensemble ELO + Poisson + Monte Carlo</p>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left w-8">#</th>
              <th className="px-4 py-2 text-left">Local</th>
              <th className="px-4 py-2 text-left">Visitante</th>
              <th className="px-4 py-2 text-center">Conservador</th>
              <th className="px-4 py-2 text-center">Balanceado</th>
              <th className="px-4 py-2 text-center">Agresivo</th>
              <th className="px-4 py-2 text-center">Local %</th>
              <th className="px-4 py-2 text-center">Empate %</th>
              <th className="px-4 py-2 text-center">Visit %</th>
              <th className="px-4 py-2 text-center">Confianza</th>
            </tr>
          </thead>
          <tbody>
            {picks.map((pick, i) => {
              const balPick  = balanced?.picks[i]?.recommendation;
              const aggPick  = aggressive?.picks[i]?.recommendation;
              const allSame  = pick.recommendation === balPick && balPick === aggPick;
              return (
                <tr key={pick.match_id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-4 py-2 text-slate-400 font-mono">{i + 1}</td>
                  <td className="px-4 py-2 font-medium">{pick.home_team}</td>
                  <td className="px-4 py-2 font-medium">{pick.away_team}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                      pick.recommendation === "1" ? "bg-blue-100 text-blue-700" :
                      pick.recommendation === "X" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>{REC_MAP[pick.recommendation]}</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {balPick && <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                      balPick === "1" ? "bg-blue-100 text-blue-700" :
                      balPick === "X" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>{REC_MAP[balPick]}</span>}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {aggPick && <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                      aggPick === "1" ? "bg-blue-100 text-blue-700" :
                      aggPick === "X" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>{REC_MAP[aggPick]}</span>}
                  </td>
                  <td className="px-4 py-2 text-center font-mono text-xs">{(pick.home_win_prob*100).toFixed(0)}%</td>
                  <td className="px-4 py-2 text-center font-mono text-xs">{(pick.draw_prob*100).toFixed(0)}%</td>
                  <td className="px-4 py-2 text-center font-mono text-xs">{(pick.away_win_prob*100).toFixed(0)}%</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      pick.confidence === "Muy Alta" ? "bg-green-100 text-green-700" :
                      pick.confidence === "Alta"     ? "bg-blue-100 text-blue-700" :
                      pick.confidence === "Media"    ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>{pick.confidence}</span>
                    {allSame && <span className="ml-1 text-green-600 text-xs font-bold">✓</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 text-slate-600">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-xs">
                Precisión esperada: <strong>{((conservative?.expected_accuracy ?? 0)*100).toFixed(0)}%</strong> conservador
              </td>
              <td colSpan={6} className="px-4 py-2 text-xs text-right text-slate-400">
                ✓ = Las 3 estrategias coinciden
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <style jsx global>{`
        @media print {
          body > *:not(#quiniela-print) { display: none !important; }
          nav, header, button { display: none !important; }
          #quiniela-print { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
