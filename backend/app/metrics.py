"""Métriques Prometheus de l'API (endpoint GET /metrics).

- http_requests_total{method,path,status} : nombre de requêtes ;
- http_request_duration_seconds{method,path} : durée des requêtes ;
- predictions_total{status} : résultats de /predict (ok / aucune_detection).

Le chemin est celui de la route (ex. /predict/top3), jamais l'URL brute, pour
éviter une explosion du nombre de séries.
"""

import time

from fastapi import FastAPI, Request, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Histogram,
    generate_latest,
)

REQUESTS = Counter(
    "http_requests_total",
    "Requêtes HTTP reçues",
    ["method", "path", "status"],
)
DURATION = Histogram(
    "http_request_duration_seconds",
    "Durée des requêtes HTTP (secondes)",
    ["method", "path"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)
PREDICTIONS = Counter(
    "predictions_total",
    "Résultats globaux de /predict",
    ["status"],
)


def setup_metrics(app: FastAPI) -> None:
    """Ajoute le middleware de mesure et la route GET /metrics."""

    @app.middleware("http")
    async def measure(request: Request, call_next):
        start = time.perf_counter()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            return response
        finally:
            route = request.scope.get("route")
            path = getattr(route, "path", "inconnu")
            if path != "/metrics":
                REQUESTS.labels(request.method, path, str(status)).inc()
                DURATION.labels(request.method, path).observe(time.perf_counter() - start)

    @app.get("/metrics", include_in_schema=False)
    def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
