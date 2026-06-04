"use client";

import { useRouter, useSearchParams } from "next/navigation";

const CONF_OPTIONS = [
  { value: "todas", label: "Todas" },
  { value: "muy alta", label: "★ Muy Alta" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Fase de Grupos",
  LAST_16: "Octavos",
  QUARTER_FINALS: "Cuartos",
  SEMI_FINALS: "Semifinal",
  FINAL: "Final",
};

export default function MatchFilters({ stages }: { stages: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value === "todas" || value === "todos") sp.delete(key);
    else sp.set(key, value);
    router.push(`/predicciones?${sp.toString()}`);
  }

  const currentConf = params.get("conf") ?? "todas";
  const currentGrupo = params.get("grupo") ?? "todos";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Confianza:</span>
        <div className="flex gap-1">
          {CONF_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => update("conf", o.value)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                currentConf === o.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {stages.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Fase:</span>
          <select
            className="text-xs bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200"
            value={currentGrupo}
            onChange={(e) => update("grupo", e.target.value)}
          >
            <option value="todos">Todos</option>
            {stages.map((s) => (
              <option key={s} value={s}>{STAGE_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
