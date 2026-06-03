import { api } from "@/lib/api";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function MetricCard({ label, value, description, good }: {
  label: string; value: string | number; description: string; good?: boolean;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${good === undefined ? "text-blue-400" : good ? "text-green-400" : "text-red-400"}`}>
          {value}
        </p>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function MetricasPage() {
  let data: Awaited<ReturnType<typeof api.metrics>> | null = null;
  try {
    data = await api.metrics();
  } catch { /* API offline */ }

  if (!data || !data.metrics) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Métricas del Modelo</h1>
        <p className="text-slate-400">
          Las métricas estarán disponibles una vez que haya partidos terminados con predicciones registradas.
        </p>
      </div>
    );
  }

  const m = data.metrics;
  const roi = m.roi_theoretical;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Métricas del Modelo</h1>
        <p className="text-slate-400 mt-1">
          Evaluado sobre {data.matches_evaluated} partido{data.matches_evaluated !== 1 ? "s" : ""} terminados.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Accuracy" value={`${(m.accuracy * 100).toFixed(1)}%`} description="% predicciones correctas" good={m.accuracy > 0.50} />
        <MetricCard label="Precision" value={`${(m.precision * 100).toFixed(1)}%`} description="Macro-promedio por clase" good={m.precision > 0.45} />
        <MetricCard label="Recall" value={`${(m.recall * 100).toFixed(1)}%`} description="Sensibilidad macro" good={m.recall > 0.45} />
        <MetricCard label="F1 Score" value={m.f1_score.toFixed(3)} description="Balance precision/recall" good={m.f1_score > 0.45} />
        <MetricCard label="Log Loss" value={m.log_loss.toFixed(3)} description="Pérdida logarítmica (menor = mejor)" good={m.log_loss < 1.0} />
        <MetricCard
          label="ROI Teórico"
          value={`${roi >= 0 ? "+" : ""}${(roi * 100).toFixed(1)}%`}
          description="Retorno si apuestas la recomendación"
          good={roi >= 0}
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Métricas por Resultado</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left">Resultado</th>
                <th className="px-4 py-2 text-right">Precision</th>
                <th className="px-4 py-2 text-right">Recall</th>
                <th className="px-4 py-2 text-right">F1</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.per_class).map(([cls, vals]) => (
                <tr key={cls} className="border-t border-slate-700">
                  <td className="px-4 py-3 font-mono font-bold text-blue-300">
                    {cls === "1" ? "Local (1)" : cls === "X" ? "Empate (X)" : "Visitante (2)"}
                  </td>
                  <td className="px-4 py-3 text-right">{(vals.precision * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">{(vals.recall * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">{vals.f1.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
