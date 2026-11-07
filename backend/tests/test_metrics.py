from fastapi.testclient import TestClient

from app.main import app


def test_metrics_endpoint_exposes_request_counter():
    with TestClient(app) as client:
        client.get("/health")
        r = client.get("/metrics")
    assert r.status_code == 200
    assert 'http_requests_total{method="GET",path="/health",status="200"}' in r.text
