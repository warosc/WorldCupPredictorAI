"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { RichPrediction } from "@/lib/api";

// ─── Styles ───────────────────────────────────────────────────────────────────

const CONF = {
  "Muy Alta": { border: "border-emerald-500/60", badge: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" },
  "Alta":     { border: "border-blue-500/60",    badge: "bg-blue-500/10 text-blue-300 border border-blue-500/30" },
  "Media":    { border: "border-amber-500/50",   badge: "bg-amber-500/10 text-amber-300 border border-amber-500/30" },
  "Baja":     { border: "border-rose-500/40",    badge: "bg-rose-500/10 text-rose-300 border border-rose-500/30" },
} as const;

const REC = {
  "1": { label: "LOCAL",    cls: "bg-blue-600 text-white" },
  "X": { label: "EMPATE",   cls: "bg-amber-500 text-black" },
  "2": { label: "VISITANTE",cls: "bg-rose-600 text-white" },
} as const;

const GROUP_LABEL: Record<string, string> = {
  GROUP_A:"Grupo A",GROUP_B:"Grupo B",GROUP_C:"Grupo C",GROUP_D:"Grupo D",
  GROUP_E:"Grupo E",GROUP_F:"Grupo F",GROUP_G:"Grupo G",GROUP_H:"Grupo H",
  GROUP_I:"Grupo I",GROUP_J:"Grupo J",GROUP_K:"Grupo K",GROUP_L:"Grupo L",
  GROUP_STAGE:"Fase de Grupos",LAST_16:"Octavos de Final",
  QUARTER_FINALS:"Cuartos de Final",SEMI_FINALS:"Semifinal",
  THIRD_PLACE:"3er Puesto",FINAL:"⭐ FINAL",
};

const MO = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function fmtDate(iso: string) {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return {
    short: `${d.getUTCDate()} ${MO[d.getUTCMonth()]}`,
    time:  `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")} UTC`,
    ms:    d.getTime(),
  };
}

// ─── Countdown (client-only) ──────────────────────────────────────────────────

function Countdown({ ms }: { ms: number }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const h = (ms - Date.now()) / 3_600_000;
      if (h <= 0)      return setText(null);
      if (h < 1)       return setText(`${Math.round(h * 60)} min`);
      if (h < 24)      return setText(`${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`);
      setText(`${Math.ceil(h / 24)} días`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [ms]);
  if (!text) return null;
  return <span className="text-amber-400 text-[11px] font-semibold">⏱ {text}</span>;
}

// ─── Team block ───────────────────────────────────────────────────────────────

function TeamBlock({ name, code, crest, align }: {
  name: string; code: string; crest: string | null; align: "left" | "right";
}) {
  const [err, setErr] = useState(false);
  const dir = align === "left" ? "items-start text-left" : "items-end text-right";

  return (
    <div className={`flex flex-col gap-2 flex-1 ${dir}`}>
      {crest && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crest} alt={name} className="w-12 h-12 object-contain drop-shadow"
          onError={() => setErr(true)} />
      ) : (
        <div className="w-12 h-12 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-sm font-bold text-slate-300">
          {code.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="font-bold text-sm leading-tight text-white max-w-[90px]">{name}</span>
    </div>
  );
}

// ─── Probability bar ──────────────────────────────────────────────────────────

function ProbRow({ label, prob, color, bold }: { label: string; prob: number; color: string; bold?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs w-16 shrink-0 ${bold ? "text-white font-semibold" : "text-slate-400"}`}>{label}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${prob * 100}%` }} />
      </div>
      <span className={`text-xs font-mono w-10 text-right shrink-0 ${bold ? "text-white font-bold" : "text-slate-400"}`}>
        {(prob * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function MatchCard({ match }: { match: RichPrediction }) {
  const p = match.prediction;
  const conf = (p?.confidence ?? "Media") as keyof typeof CONF;
  const style = CONF[conf] ?? CONF["Media"];
  const { short, time, ms } = fmtDate(match.match_date);
  const stage = GROUP_LABEL[match.stage ?? ""] ?? match.stage ?? "";
  const finished = match.status === "finished";
  const live = match.status === "live";
  const rec = p?.quiniela_recommendation as keyof typeof REC | undefined;
  const topProb = p ? Math.max(p.home_win_prob, p.draw_prob, p.away_win_prob) : 0;

  return (
    <Link
      href={`/partido/${match.match_id}`}
      className={`flex flex-col bg-slate-800 rounded-2xl border ${style.border}
        hover:bg-slate-750 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30
        transition-all duration-200 overflow-hidden group`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stage}</span>
        <div className="flex items-center gap-2">
          {live && (
            <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              EN VIVO
            </span>
          )}
          {!live && !finished && <Countdown ms={ms} />}
          <span className="text-[11px] text-slate-500">{short} · {time}</span>
        </div>
      </div>

      {/* ── Teams + Score ── */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Home */}
        <TeamBlock
          name={match.home_team.name}
          code={match.home_team.code}
          crest={match.home_team.crest_url}
          align="left"
        />

        {/* Score */}
        <div className="flex flex-col items-center shrink-0 px-1">
          {finished || live ? (
            <>
              <span className={`text-3xl font-black font-mono tabular-nums ${live ? "text-emerald-300" : "text-white"}`}>
                {match.home_goals ?? 0}
                <span className="text-slate-500 mx-1">-</span>
                {match.away_goals ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">{finished ? "Final" : "En curso"}</span>
            </>
          ) : (
            <>
              <span className="text-2xl font-black font-mono tabular-nums text-slate-200 group-hover:text-white transition-colors">
                {p?.most_likely_score ?? "– –"}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {p?.score_probability ? `${(p.score_probability * 100).toFixed(1)}% probable` : "sin dato"}
              </span>
            </>
          )}
        </div>

        {/* Away */}
        <TeamBlock
          name={match.away_team.name}
          code={match.away_team.code}
          crest={match.away_team.crest_url}
          align="right"
        />
      </div>

      {/* ── Probability bars ── */}
      {p && !finished && (
        <div className="px-4 pb-3 space-y-1.5">
          <ProbRow
            label={match.home_team.name.split(" ")[0]}
            prob={p.home_win_prob}
            color="bg-blue-500"
            bold={p.home_win_prob === topProb}
          />
          <ProbRow
            label="Empate"
            prob={p.draw_prob}
            color="bg-slate-400"
            bold={p.draw_prob === topProb}
          />
          <ProbRow
            label={match.away_team.name.split(" ")[0]}
            prob={p.away_win_prob}
            color="bg-rose-500"
            bold={p.away_win_prob === topProb}
          />
        </div>
      )}

      {/* ── Footer ── */}
      {p && !finished && (
        <div className="flex items-center justify-between px-4 py-2 mt-auto border-t border-slate-700/50 bg-slate-900/30">
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${style.badge}`}>
            {conf} confianza
          </span>
          {rec && (
            <span className={`text-[11px] px-3 py-1 rounded-full font-bold ${REC[rec].cls}`}>
              {REC[rec].label}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
