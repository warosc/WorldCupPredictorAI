import { api } from "@/lib/api";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import TrendsWidget from "@/components/TrendsWidget";

export default async function TendenciasPage() {
  let data: Awaited<ReturnType<typeof api.trends>> | null = null;
  try {
    data = await api.trends();
  } catch { /* API offline */ }

  const ascending = data?.ascending ?? [];
  const descending = data?.descending ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tendencias del Torneo</h1>
        <p className="text-slate-400 mt-1">Equipos con forma ascendente o descendente según resultados recientes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-4 text-green-400">↑ En Ascenso ({ascending.length})</CardTitle>
          <CardContent>
            <TrendsWidget data={data} />
          </CardContent>
        </Card>

        <Card>
          <CardTitle className="mb-4 text-red-400">↓ En Descenso ({descending.length})</CardTitle>
          <CardContent>
            {descending.length === 0 ? (
              <p className="text-slate-400 text-sm">Sin partidos suficientes para detectar tendencias.</p>
            ) : (
              <div className="space-y-2">
                {descending.slice(0, 5).map((t) => (
                  <div key={t.team_id} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-700/50">
                    <span className="flex-1 font-medium">{t.team_name}</span>
                    <span className="font-mono text-xs tracking-widest text-slate-400">{t.form}</span>
                    <span className="text-xs text-red-400">{t.trend_value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
