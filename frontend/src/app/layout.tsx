import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quiniesys — WorldCup Predictor AI",
  description: "Predicciones probabilísticas para quinielas del Mundial",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-900 text-slate-100">
        <nav className="border-b border-slate-700 px-6 py-3 flex items-center gap-5 flex-wrap">
          <a href="/" className="text-lg font-bold text-blue-400 mr-2 shrink-0">⚽ Quiniesys</a>
          <a href="/predicciones" className="text-sm text-slate-300 hover:text-white font-medium">Predicciones</a>
          <a href="/grupos" className="text-sm text-slate-300 hover:text-white">Grupos</a>
          <a href="/mi-quiniela" className="text-sm text-yellow-400 hover:text-yellow-300 font-medium">Mi Quiniela</a>
          <a href="/quiniela" className="text-sm text-slate-300 hover:text-white">IA Quiniela</a>
          <a href="/rankings" className="text-sm text-slate-300 hover:text-white">Rankings</a>
          <a href="/tendencias" className="text-sm text-slate-300 hover:text-white">Tendencias</a>
          <a href="/simulaciones" className="text-sm text-slate-300 hover:text-white">Simulaciones</a>
          <a href="/comparar" className="text-sm text-slate-300 hover:text-white">Comparar</a>
          <a href="/metricas" className="text-sm text-slate-300 hover:text-white">Métricas</a>
          <a href="/ia" className="text-sm text-blue-400 hover:text-blue-300 font-medium ml-auto">✦ IA</a>
        </nav>
        <main className="px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
