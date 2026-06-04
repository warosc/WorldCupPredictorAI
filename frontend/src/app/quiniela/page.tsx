import { api } from "@/lib/api";
import QuinielaCard from "@/components/QuinielaCard";
import QuinielaPrint from "@/components/QuinielaPrint";

export default async function QuinielaPage() {
  const [conservative, balanced, aggressive] = await Promise.allSettled([
    api.quiniela("conservative"),
    api.quiniela("balanced"),
    api.quiniela("aggressive"),
  ]);

  const cons = conservative.status === "fulfilled" ? conservative.value : null;
  const bal  = balanced.status    === "fulfilled" ? balanced.value    : null;
  const agg  = aggressive.status  === "fulfilled" ? aggressive.value  : null;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Quiniela Mundial 2026</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Elige tu estrategia e imprime o guarda tu quiniela.
        </p>
      </div>

      {/* Estrategias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuinielaCard data={cons} strategy="conservative" label="Conservador" color="blue" />
        <QuinielaCard data={bal}  strategy="balanced"     label="Balanceado"  color="yellow" />
        <QuinielaCard data={agg}  strategy="aggressive"   label="Agresivo"    color="red" />
      </div>

      {/* Tabla imprimible */}
      {cons && (
        <QuinielaPrint conservative={cons} balanced={bal} aggressive={agg} />
      )}
    </div>
  );
}
