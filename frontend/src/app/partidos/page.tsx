import { api } from "@/lib/api";

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-blue-900 text-blue-300",
  live: "bg-green-900 text-green-300",
  finished: "bg-slate-700 text-slate-400",
};

export default async function MatchesPage() {
  let matches = [];
  try {
    matches = await api.matches();
  } catch {
    // API might not be running during build
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Partidos</h1>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Fase</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-right">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id} className="border-t border-slate-700 hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  {new Date(m.match_date).toLocaleString("es-MX", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-4 py-3 text-slate-400">{m.stage ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_BADGE[m.status] ?? ""}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {m.home_goals !== null ? `${m.home_goals} - ${m.away_goals}` : "—"}
                </td>
              </tr>
            ))}
            {!matches.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Sin partidos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
