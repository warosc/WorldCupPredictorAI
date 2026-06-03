import { api } from "@/lib/api";
import PredictionsTable from "@/components/PredictionsTable";
import RankingsWidget from "@/components/RankingsWidget";
import OverviewCards from "@/components/OverviewCards";
import GenerateButton from "@/components/GenerateButton";

export default async function Dashboard() {
  const [predictions, rankings, overview] = await Promise.allSettled([
    api.predictions(),
    api.rankings(),
    api.worldcupOverview(),
  ]);

  const now = new Date();
  const kickoff = new Date("2026-06-11T00:00:00Z");
  const daysLeft = Math.ceil((kickoff.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const tournamentStarted = now >= kickoff;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">WorldCup Predictor AI</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {tournamentStarted
              ? "Torneo en curso — predicciones actualizadas automáticamente cada 6h"
              : `Faltan ${daysLeft} días para el Mundial 2026 · Inicio 11 Jun`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <GenerateButton />
          <p className="text-xs text-slate-500">
            {tournamentStarted
              ? "O espera la actualización automática cada 6h"
              : "Actualiza predicciones con los últimos datos"}
          </p>
        </div>
      </div>

      <OverviewCards
        overview={overview.status === "fulfilled" ? overview.value : null}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Predicciones del Torneo</h2>
          <PredictionsTable
            predictions={predictions.status === "fulfilled" ? predictions.value : []}
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Top Rankings ELO</h2>
          <RankingsWidget
            rankings={rankings.status === "fulfilled" ? rankings.value.slice(0, 10) : []}
          />
        </div>
      </div>
    </div>
  );
}
