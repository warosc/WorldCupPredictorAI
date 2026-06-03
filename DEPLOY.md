# Manual de Despliegue — Quiniesys WorldCup Predictor AI

## Requisitos

- Docker Desktop >= 24 (con BuildKit habilitado)
- Docker Compose >= 2.20
- 8 GB RAM mínimo (ml-engine usa TensorFlow + PyMC)
- Puertos libres: 3000, 8000, 8001, 5432, 6379, 9090, 3001

---

## Primer arranque

```bash
# 1. Clonar e ingresar al repositorio
git clone <repo-url> quiniesys
cd quiniesys

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env y añadir claves de APIs externas (opcional para empezar):
#   API_FOOTBALL_KEY, FOOTBALL_DATA_KEY, ANTHROPIC_API_KEY

# 3. Construir imágenes y levantar servicios
docker-compose up --build -d

# 4. Esperar a que PostgreSQL esté listo (~15 s), luego poblar datos
docker-compose exec api python -c "import asyncio; from app.database import Base, engine; asyncio.run(engine.begin().__aenter__())"
# — o directamente ejecutar el seed:
docker-compose run --rm -e DATABASE_URL=postgresql://quiniesys:quiniesys_pass@postgres:5432/quiniesys \
  api python /app/../database/seed_data.py
```

> El `init.sql` crea el esquema automáticamente al arrancar el contenedor de PostgreSQL por primera vez.

---

## URLs de servicios

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API REST | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| ML Engine | http://localhost:8001 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin / admin) |

---

## Seed de datos

```bash
# Con servicios ya corriendo:
docker-compose exec api bash -c "DATABASE_URL=postgresql://quiniesys:quiniesys_pass@postgres:5432/quiniesys python /database/seed_data.py"

# O desde el host (requiere psycopg2 local):
DATABASE_URL=postgresql://quiniesys:quiniesys_pass@localhost:5432/quiniesys python database/seed_data.py
```

---

## Habilitar el Agente IA

```bash
# Añadir tu clave de Anthropic en .env:
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

# Reiniciar el servicio api:
docker-compose restart api
```

---

## Gestión de servicios

```bash
# Ver estado
docker-compose ps

# Logs en tiempo real de un servicio
docker-compose logs -f api
docker-compose logs -f ml-engine
docker-compose logs -f scheduler

# Reiniciar un servicio sin reconstruir
docker-compose restart api

# Reconstruir solo el backend tras cambios
docker-compose up --build api

# Detener todo
docker-compose down

# Detener y borrar volúmenes (⚠️ borra la base de datos)
docker-compose down -v
```

---

## Ejecución de tests

```bash
# Backend
docker-compose run --rm api pytest tests/ -v

# ML Engine
docker-compose run --rm ml-engine pytest tests/ -v

# Frontend (type-check + lint)
docker-compose run --rm frontend npm run type-check
docker-compose run --rm frontend npm run lint
```

---

## Tareas Celery manuales

```bash
# Ejecutar ETL inmediatamente (sin esperar el schedule)
docker-compose exec scheduler celery -A celery_app call tasks.etl.run_etl_pipeline

# Generar predicciones ahora
docker-compose exec scheduler celery -A celery_app call tasks.predictions.generate_all_predictions

# Ver tareas activas
docker-compose exec scheduler celery -A celery_app inspect active
```

---

## Monitoreo (Grafana)

1. Accede a http://localhost:3001
2. Usuario / contraseña: `admin` / `admin` (cambiar en `GRAFANA_PASSWORD` del .env)
3. Añadir datasource → Prometheus → URL: `http://prometheus:9090`
4. Importar dashboard desde `monitoring/grafana/` (si existe) o crear uno nuevo con las métricas expuestas en `/metrics`

---

## Despliegue en producción

Para producción se recomienda:

1. **Cambiar secretos**: `JWT_SECRET_KEY`, `POSTGRES_PASSWORD`, `GRAFANA_PASSWORD`
2. **HTTPS**: poner un reverse proxy (nginx / Traefik) frente a los servicios
3. **Volúmenes persistentes**: asegurarse de hacer backup de `postgres_data` y `ml_models`
4. **Variables de entorno**: usar un Secrets Manager (AWS Secrets Manager, HashiCorp Vault) en vez del archivo `.env`
5. **Limitar CORS** en `backend/app/main.py` al dominio de producción

```bash
# Ejemplo con dominio propio
NEXT_PUBLIC_API_URL=https://api.miquiniela.com docker-compose up -d frontend
```

---

## Árbol de archivos principales

```
quiniesys/
├── backend/          FastAPI API
├── ml-engine/        Modelos ELO/Poisson/MC/Bayesian/TF/XGB
├── scheduler/        Celery ETL + tareas periódicas
├── frontend/         Next.js 15 dashboard
├── database/         init.sql + seed_data.py
├── monitoring/       prometheus.yml
├── .github/          CI/CD (GitHub Actions)
├── docker-compose.yml
└── .env.example
```
