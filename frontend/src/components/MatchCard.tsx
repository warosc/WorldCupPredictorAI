"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { RichPrediction } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONF = {
  "Muy Alta": { border: "border-emerald-500", glow: "shadow-emerald-900/40", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  "Alta":     { border: "border-blue-500",    glow: "shadow-blue-900/40",    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  "Media":    { border: "border-amber-500",   glow: "shadow-amber-900/30",   badge: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  "Baja":     { border: "border-red-500",     glow: "shadow-red-900/30",     badge: "bg-red-500/15 text-red-300 border-red-500/30" },
} as const;

const REC = {
  "1": { label: "LOCAL",    bg: "bg-blue-600 text-white" },
  "X": { label: "EMPATE",   bg: "bg-amber-500 text-black" },
  "2": { label: "VISITANTE", bg: "bg-rose-600 text-white" },
} as const;

const GROUP: Record<string, string> = {
  GROUP_A: "Grupo A", GROUP_B: "Grupo B", GROUP_C: "Grupo C", GROUP_D: "Grupo D",
  GROUP_E: "Grupo E", GROUP_F: "Grupo F", GROUP_G: "Grupo G", GROUP_H: "Grupo H",
  GROUP_I: "Grupo I", GROUP_J: "Grupo J", GROUP_K: "Grupo K", GROUP_L: "Grupo L",
  GROUP_STAGE: "Fase de Grupos", LAST_16: "Octavos", QUARTER_FINALS: "Cuartos",
  SEMI_FINALS: "Semifinal", THIRD_PLACE: "3er Puesto", FINAL: "FINAL ⭐",
};

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(iso: string) {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return {
    label: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")} UTC`,
    ms: d.getTime(),
  };
}

// ─── Countdown (client-only to avoid hydration mismatch) ──────────────────────

function Countdown({ ms }: { ms: number }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      const h = (ms - Date.now()) / 3_600_000;
      if (h <= 0)      setText(null);
      else if (h < 1)  setText(`${Math.round(h * 60)}min`);
      else if (h < 24) setText(`${Math.floor(h)}h ${Math.round((h % 1) * 60)}min`);
      else             setText(`${Math.ceil(h / 24)} días`);
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [ms]);

  if (!text) return null;
  return (
    <span className="flex items-center gap-1 text-amber-400 text-xs font-medium">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      {text}
    </span>
  );
}

// ─── Crest ────────────────────────────────────────────────────────────────────

function Crest({ url, name, code, size = 40 }: { url: string | null; name: string; code: string; size?: number }) {
  const [err, setErr] = useState(false);

  if (url && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} width={size} height={size}
        className="object-contain drop-shadow-sm"
        onError={() => setErr(true)} />
    );
  }
  // Fallback: colored circle with 2-letter code
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.3 }}
      className="rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-500 flex items-center justify-center font-bold text-slate-200"
    >
      {code.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─── Probability split bar ────────────────────────────────────────────────────

function SplitBar({ home, draw, away }: { home: number; draw: number; away: number }) {
  return (
    <div className="space-y-0.5">
      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
        <div className="bg-blue-500 rounded-l-full" style={{ width: `${home * 100}%` }} />
        <div className="bg-slate-400" style={{ width: `${draw * 100}%` }} />
        <div className="bg-rose-500 rounded-r-full" style={{ width: `${away * 100}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span className="text-blue-400 font-medium">{(home * 100).toFixed(0)}%</span>
        <span>{(draw * 100).toFixed(0)}%</span>
        <span className="text-rose-400 font-medium">{(away * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function MatchCard({ match }: { match: RichPrediction }) {
  const p = match.prediction;
  const conf = (p?.confidence ?? "Media") as keyof typeof CONF;
  const c = CONF[conf] ?? CONF["Media"];
  const { label: dateLabel, ms: matchMs } = parseDate(match.match_date);
  const stageLabel = GROUP[match.stage ?? ""] ?? match.stage ?? "";
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const rec = p?.quiniela_recommendation as keyof typeof REC | undefined;

  return (
    <Link
      href={`/partido/${match.match_id}`}
      className={`block bg-slate-800 rounded-2xl border ${c.border} shadow-lg ${c.glow}
        hover:scale-[1.02] hover:shadow-xl transition-all duration-200 overflow-hidden`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/50">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          {stageLabel}
        </span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              EN VIVO
            </span>
          )}
          {!isLive && !isFinished && <Countdown ms={matchMs} />}
          <span className="text-xs text-slate-500">{dateLabel}</span>
        </div>
      </div>

      {/* Teams + score */}
      <div className="px-4 py-4 flex items-center gap-3">
        {/* Home */}
        <div className="flex-1 flex flex-col items-center gap-1.5 text-center">
          <Crest url={match.home_team.crest_url} name={match.home_team.name} code={match.home_team.code} size={44} />
          <span className="text-sm font-bold leading-tight line-clamp-2">{match.home_team.name}</span>
        </div>

        {/* Center score / prediction */}
        <div className="flex flex-col items-center gap-0.5 px-2 shrink-0">
          {isFinished ? (
            <>
              <span className="text-3xl font-black font-mono tabular-nums">
                {match.home_goals} <span className="text-slate-500">-</span> {match.away_goals}
              </span>
              <span className="text-xs text-slate-500">Final</span>
            </>
          ) : isLive ? (
            <>
              <span className="text-3xl font-black font-mono tabular-nums text-emerald-400">
                {match.home_goals ?? 0} <span className="text-slate-500">-</span> {match.away_goals ?? 0}
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-black font-mono tabular-nums text-slate-300">
                {p?.most_likely_score ?? "? - ?"}
              </span>
              {p?.score_probability && (
                <span className="text-xs text-slate-500">{(p.score_probability * 100).toFixed(1)}%</span>
              )}
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex flex-col items-center gap-1.5 text-center">
          <Crest url={match.away_team.crest_url} name={match.away_team.name} code={match.away_team.code} size={44} />
          <span className="text-sm font-bold leading-tight line-clamp-2">{match.away_team.name}</span>
        </div>
      </div>

      {/* Probability split bar + labels */}
      {p && !isFinished && (
        <div className="px-4 pb-3">
          <SplitBar home={p.home_win_prob} draw={p.draw_prob} away={p.away_win_prob} />
        </div>
      )}

      {/* Footer */}
      {p && !isFinished && (
        <div className="px-4 py-2.5 flex items-center justify-between bg-slate-900/40 border-t border-slate-700/40">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${c.badge}`}>
            {conf}
          </span>
          {rec && (
            <span className={`text-xs px-3 py-1 rounded-full font-bold ${REC[rec].bg}`}>
              {REC[rec].label}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
