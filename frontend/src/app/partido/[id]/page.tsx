import { notFound } from "next/navigation";
import MonteCarloHeatmap from "@/components/MonteCarloHeatmap";

const API = process.env.INTERNAL_API_URL || "http://api:8000";

async function getMatchDetail(id: string) {
  try {
    const [richRes, simRes] = await Promise.allSettled([
      fetch(`${API}/predictions/rich`, { cache: "no-store" }),
      fetch(`${API}/simulations/match/${id}`, { cache: "no-store" }),
    ]);
    const allMatches = richRes.status === "fulfilled" && richRes.value.ok
      ? await richRes.value.json() : [];
    const sim = simRes.status === "fulfilled" && simRes.value.ok
      ? await simRes.value.json() : null;
    const match = allMatches.find((m: any) => m.match_id === id);
    return { match, sim };
  } catch { return { match: null, sim: null }; }
}

function Bar({ label, prob, color }: { label: string; prob: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-bold font-mono text-white">{(prob * 100).toFixed(1)}%</span>
      </div>
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${prob * 100}%` }} />
      </div>
    </div>
  );
}

export default async function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { match, sim } = await getMatchDetail(id);

  if (!match) notFound();

  const p = match.prediction;
  const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const d = new Date(match.match_date + (match.match_date.endsWith("Z") ? "" : "Z"));
  const dateStr = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const timeStr = `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")} UTC`;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <p className="text-xs text-slate-400 mb-4">{match.stage} · {dateStr} · {timeStr}</p>

        <div className="flex items-center gap-6">
          <div className="flex-1 text-center space-y-2">
            {match.home_team.crest_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.home_team.crest_url} alt={match.home_team.name} className="w-16 h-16 object-contain mx-auto" />
            )}
            <p className="font-bold text-lg">{match.home_team.name}</p>
            <p className="text-xs text-slate-400">ELO {match.home_team.elo_rating?.toFixed(0)}</p>
            {match.home_team.fifa_ranking && (
              <p className="text-xs text-slate-500">FIFA #{match.home_team.fifa_ranking}</p>
            )}
          </div>

          <div className="text-center px-4">
            {match.status === "finished" ? (
              <p className="text-4xl font-bold font-mono">{match.home_goals} - {match.away_goals}</p>
            ) : match.status === "live" ? (
              <div className="space-y-1">
                <p className="text-4xl font-bold font-mono">{match.home_goals ?? 0} - {match.away_goals ?? 0}</p>
                <span className="flex items-center gap-1 justify-center text-green-400 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />EN VIVO
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-slate-500 font-bold text-xl">VS</p>
                {p && <p className="text-slate-400 text-sm font-mono">{p.most_likely_score}</p>}
              </div>
            )}
          </div>

          <div className="flex-1 text-center space-y-2">
            {match.away_team.crest_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.away_team.crest_url} alt={match.away_team.name} className="w-16 h-16 object-contain mx-auto" />
            )}
            <p className="font-bold text-lg">{match.away_team.name}</p>
            <p className="text-xs text-slate-400">ELO {match.away_team.elo_rating?.toFixed(0)}</p>
            {match.away_team.fifa_ranking && (
              <p className="text-xs text-slate-500">FIFA #{match.away_team.fifa_ranking}</p>
            )}
          </div>
        </div>
      </div>

      {/* Prediction breakdown */}
      {p && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
          <h2 className="font-semibold">Predicción del modelo</h2>
          <Bar label={`${match.home_team.name} gana`} prob={p.home_win_prob} color="bg-blue-500" />
          <Bar label="Empate" prob={p.draw_prob} color="bg-slate-400" />
          <Bar label={`${match.away_team.name} gana`} prob={p.away_win_prob} color="bg-red-500" />

          <div className="flex items-center gap-4 pt-2 border-t border-slate-700 flex-wrap">
            <div>
              <p className="text-xs text-slate-400">Marcador probable</p>
              <p className="text-xl font-bold font-mono">{p.most_likely_score}</p>
              {p.score_probability && (
                <p className="text-xs text-slate-400">{(p.score_probability*100).toFixed(1)}% de prob.</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400">Confianza</p>
              <p className={`font-bold ${
                p.confidence === "Muy Alta" ? "text-green-400" :
                p.confidence === "Alta" ? "text-blue-400" :
                p.confidence === "Media" ? "text-yellow-400" : "text-red-400"
              }`}>{p.confidence}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Quiniela</p>
              <p className="font-bold text-white">{
                p.quiniela_recommendation === "1" ? `Local (${match.home_team.name})` :
                p.quiniela_recommendation === "X" ? "Empate" :
                `Visitante (${match.away_team.name})`
              }</p>
            </div>
          </div>
        </div>
      )}

      {/* Monte Carlo heatmap */}
      {sim && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Simulación Monte Carlo</h2>
            <span className="text-xs text-slate-400">{sim.num_simulations?.toLocaleString()} simulaciones</span>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{((sim.home_win_count/sim.num_simulations)*100).toFixed(1)}%</p>
              <p className="text-xs text-slate-400">{match.home_team.name}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-300">{((sim.draw_count/sim.num_simulations)*100).toFixed(1)}%</p>
              <p className="text-xs text-slate-400">Empate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{((sim.away_win_count/sim.num_simulations)*100).toFixed(1)}%</p>
              <p className="text-xs text-slate-400">{match.away_team.name}</p>
            </div>
          </div>
          {sim.score_distribution && (
            <MonteCarloHeatmap
              scoreDistribution={sim.score_distribution}
              homeTeam={match.home_team.name}
              awayTeam={match.away_team.name}
            />
          )}
        </div>
      )}
    </div>
  );
}
