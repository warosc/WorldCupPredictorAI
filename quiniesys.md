PROMPT MAESTRO

Actúa como un arquitecto senior de software, científico de datos, matemático especializado en modelos probabilísticos deportivos, ingeniero DevOps y experto en predicción de resultados futbolísticos.

Desarrolla una plataforma completa dockerizada llamada WorldCup Predictor AI.

Objetivo

Construir un sistema capaz de analizar diariamente la evolución del Mundial de Fútbol y generar predicciones probabilísticas para llenar quinielas deportivas utilizando:

Estadística avanzada
Teoría de probabilidades
Machine Learning
Simulación Monte Carlo
Modelos Bayesianos
Rating ELO
xG (Expected Goals)
Historial de enfrentamientos
Forma reciente
Lesiones
Suspensiones
Ventaja de localía
Tendencias del torneo
Predicciones de casas de apuestas
Ranking FIFA
Arquitectura

Genera una solución basada en microservicios Docker:

Backend
Python 3.12
FastAPI
Pandas
NumPy
Scikit-Learn
XGBoost
LightGBM
TensorFlow
Prophet
PyMC
SciPy
Base de datos

PostgreSQL

Tablas:

teams
players
matches
predictions
simulations
rankings
betting_odds
historical_results
worldcup_stats
Cache

Redis

Uso:

Resultados frecuentes
Rankings
Predicciones recientes
Frontend
NextJS
TailwindCSS
Shadcn/UI
ChartJS
Recharts
Contenedores Docker

docker-compose.yml

Servicios:

frontend
api
postgres
redis
scheduler
ml-engine
Motor Matemático

Implementar los siguientes modelos:

1. Modelo ELO

Calcular fuerza relativa entre selecciones.

Fórmula:

R' = R + K × (S − E)

2. Poisson

Predicción de goles.

Calcular:

Goles locales
Goles visitantes
Probabilidad exacta

Ejemplos:

1-0
2-1
1-1
3-2
3. Monte Carlo

Realizar:

100,000 simulaciones por partido

Calcular:

Victoria local
Empate
Victoria visitante
4. Bayesian Prediction

Actualizar probabilidades diariamente.

Variables:

Lesiones
Rendimiento
Forma actual
Resultados recientes
5. Machine Learning

Entrenar modelos:

Random Forest
XGBoost
LightGBM
Redes neuronales

Variables:

Goles anotados
Goles recibidos
Posesión
Tiros
xG
Ranking FIFA
ELO
Historial
Sistema de Recolección

Crear ETL automático.

Frecuencia:

Cada 6 horas.

Fuentes:

FIFA
SofaScore
FBref
Understat
API-Football
Football-Data

Procesos:

Descarga
Limpieza
Validación
Enriquecimiento
Almacenamiento
Predicciones

Generar diariamente:

Probabilidad de resultado

Ejemplo:

Brasil vs Alemania

Victoria Brasil: 52.4%

Empate: 23.1%

Victoria Alemania: 24.5%

Marcador más probable

Ejemplo:

2-1

Probabilidad: 18.7%

Recomendación Quiniela

Nivel de confianza:

Muy Alta
Alta
Media
Baja
Dashboard

Mostrar:

Ranking de predicciones

Top 10 partidos más predecibles.

Tendencias
Selecciones en ascenso
Selecciones en descenso
Simulaciones

Visualización Monte Carlo.

Heatmaps

Probabilidades de resultados.

Comparador

Equipo vs Equipo.

Inteligencia Artificial

Implementar agente LLM que responda:

"¿Quién tiene más probabilidad de ganar hoy?"

"¿Qué partidos son seguros para mi quiniela?"

"¿Cuál es el marcador más probable?"

"¿Qué selección está sobrevalorada?"

Scheduler

Implementar:

Celery + Redis

Tareas:

Actualizar datos
Entrenar modelos
Ejecutar simulaciones
Generar rankings
API REST

Endpoints:

/teams

/matches

/predictions

/simulations

/rankings

/worldcup

/quiniela/recommendations

Algoritmo Quiniela

Crear sistema que genere automáticamente:

Conservador

Máxima probabilidad.

Balanceado

Probabilidad + riesgo.

Agresivo

Buscar sorpresas.

Métricas

Medir:

Accuracy
Precision
Recall
F1 Score
Log Loss
ROI teórico
Seguridad

Implementar:

JWT
RBAC
Rate Limiting
HTTPS
Secrets Manager
DevOps

Generar:

Dockerfiles
docker-compose.yml
GitHub Actions
Tests automáticos
Monitoreo Prometheus
Grafana
Entregables

Generar automáticamente:

Arquitectura completa.
Código fuente.
Dockerfiles.
docker-compose.yml.
Base de datos.
APIs.
Frontend.
Modelos ML.
Simulaciones Monte Carlo.
Dashboard.
Documentación técnica.
Manual de despliegue.
Datos de ejemplo.
Tests unitarios.
Pipeline CI/CD.

El código debe estar listo para ejecutarse con: