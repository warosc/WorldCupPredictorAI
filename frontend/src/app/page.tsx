import { api } from "@/lib/api";
import PredictionsTable from "@/components/PredictionsTable";
import RankingsWidget from "@/components/RankingsWidget";
import OverviewCards from "@/components/OverviewCards";

export default async function Dashboard() {
  const [predictions, rankings, overview] = await Promise.allSettled([
    api.predictions(),
    api.rankings(),
    api.worldcupOverview(),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">WorldCup Predictor AI</h1>

      <OverviewCards
        overview={overview.status === "fulfilled" ? overview.value : null}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Predicciones del Día</h2>
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
