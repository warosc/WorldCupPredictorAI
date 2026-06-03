"use client";

interface Overview {
  total_matches: number;
  matches_played: number;
  matches_remaining: number;
}

export default function OverviewCards({ overview }: { overview: Overview | null }) {
  const cards = [
    { label: "Partidos Totales", value: overview?.total_matches ?? "—" },
    { label: "Jugados", value: overview?.matches_played ?? "—" },
    { label: "Restantes", value: overview?.matches_remaining ?? "—" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-sm text-slate-400">{c.label}</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
