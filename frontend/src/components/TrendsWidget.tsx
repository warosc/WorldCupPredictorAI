"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

interface TrendTeam {
  team_id: string;
  team_name: string;
  elo_rating: number;
  trend: "ascending" | "descending" | "stable";
  trend_value: number;
  form: string;
  weighted_form: number;
}

interface TrendsData {
  ascending: TrendTeam[];
  descending: TrendTeam[];
  stable: TrendTeam[];
}

function FormBadge({ form }: { form: string }) {
  return (
    <span className="font-mono text-xs tracking-widest">
      {form.split("").map((c, i) => (
        <span
          key={i}
          className={
            c === "W" ? "text-green-400" : c === "D" ? "text-yellow-400" : "text-red-400"
          }
        >
          {c}
        </span>
      ))}
    </span>
  );
}

function TrendSection({ title, teams, variant }: { title: string; teams: TrendTeam[]; variant: "success" | "danger" | "default" }) {
  if (!teams.length) return null;
  return (
    <div>
      <h4 className="text-sm font-medium text-slate-400 mb-2">{title}</h4>
      <div className="space-y-1.5">
        {teams.slice(0, 5).map((t) => (
          <div key={t.team_id} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-700/50">
            <span className="flex-1 font-medium">{t.team_name}</span>
            <FormBadge form={t.form} />
            <Badge variant={variant}>
              {t.trend_value > 0 ? "+" : ""}{t.trend_value.toFixed(2)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrendsWidget({ data }: { data: TrendsData | null }) {
  if (!data) return <p className="text-slate-400 text-sm">Sin datos de tendencias.</p>;

  return (
    <div className="space-y-5">
      <TrendSection title="↑ En Ascenso" teams={data.ascending} variant="success" />
      <TrendSection title="↓ En Descenso" teams={data.descending} variant="danger" />
    </div>
  );
}
