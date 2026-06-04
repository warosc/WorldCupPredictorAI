import { api, type RichPrediction } from "@/lib/api";
import MatchCard from "@/components/MatchCard";
import MatchFilters from "@/components/MatchFilters";

export default async function PrediccionesPage({
  searchParams,
}: {
  searchParams: Promise<{ conf?: string; grupo?: string }>;
}) {
  const params = await searchParams;
  let matches: RichPrediction[] = [];
  try {
    matches = await api.richPredictions("scheduled");
  } catch { /* API offline */ }

  // Server-side filter by confidence
  if (params.conf && params.conf !== "todas") {
    matches = matches.filter(
      (m) => m.prediction?.confidence?.toLowerCase() === params.conf
    );
  }

  // Server-side filter by stage/group
  if (params.grupo && params.grupo !== "todos") {
    matches = matches.filter((m) => m.stage === params.grupo);
  }

  // Top 10 most predictable = highest top probability
  const top10 = [...matches]
    .filter((m) => m.prediction)
    .sort((a, b) => {
      const topA = Math.max(a.prediction!.home_win_prob, a.prediction!.draw_prob, a.prediction!.away_win_prob);
      const topB = Math.max(b.prediction!.home_win_prob, b.prediction!.draw_prob, b.prediction!.away_win_prob);
      return topB - topA;
    })
    .slice(0, 10);

  // Group remaining by date
  const byDate = matches.reduce<Record<string, RichPrediction[]>>((acc, m) => {
    const day = m.match_date?.substring(0, 10) ?? "TBD";
    (acc[day] ??= []).push(m);
    return acc;
  }, {});

  const stages = [...new Set(matches.map((m) => m.stage).filter(Boolean))];

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Predicciones</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {matches.length} partidos · generadas por ensemble ELO + Poisson + Monte Carlo
          </p>
        </div>
        <MatchFilters stages={stages as string[]} />
      </div>

      {/* Top 10 más predecibles */}
      {!params.conf && !params.grupo && top10.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="text-yellow-400">★</span>
            Top 10 partidos más predecibles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {top10.map((m) => (
              <MatchCard key={m.match_id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Todos por fecha */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Todos los partidos</h2>
        {Object.keys(byDate).length === 0 && (
          <p className="text-slate-400">No hay partidos con predicciones.</p>
        )}
        {Object.entries(byDate).map(([date, dayMatches]) => (
          <div key={date} className="mb-8">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
              {(() => {
                const d = new Date(date + "T12:00:00Z");
                const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
                const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
                return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
              })()}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dayMatches.map((m) => (
                <MatchCard key={m.match_id} match={m} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
