"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

const SUGGESTED = [
  "¿Quién tiene más probabilidad de ganar hoy?",
  "¿Qué partidos son seguros para mi quiniela?",
  "¿Cuál es el marcador más probable del próximo partido?",
  "¿Qué selección está sobrevalorada según el ELO?",
];

export default function IAPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    const text = q || question;
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await api.aiQuery(text);
      setAnswer(res.answer);
    } catch (err: any) {
      setError(err.message ?? "Error al consultar el agente IA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Agente IA</h1>
        <p className="text-slate-400 mt-1">
          Pregunta en lenguaje natural sobre el Mundial. El agente usa datos en tiempo real.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="¿Quién tiene más probabilidad de ganar hoy?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask("")}
            />
            <Button onClick={() => ask("")} disabled={loading || !question.trim()}>
              {loading ? "..." : "Preguntar"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-300 transition-colors"
                onClick={() => { setQuestion(s); ask(s); }}
              >
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent>
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-slate-500 text-xs mt-1">
              Asegúrate de tener ANTHROPIC_API_KEY configurado en tu .env
            </p>
          </CardContent>
        </Card>
      )}

      {answer && (
        <Card>
          <CardTitle className="mb-3 text-blue-400">Respuesta del Agente</CardTitle>
          <CardContent>
            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-sm">{answer}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
