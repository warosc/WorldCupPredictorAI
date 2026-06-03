"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function GenerateButton() {
  const [state, setStatus] = useState<"idle" | "syncing" | "predicting" | "done" | "error">("idle");
  const [summary, setSummary] = useState<string | null>(null);

  async function run() {
    setSummary(null);

    try {
      // Step 1: sync real data from football-data.org
      setStatus("syncing");
      const syncRes = await fetch(`${API}/worldcup/sync`, { method: "POST" });
      const syncData = await syncRes.json();

      // Step 2: generate ML predictions
      setStatus("predicting");
      const predRes = await fetch(`${API}/predictions/generate`, { method: "POST" });
      const predData = await predRes.json();

      setStatus("done");
      setSummary(
        `✓ Sync: ${syncData.teams?.total ?? "?"} equipos · ${syncData.matches?.total ?? "?"} partidos` +
        `  |  ✓ Predicciones: ${predData.generated ?? 0} generadas`
      );
      // Refresh the page data after a short delay
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setStatus("error");
      setSummary("Error al conectar con el API. ¿Está corriendo docker-compose?");
    }
  }

  const labels: Record<typeof state, string> = {
    idle:       "Actualizar Predicciones",
    syncing:    "Sincronizando datos...",
    predicting: "Generando predicciones...",
    done:       "¡Listo!",
    error:      "Error — reintentar",
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={run}
        disabled={state === "syncing" || state === "predicting"}
        variant={state === "error" ? "danger" : "primary"}
        size="lg"
        className="gap-2"
      >
        {(state === "syncing" || state === "predicting") && (
          <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
        )}
        {labels[state]}
      </Button>

      {summary && (
        <p className={`text-xs ${state === "error" ? "text-red-400" : "text-green-400"}`}>
          {summary}
        </p>
      )}
    </div>
  );
}
