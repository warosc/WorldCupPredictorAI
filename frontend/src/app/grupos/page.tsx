import { api } from "@/lib/api";

const API = process.env.INTERNAL_API_URL || "http://api:8000";

interface TeamStanding {
  team_id: string;
  team_name: string;
  team_code: string;
  crest_url: string | null;
  elo_rating: number;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  gd: number;
  points: number;
}

interface StandingsData {
  groups: Record<string, TeamStanding[]>;
  total_teams: number;
}

async function getStandings(): Promise<StandingsData | null> {
  try {
    const res = await fetch(`${API}/worldcup/standings`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

function GroupTable({ label, teams }: { label: string; teams: TeamStanding[] }) {
  const hasResults = teams.some((t) => t.played > 0);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="bg-slate-700/50 px-4 py-2.5 flex items-center justify-between">
        <h3 className="font-bold text-blue-300 tracking-wide">
          Grupo {label.replace("GROUP_", "")}
        </h3>
        {!hasResults && (
          <span className="text-xs text-slate-500">Sin partidos jugados</span>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-400 border-b border-slate-700">
            <th className="px-3 py-1.5 text-left w-6">#</th>
            <th className="px-3 py-1.5 text-left">Equipo</th>
            <th className="px-3 py-1.5 text-center w-8">PJ</th>
            <th className="px-3 py-1.5 text-center w-8">G</th>
            <th className="px-3 py-1.5 text-center w-8">E</th>
            <th className="px-3 py-1.5 text-center w-8">P</th>
            <th className="px-3 py-1.5 text-center w-12">GF/GC</th>
            <th className="px-3 py-1.5 text-center w-8">DG</th>
            <th className="px-3 py-1.5 text-center w-10 font-bold text-slate-200">Pts</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr
              key={t.team_id}
              className={`border-t border-slate-700/50 ${
                i < 2 ? "bg-blue-950/30" : ""
              }`}
            >
              <td className="px-3 py-2 text-slate-400 text-xs">{t.position}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  {t.crest_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.crest_url} alt={t.team_name} className="w-5 h-5 object-contain" />
                  ) : (
                    <span className="w-5 h-5 bg-slate-600 rounded-full flex items-center justify-center text-xs">{t.team_code.slice(0,2)}</span>
                  )}
                  <span className="font-medium">{t.team_name}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-center text-slate-300">{t.played}</td>
              <td className="px-3 py-2 text-center text-green-400">{t.won}</td>
              <td className="px-3 py-2 text-center text-yellow-400">{t.drawn}</td>
              <td className="px-3 py-2 text-center text-red-400">{t.lost}</td>
              <td className="px-3 py-2 text-center text-slate-400 text-xs">{t.goals_for}/{t.goals_against}</td>
              <td className={`px-3 py-2 text-center text-xs font-mono ${t.gd > 0 ? "text-green-400" : t.gd < 0 ? "text-red-400" : "text-slate-400"}`}>
                {t.gd > 0 ? "+" : ""}{t.gd}
              </td>
              <td className="px-3 py-2 text-center font-bold text-white">{t.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-1.5 border-t border-slate-700/50">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-950/60 border border-blue-800 rounded-sm inline-block" />
          Clasifican a octavos de final (top 2)
        </span>
      </div>
    </div>
  );
}

export default async function GruposPage() {
  const data = await getStandings();

  const sortedGroups = data
    ? Object.entries(data.groups).sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold">Tabla de Grupos</h1>
        <p className="text-slate-400 mt-1 text-sm">
          {data?.total_teams ?? 0} equipos · Los top 2 de cada grupo clasifican a octavos
        </p>
      </div>

      {sortedGroups.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-400">Los grupos se mostrarán cuando el torneo comience el 11 de junio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sortedGroups.map(([label, teams]) => (
            <GroupTable key={label} label={label} teams={teams} />
          ))}
        </div>
      )}
    </div>
  );
}
