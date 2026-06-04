import { api } from "@/lib/api";
import AutoRefresh from "@/components/AutoRefresh";
import PrintButton from "@/components/PrintButton";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function fmt(iso: string) {
  const d = new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

const REC: Record<string, { label: string; bg: string; text: string }> = {
  "1": { label: "1",  bg: "bg-blue-600",   text: "text-white" },
  "X": { label: "X",  bg: "bg-yellow-500", text: "text-black" },
  "2": { label: "2",  bg: "bg-red-600",    text: "text-white" },
};

const CONF_COLOR: Record<string, string> = {
  "Muy Alta": "text-green-400", "Alta": "text-blue-400",
  "Media": "text-yellow-400",   "Baja": "text-red-400",
};

export default async function MiQuinielaPage() {
  const [cons, bal, agg, richPreds] = await Promise.allSettled([
    api.quiniela("conservative"),
    api.quiniela("balanced"),
    api.quiniela("aggressive"),
    api.richPredictions("scheduled"),
  ]);

  const conservative = cons.status === "fulfilled" ? cons.value : null;
  const balanced     = bal.status  === "fulfilled" ? bal.value  : null;
  const aggressive   = agg.status  === "fulfilled" ? agg.value  : null;
  const matches      = richPreds.status === "fulfilled" ? richPreds.value : [];

  const picks = conservative?.picks ?? [];

  // Build date map from rich predictions
  const dateMap: Record<string, string> = {};
  for (const m of matches) {
    dateMap[m.match_id] = m.match_date;
  }

  if (!picks.length) {
    return (
      <div className="max-w-4xl space-y-4">
        <h1 className="text-3xl font-bold">Mi Quiniela</h1>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-400">No hay predicciones disponibles.</p>
          <p className="text-slate-500 text-sm mt-2">Presiona "Actualizar Predicciones" en el dashboard.</p>
        </div>
      </div>
    );
  }

  const accuracy = {
    conservative: ((conservative?.expected_accuracy ?? 0) * 100).toFixed(0),
    balanced:     ((balanced?.expected_accuracy     ?? 0) * 100).toFixed(0),
    aggressive:   ((aggressive?.expected_accuracy   ?? 0) * 100).toFixed(0),
  };

  // Count how many picks agree across all 3 strategies
  const allAgree = picks.filter((p, i) =>
    balanced?.picks[i]?.recommendation  === p.recommendation &&
    aggressive?.picks[i]?.recommendation === p.recommendation
  ).length;

  return (
    <div className="max-w-5xl space-y-6" id="quiniela-print">
      <AutoRefresh intervalMs={300_000} />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mi Quiniela · Mundial 2026</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Generada automáticamente por ensemble ELO + Poisson + Monte Carlo · {picks.length} partidos
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Strategy summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: "conservative", label: "Conservador", desc: "Máxima probabilidad", acc: accuracy.conservative, color: "border-blue-500" },
          { key: "balanced",     label: "Balanceado",  desc: "Prob. + riesgo calc.",  acc: accuracy.balanced,     color: "border-yellow-500" },
          { key: "aggressive",   label: "Agresivo",    desc: "Busca sorpresas",       acc: accuracy.aggressive,   color: "border-red-500" },
        ].map((s) => (
          <div key={s.key} className={`bg-slate-800 border-l-4 ${s.color} rounded-xl p-4`}>
            <p className="font-bold">{s.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
            <p className="text-2xl font-bold text-blue-400 mt-2">{s.acc}%</p>
            <p className="text-xs text-slate-500">precisión esperada</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-400">
        ✓ Las 3 estrategias coinciden en <span className="text-white font-semibold">{allAgree}</span> de {picks.length} partidos
      </p>

      {/* Full quiniela table */}
      <div className="bg-white text-black rounded-xl overflow-hidden border border-slate-200 print:border-0">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-6 py-4">
          <h2 className="text-lg font-bold">⚽ WorldCup Predictor AI — Quiniela 2026</h2>
          <p className="text-blue-200 text-xs mt-0.5">
            Ensemble: ELO · Poisson · Monte Carlo · Bayesian · XGBoost · LightGBM
          </p>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left w-6">#</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Local</th>
              <th className="px-3 py-2 text-left">Visitante</th>
              <th className="px-3 py-2 text-center">Conservador</th>
              <th className="px-3 py-2 text-center">Balanceado</th>
              <th className="px-3 py-2 text-center">Agresivo</th>
              <th className="px-3 py-2 text-center">Local %</th>
              <th className="px-3 py-2 text-center">Empate %</th>
              <th className="px-3 py-2 text-center">Visita %</th>
              <th className="px-3 py-2 text-center">Confianza</th>
            </tr>
          </thead>
          <tbody>
            {picks.map((pick, i) => {
              const bPick = balanced?.picks[i]?.recommendation;
              const aPick = aggressive?.picks[i]?.recommendation;
              const same = pick.recommendation === bPick && bPick === aPick;
              const date = dateMap[pick.match_id] ? fmt(dateMap[pick.match_id]) : "";

              return (
                <tr key={pick.match_id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-3 py-2 text-slate-400 font-mono text-xs">{i + 1}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">{date}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{pick.home_team}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{pick.away_team}</td>
                  {[pick.recommendation, bPick, aPick].map((rec, ri) => {
                    const r = REC[rec ?? "1"];
                    return (
                      <td key={ri} className="px-3 py-2 text-center">
                        <span className={`inline-block w-7 h-7 rounded text-xs font-bold leading-7 ${r.bg} ${r.text}`}>
                          {r.label}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-mono text-xs text-slate-600">
                    {(pick.home_win_prob * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-xs text-slate-600">
                    {(pick.draw_prob * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-xs text-slate-600">
                    {(pick.away_win_prob * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-medium ${CONF_COLOR[pick.confidence] ?? ""}`}>
                      {pick.confidence}
                    </span>
                    {same && <span className="ml-1 text-green-600 font-bold">✓</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 text-slate-500 text-xs">
            <tr>
              <td colSpan={4} className="px-3 py-2">
                Precisión esperada (conservador): <strong>{accuracy.conservative}%</strong>
              </td>
              <td colSpan={7} className="px-3 py-2 text-right">
                ✓ = Las 3 estrategias coinciden · worldcup.predictor.ai
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}
