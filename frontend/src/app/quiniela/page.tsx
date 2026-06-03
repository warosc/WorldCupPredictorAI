import { api } from "@/lib/api";
import QuinielaCard from "@/components/QuinielaCard";

export default async function QuinielaPage() {
  const [conservative, balanced, aggressive] = await Promise.allSettled([
    api.quiniela("conservative"),
    api.quiniela("balanced"),
    api.quiniela("aggressive"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Recomendaciones de Quiniela</h1>
      <p className="text-slate-400">Elige tu estrategia basada en las predicciones del modelo.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuinielaCard
          data={conservative.status === "fulfilled" ? conservative.value : null}
          strategy="conservative"
          label="Conservador"
          color="blue"
        />
        <QuinielaCard
          data={balanced.status === "fulfilled" ? balanced.value : null}
          strategy="balanced"
          label="Balanceado"
          color="yellow"
        />
        <QuinielaCard
          data={aggressive.status === "fulfilled" ? aggressive.value : null}
          strategy="aggressive"
          label="Agresivo"
          color="red"
        />
      </div>
    </div>
  );
}
