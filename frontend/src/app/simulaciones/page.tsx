import { api } from "@/lib/api";
import MonteCarloHeatmap from "@/components/MonteCarloHeatmap";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export default async function SimulacionesPage() {
  let matches: Awaited<ReturnType<typeof api.matches>> = [];
  try {
    matches = await api.matches("scheduled");
  } catch { /* API offline */ }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Simulaciones Monte Carlo</h1>
      <p className="text-slate-400">100,000 simulaciones por partido — distribución de marcadores más probables.</p>

      {matches.length === 0 && (
        <p className="text-slate-500">Sin partidos programados con simulaciones disponibles.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {matches.slice(0, 6).map((match) => (
          <SimulationCard key={match.id} matchId={match.id} homeId={match.home_team_id} awayId={match.away_team_id} />
        ))}
      </div>
    </div>
  );
}

async function SimulationCard({
  matchId, homeId, awayId,
}: {
  matchId: string;
  homeId: string;
  awayId: string;
}) {
  let sim: Awaited<ReturnType<typeof api.simulation>> | null = null;
  let homeTeam = "Local";
  let awayTeam = "Visitante";

  try {
    sim = await api.simulation(matchId);
    const teams = await api.teams();
    homeTeam = teams.find((t) => t.id === homeId)?.name ?? "Local";
    awayTeam = teams.find((t) => t.id === awayId)?.name ?? "Visitante";
  } catch { /* no simulation yet */ }

  if (!sim) {
    return (
      <Card>
        <CardTitle className="mb-2">{homeTeam} vs {awayTeam}</CardTitle>
        <CardContent>
          <p className="text-slate-500 text-sm">Simulación pendiente de ejecución.</p>
        </CardContent>
      </Card>
    );
  }

  const total = sim.num_simulations;
  return (
    <Card>
      <CardTitle className="mb-1">{homeTeam} vs {awayTeam}</CardTitle>
      <CardContent className="space-y-4">
        <div className="flex gap-4 text-sm">
          <div className="flex-1 text-center">
            <p className="text-slate-400">Local</p>
            <p className="text-xl font-bold text-blue-400">
              {((sim.home_win_count / total) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-slate-400">Empate</p>
            <p className="text-xl font-bold text-yellow-400">
              {((sim.draw_count / total) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-slate-400">Visitante</p>
            <p className="text-xl font-bold text-red-400">
              {((sim.away_win_count / total) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <MonteCarloHeatmap
          scoreDistribution={sim.score_distribution ?? {}}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      </CardContent>
    </Card>
  );
}
