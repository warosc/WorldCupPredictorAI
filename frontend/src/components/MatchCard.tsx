"use client";

import Link from "next/link";
import type { RichPrediction } from "@/lib/api";

const CONFIDENCE_STYLE: Record<string, { border: string; badge: string; label: string }> = {
  "Muy Alta": { border: "border-green-500",  badge: "bg-green-500/20 text-green-300",  label: "Muy Alta" },
  "Alta":     { border: "border-blue-500",   badge: "bg-blue-500/20 text-blue-300",    label: "Alta" },
  "Media":    { border: "border-yellow-500", badge: "bg-yellow-500/20 text-yellow-300", label: "Media" },
  "Baja":     { border: "border-red-500",    badge: "bg-red-500/20 text-red-300",      label: "Baja" },
};

const REC_LABEL: Record<string, string> = { "1": "LOCAL", "X": "EMPATE", "2": "VISITANTE" };
const REC_COLOR: Record<string, string> = {
  "1": "bg-blue-600 text-white",
  "X": "bg-yellow-600 text-white",
  "2": "bg-red-600 text-white",
};

const STAGE_LABEL: Record<string, string> = {
  GROUP_STAGE: "Fase de Grupos",
  LAST_16: "Octavos de Final",
  QUARTER_FINALS: "Cuartos de Final",
  SEMI_FINALS: "Semifinal",
  THIRD_PLACE: "Tercer Puesto",
  FINAL: "Final",
};

function ProbBar({ label, prob, color }: { label: string; prob: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="font-mono font-semibold text-slate-200">{(prob * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${prob * 100}%` }} />
      </div>
    </div>
  );
}

function TeamCrest({ crest_url, name, code }: { crest_url: string | null; name: string; code: string }) {
  if (crest_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={crest_url}
        alt={name}
        className="w-10 h-10 object-contain"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
      {code.slice(0, 3)}
    </div>
  );
}

export default function MatchCard({ match }: { match: RichPrediction }) {
  const p = match.prediction;
  const conf = p?.confidence ?? "Media";
  const style = CONFIDENCE_STYLE[conf] ?? CONFIDENCE_STYLE["Media"];

  const matchDate = new Date(match.match_date + (match.match_date.endsWith("Z") ? "" : "Z"));
  const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const dateStr = `${matchDate.getUTCDate()} ${MONTHS[matchDate.getUTCMonth()]} ${matchDate.getUTCFullYear()}`;
  const timeStr = `${String(matchDate.getUTCHours()).padStart(2,"0")}:${String(matchDate.getUTCMinutes()).padStart(2,"0")} UTC`;

  const stageLabel = STAGE_LABEL[match.stage ?? ""] ?? match.stage ?? "";
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const msUntil = matchDate.getTime() - Date.now();
  const hoursUntil = msUntil / 3600000;
  const countdown =
    isLive ? null :
    isFinished ? null :
    hoursUntil < 0 ? "Próximamente" :
    hoursUntil < 1 ? `${Math.round(hoursUntil * 60)}min` :
    hoursUntil < 24 ? `${Math.floor(hoursUntil)}h ${Math.round((hoursUntil % 1) * 60)}min` :
    `${Math.ceil(hoursUntil / 24)} días`;

  return (
    <Link href={`/partido/${match.match_id}`} className={`block bg-slate-800/80 rounded-xl border-l-4 ${style.border} p-4 space-y-3 hover:bg-slate-800 hover:ring-1 hover:ring-slate-600 transition-all cursor-pointer`}>
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{stageLabel}</span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-green-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              EN VIVO
            </span>
          )}
          {countdown && <span className="text-yellow-400 font-medium">⏱ {countdown}</span>}
          <span>{dateStr} · {timeStr}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-3">
        {/* Home */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <TeamCrest crest_url={match.home_team.crest_url} name={match.home_team.name} code={match.home_team.code} />
          <span className="text-sm font-semibold text-center leading-tight">{match.home_team.name}</span>
          <span className="text-xs text-slate-500">ELO {match.home_team.elo_rating.toFixed(0)}</span>
        </div>

        {/* Score / VS */}
        <div className="text-center px-2">
          {isFinished ? (
            <span className="text-2xl font-bold font-mono text-white">
              {match.home_goals} - {match.away_goals}
            </span>
          ) : (
            <div className="space-y-0.5">
              <p className="text-xs text-slate-500 font-mono">
                {p?.most_likely_score ?? "?-?"}
              </p>
              <p className="text-slate-600 font-bold text-sm">VS</p>
              {p?.score_probability && (
                <p className="text-xs text-slate-500">{(p.score_probability * 100).toFixed(1)}%</p>
              )}
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <TeamCrest crest_url={match.away_team.crest_url} name={match.away_team.name} code={match.away_team.code} />
          <span className="text-sm font-semibold text-center leading-tight">{match.away_team.name}</span>
          <span className="text-xs text-slate-500">ELO {match.away_team.elo_rating.toFixed(0)}</span>
        </div>
      </div>

      {/* Probability bars */}
      {p && !isFinished && (
        <div className="space-y-1.5 pt-1">
          <ProbBar label={match.home_team.name.split(" ")[0]} prob={p.home_win_prob} color="bg-blue-500" />
          <ProbBar label="Empate" prob={p.draw_prob} color="bg-slate-400" />
          <ProbBar label={match.away_team.name.split(" ")[0]} prob={p.away_win_prob} color="bg-red-500" />
        </div>
      )}

      {/* Footer */}
      {p && !isFinished && (
        <div className="flex items-center justify-between pt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
            {conf} confianza
          </span>
          <span className={`text-xs px-3 py-1 rounded-full font-bold ${REC_COLOR[p.quiniela_recommendation ?? "1"] ?? ""}`}>
            {REC_LABEL[p.quiniela_recommendation ?? "1"] ?? "?"}
          </span>
        </div>
      )}
    </Link>
  );
}
