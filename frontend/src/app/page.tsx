import Link from "next/link";
import { api, type RichPrediction } from "@/lib/api";
import MatchCard from "@/components/MatchCard";
import RankingsWidget from "@/components/RankingsWidget";
import GenerateButton from "@/components/GenerateButton";

export default async function Dashboard() {
  const [richPreds, rankings, overview] = await Promise.allSettled([
    api.richPredictions("scheduled"),
    api.rankings(),
    api.worldcupOverview(),
  ]);

  const predictions: RichPrediction[] =
    richPreds.status === "fulfilled" ? richPreds.value : [];
  const rankingList =
    rankings.status === "fulfilled" ? rankings.value : [];
  const ov =
    overview.status === "fulfilled"
      ? overview.value
      : { total_matches: 0, matches_played: 0, matches_remaining: 0 };

  // Top 5 más predecibles para el hero
  const top5 = [...predictions]
    .filter((m) => m.prediction)
    .sort((a, b) => {
      const topA = Math.max(a.prediction!.home_win_prob, a.prediction!.draw_prob, a.prediction!.away_win_prob);
      const topB = Math.max(b.prediction!.home_win_prob, b.prediction!.draw_prob, b.prediction!.away_win_prob);
      return topB - topA;
    })
    .slice(0, 5);

  // Próximos 3 partidos por fecha
  const next3 = predictions.slice(0, 3);

  const kickoff = new Date("2026-06-11T00:00:00Z");
  const now = new Date();
  const daysLeft = Math.ceil((kickoff.getTime() - now.getTime()) / 86400000);
  const started = now >= kickoff;

  return (
    <div className="space-y-10 max-w-7xl mx-auto">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 via-blue-950 to-slate-900 border border-slate-700 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-blue-400 text-sm font-medium uppercase tracking-widest mb-1">
              FIFA World Cup 2026
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              WorldCup Predictor AI
            </h1>
            <p className="text-slate-300 mt-2 text-sm max-w-md">
              Predicciones probabilísticas con ELO + Poisson + Monte Carlo +
              Bayesian + ML Ensemble para las 84 quinielas del Mundial.
            </p>
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              {started ? (
                <span className="flex items-center gap-1.5 text-green-400 text-sm font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Torneo en curso
                </span>
              ) : (
                <span className="text-yellow-300 text-sm font-semibold">
                  ⏱ {daysLeft} días para el inicio · 11 Jun 2026
                </span>
              )}
              <span className="text-slate-400 text-sm">
                {ov.total_matches} partidos · {predictions.length} predicciones
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <GenerateButton />
            <Link
              href="/predicciones"
              className="text-center text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg transition-colors"
            >
              Ver todas las predicciones →
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-700/50 pt-5">
          {[
            { label: "Partidos totales", value: ov.total_matches },
            { label: "Jugados", value: ov.matches_played },
            { label: "Restantes", value: ov.matches_remaining },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-blue-400">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top 5 más predecibles ─────────────────────────────────── */}
      {top5.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-yellow-400 text-lg">★</span>
              Partidos más predecibles
            </h2>
            <Link href="/predicciones" className="text-sm text-blue-400 hover:text-blue-300">
              Ver los 10 →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {top5.map((m) => (
              <MatchCard key={m.match_id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* ── Próximos + Rankings ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Próximos partidos</h2>
            <Link href="/predicciones" className="text-sm text-blue-400 hover:text-blue-300">
              Ver todos →
            </Link>
          </div>
          {next3.length === 0 ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-400">
              <p className="text-lg mb-2">Sin predicciones disponibles</p>
              <p className="text-sm">Presiona "Actualizar Predicciones" para generarlas</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {next3.map((m) => (
                <MatchCard key={m.match_id} match={m} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Rankings ELO</h2>
            <Link href="/rankings" className="text-sm text-blue-400 hover:text-blue-300">
              Top 48 →
            </Link>
          </div>
          <RankingsWidget rankings={rankingList.slice(0, 10)} />
        </div>
      </div>

    </div>
  );
}
