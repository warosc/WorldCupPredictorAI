import { api } from "@/lib/api";

export default async function RankingsPage() {
  let rankings = [];
  try {
    rankings = await api.rankings();
  } catch {
    // API might not be running during build
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Rankings ELO</h1>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Selección</th>
              <th className="px-4 py-2 text-right">ELO</th>
              <th className="px-4 py-2 text-right">FIFA</th>
              <th className="px-4 py-2 text-right">Puntos</th>
              <th className="px-4 py-2 text-right">PJ</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r) => (
              <tr key={r.team_id} className="border-t border-slate-700 hover:bg-slate-800/50">
                <td className="px-4 py-3 text-slate-400">{r.position}</td>
                <td className="px-4 py-3 font-medium">{r.team_name}</td>
                <td className="px-4 py-3 text-right text-blue-400 font-mono">{r.elo_rating.toFixed(0)}</td>
                <td className="px-4 py-3 text-right text-slate-400">{r.fifa_ranking ?? "—"}</td>
                <td className="px-4 py-3 text-right">{r.tournament_points}</td>
                <td className="px-4 py-3 text-right text-slate-400">{r.matches_played}</td>
              </tr>
            ))}
            {!rankings.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Sin datos de rankings
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
