import { api } from "@/lib/api";
import AutoRefresh from "@/components/AutoRefresh";
import PrintButton from "@/components/PrintButton";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function fmt(iso: string) {
  const d = new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

const REC_STYLE = {
  "1": { label: "1", bg: "bg-blue-600",   text: "text-white",  ring: "ring-blue-400" },
  "X": { label: "X", bg: "bg-amber-500",  text: "text-black",  ring: "ring-amber-400" },
  "2": { label: "2", bg: "bg-rose-600",   text: "text-white",  ring: "ring-rose-400" },
} as const;

const CONF_COLOR: Record<string, string> = {
  "Muy Alta": "text-emerald-400",
  "Alta":     "text-blue-400",
  "Media":    "text-amber-400",
  "Baja":     "text-rose-400",
};

const STRATEGY_META = {
  conservative: {
    label: "Conservador",
    sub: "Máxima probabilidad",
    icon: "🛡",
    gradient: "from-blue-900/60 to-blue-950/60",
    border: "border-blue-500/50",
    accent: "text-blue-300",
    bar: "bg-blue-500",
  },
  balanced: {
    label: "Balanceado",
    sub: "Probabilidad + riesgo",
    icon: "⚖️",
    gradient: "from-amber-900/50 to-amber-950/60",
    border: "border-amber-500/50",
    accent: "text-amber-300",
    bar: "bg-amber-500",
  },
  aggressive: {
    label: "Agresivo",
    sub: "Busca sorpresas",
    icon: "🔥",
    gradient: "from-rose-900/50 to-rose-950/60",
    border: "border-rose-500/50",
    accent: "text-rose-300",
    bar: "bg-rose-500",
  },
} as const;

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

  const dateMap: Record<string, string> = {};
  const crestMap: Record<string, { home: string | null; away: string | null }> = {};
  for (const m of matches) {
    dateMap[m.match_id] = m.match_date;
    crestMap[m.match_id] = {
      home: m.home_team.crest_url,
      away: m.away_team.crest_url,
    };
  }

  if (!picks.length) {
    return (
      <div className="max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold">Mi Quiniela</h1>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-4">⚽</p>
          <p className="text-slate-300 text-lg font-medium">Sin predicciones disponibles</p>
          <p className="text-slate-500 text-sm mt-2">
            Ve al Dashboard y presiona "Actualizar Predicciones"
          </p>
        </div>
      </div>
    );
  }

  const allAgree = picks.filter((p, i) =>
    balanced?.picks[i]?.recommendation  === p.recommendation &&
    aggressive?.picks[i]?.recommendation === p.recommendation
  ).length;

  const strategies = [
    { key: "conservative" as const, data: conservative },
    { key: "balanced"     as const, data: balanced },
    { key: "aggressive"   as const, data: aggressive },
  ];

  return (
    <div className="max-w-5xl space-y-8" id="quiniela-print">
      <AutoRefresh intervalMs={300_000} />

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mi Quiniela · Mundial 2026</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Generada por ensemble ELO + Poisson + Monte Carlo + Bayesian · {picks.length} partidos
          </p>
        </div>
        <PrintButton />
      </div>

      {/* ── Strategy cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {strategies.map(({ key, data }) => {
          const meta = STRATEGY_META[key];
          const acc = ((data?.expected_accuracy ?? 0) * 100);
          const ones = data?.picks.filter(p => p.recommendation === "1").length ?? 0;
          const exes = data?.picks.filter(p => p.recommendation === "X").length ?? 0;
          const twos = data?.picks.filter(p => p.recommendation === "2").length ?? 0;
          const total = data?.picks.length ?? 1;

          return (
            <div key={key} className={`relative rounded-2xl border ${meta.border} bg-gradient-to-br ${meta.gradient} p-5 overflow-hidden`}>
              {/* Icon watermark */}
              <span className="absolute right-4 top-2 text-4xl opacity-20 select-none">{meta.icon}</span>

              <p className={`font-bold text-lg ${meta.accent}`}>{meta.label}</p>
              <p className="text-xs text-slate-400 mb-4">{meta.sub}</p>

              {/* Accuracy ring */}
              <div className="flex items-end gap-2 mb-4">
                <span className="text-4xl font-black text-white">{acc.toFixed(0)}%</span>
                <span className="text-xs text-slate-400 pb-1">precisión esperada</span>
              </div>

              {/* Pick breakdown bar */}
              <div className="space-y-1">
                <div className="flex h-2 rounded-full overflow-hidden gap-px">
                  <div className="bg-blue-500" style={{ width: `${ones/total*100}%` }} />
                  <div className="bg-amber-400" style={{ width: `${exes/total*100}%` }} />
                  <div className="bg-rose-500" style={{ width: `${twos/total*100}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span className="text-blue-400">{ones} locales</span>
                  <span className="text-amber-400">{exes} empates</span>
                  <span className="text-rose-400">{twos} visitantes</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Consensus note */}
      <div className="flex items-center gap-2 text-sm">
        <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">✓</span>
        <span className="text-slate-300">
          Las 3 estrategias coinciden en{" "}
          <span className="text-white font-bold">{allAgree}</span> de {picks.length} partidos
          <span className="text-slate-500 ml-2 text-xs">(filas marcadas en verde)</span>
        </span>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-xl" id="quiniela-table">
        {/* Table header */}
        <div className="bg-gradient-to-r from-blue-800 via-blue-900 to-slate-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚽</span>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">WorldCup Predictor AI — Quiniela 2026</h2>
              <p className="text-blue-300 text-xs">ELO · Poisson · Monte Carlo · Bayesian · XGBoost · LightGBM</p>
            </div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wide border-b border-slate-700">
              <th className="px-4 py-3 text-left w-8">#</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Local</th>
              <th className="px-4 py-3 text-left">Visitante</th>
              <th className="px-4 py-3 text-center w-20">
                <span className="text-blue-400">🛡 Cons.</span>
              </th>
              <th className="px-4 py-3 text-center w-20">
                <span className="text-amber-400">⚖️ Bal.</span>
              </th>
              <th className="px-4 py-3 text-center w-20">
                <span className="text-rose-400">🔥 Agr.</span>
              </th>
              <th className="px-4 py-3 text-center">Local%</th>
              <th className="px-4 py-3 text-center">Emp%</th>
              <th className="px-4 py-3 text-center">Vis%</th>
              <th className="px-4 py-3 text-center">Confianza</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {picks.map((pick, i) => {
              const bPick = balanced?.picks[i]?.recommendation;
              const aPick = aggressive?.picks[i]?.recommendation;
              const same  = pick.recommendation === bPick && bPick === aPick;
              const date  = dateMap[pick.match_id] ? fmt(dateMap[pick.match_id]) : "";
              const crests = crestMap[pick.match_id];

              return (
                <tr
                  key={pick.match_id}
                  className={`transition-colors ${
                    same
                      ? "bg-emerald-950/30 hover:bg-emerald-950/50"
                      : i % 2 === 0
                        ? "bg-slate-800/20 hover:bg-slate-800/40"
                        : "bg-slate-800/50 hover:bg-slate-800/70"
                  }`}
                >
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{date}</td>

                  {/* Home */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {crests?.home ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={crests.home} alt="" className="w-5 h-5 object-contain shrink-0" />
                      ) : (
                        <span className="w-5 h-5 bg-slate-700 rounded-full shrink-0" />
                      )}
                      <span className="font-medium text-slate-100">{pick.home_team}</span>
                    </div>
                  </td>

                  {/* Away */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {crests?.away ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={crests.away} alt="" className="w-5 h-5 object-contain shrink-0" />
                      ) : (
                        <span className="w-5 h-5 bg-slate-700 rounded-full shrink-0" />
                      )}
                      <span className="font-medium text-slate-100">{pick.away_team}</span>
                    </div>
                  </td>

                  {/* Picks */}
                  {[pick.recommendation, bPick ?? "1", aPick ?? "1"].map((rec, ri) => {
                    const s = REC_STYLE[rec as keyof typeof REC_STYLE] ?? REC_STYLE["1"];
                    return (
                      <td key={ri} className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black ${s.bg} ${s.text}`}>
                          {s.label}
                        </span>
                      </td>
                    );
                  })}

                  {/* Probabilities */}
                  <td className="px-4 py-3 text-center font-mono text-xs text-blue-300 font-semibold">
                    {(pick.home_win_prob * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-slate-400">
                    {(pick.draw_prob * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-rose-300">
                    {(pick.away_win_prob * 100).toFixed(0)}%
                  </td>

                  {/* Confidence */}
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold ${CONF_COLOR[pick.confidence] ?? "text-slate-400"}`}>
                      {pick.confidence}
                    </span>
                    {same && <span className="ml-1 text-emerald-400 text-xs">✓</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="bg-slate-800 border-t border-slate-700 text-xs text-slate-400">
              <td colSpan={4} className="px-4 py-3">
                Precisión esperada conservador:{" "}
                <strong className="text-white">{((conservative?.expected_accuracy ?? 0) * 100).toFixed(0)}%</strong>
              </td>
              <td colSpan={7} className="px-4 py-3 text-right text-slate-500">
                ✓ = Consenso de las 3 estrategias · worldcup.predictor.ai
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
