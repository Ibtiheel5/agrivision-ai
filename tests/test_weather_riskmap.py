"""Tests des routeurs météo (Open-Meteo simulé) et carte des risques (SQLite temporaire)."""

import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.routers import risk_map, weather  # noqa: E402

OPEN_METEO_REPONSE = {
    "current": {"temperature_2m": 18.4, "relative_humidity_2m": 85, "wind_speed_10m": 9.2, "weather_code": 61},
    "daily": {
        "time": ["2026-11-23", "2026-11-24", "2026-11-25"],
        "temperature_2m_max": [21.0, 23.5, 39.2],
        "temperature_2m_min": [12.0, 13.1, 20.0],
        "precipitation_sum": [4.2, 0.0, None],
        "weather_code": [61, 3, 0],
    },
}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(risk_map, "DB_PATH", tmp_path / "test.sqlite3")
    risk_map.init_db()
    app = FastAPI()
    app.include_router(weather.router)
    app.include_router(risk_map.router)
    return TestClient(app)


# ---------- météo ----------
def test_places_lists_governorates(client):
    data = client.get("/weather/places").json()
    assert len(data) == 24
    assert {"id": "sfax", "name": "Sfax"}.items() <= data[14].items() or any(p["id"] == "sfax" for p in data)


def test_weather_maps_codes_and_builds_alerts(client, monkeypatch):
    monkeypatch.setattr(weather, "fetch", lambda lat, lon: OPEN_METEO_REPONSE)
    body = client.get("/weather", params={"place": "nabeul"}).json()

    assert body["place"]["name"] == "Nabeul"
    assert body["current"]["description"] == "Pluie faible" and body["current"]["icon"] == "rain"
    assert len(body["days"]) == 3
    assert body["days"][2]["rain"] == 0.0  # None de l'API ramené à 0

    titres = [a["title"] for a in body["alerts"]]
    assert "Risque de mildiou élevé" in titres  # 85 % d'humidité à 18 °C
    assert "Coup de chaleur attendu" in titres  # 39,2 °C prévus
    assert all(a["level"] in {"info", "warn", "danger"} for a in body["alerts"])


def test_weather_dry_and_calm_gives_spray_window(client, monkeypatch):
    sec = {
        "current": {"temperature_2m": 31.0, "relative_humidity_2m": 30, "wind_speed_10m": 6.0, "weather_code": 0},
        "daily": {
            "time": ["2026-11-23"],
            "temperature_2m_max": [32.0],
            "temperature_2m_min": [18.0],
            "precipitation_sum": [0.0],
            "weather_code": [0],
        },
    }
    monkeypatch.setattr(weather, "fetch", lambda lat, lon: sec)
    titres = [a["title"] for a in client.get("/weather").json()["alerts"]]
    assert "Fenêtre favorable aux traitements" in titres
    assert "Risque de mildiou élevé" not in titres


def test_weather_strong_wind_blocks_spraying(client, monkeypatch):
    venteux = {
        "current": {"temperature_2m": 24.0, "relative_humidity_2m": 50, "wind_speed_10m": 27.0, "weather_code": 2},
        "daily": {
            "time": ["2026-11-23"],
            "temperature_2m_max": [25.0],
            "temperature_2m_min": [15.0],
            "precipitation_sum": [0.0],
            "weather_code": [2],
        },
    }
    monkeypatch.setattr(weather, "fetch", lambda lat, lon: venteux)
    titres = [a["title"] for a in client.get("/weather").json()["alerts"]]
    assert "Vent trop fort pour traiter" in titres
    assert "Fenêtre favorable aux traitements" not in titres


def test_weather_unknown_place(client):
    assert client.get("/weather", params={"place": "paris"}).status_code == 404


def test_weather_service_down(client, monkeypatch):
    def boom(lat, lon):
        raise RuntimeError("réseau coupé")

    monkeypatch.setattr(weather, "fetch", boom)
    assert client.get("/weather").status_code == 502


# ---------- carte des risques ----------
def test_report_rounds_position_and_finds_governorate(client):
    body = client.post(
        "/risk-map/report", json={"label": "Tomato leaf late blight", "lat": 36.4567, "lon": 10.7412}
    ).json()
    assert body == {"stored": True, "gov_id": "nabeul", "gov_name": "Nabeul"}

    with risk_map.connect() as conn:
        row = conn.execute("SELECT lat, lon FROM reports").fetchone()
    assert row["lat"] == 36.46 and row["lon"] == 10.74  # arrondi à ~1 km


def test_summary_counts_and_ranks(client):
    for _ in range(3):
        client.post("/risk-map/report", json={"label": "Mildiou", "lat": 36.46, "lon": 10.74})
    client.post("/risk-map/report", json={"label": "Oïdium", "lat": 36.46, "lon": 10.74})
    client.post("/risk-map/report", json={"label": "Mildiou", "lat": 34.74, "lon": 10.76})

    body = client.get("/risk-map/summary").json()
    assert body["total"] == 5
    premier = body["governorates"][0]
    assert premier["gov_name"] == "Nabeul" and premier["count"] == 4
    assert premier["top"][0] == {"label": "Mildiou", "count": 3}
    assert body["governorates"][1]["gov_name"] == "Sfax"


def test_summary_empty(client):
    body = client.get("/risk-map/summary").json()
    assert body == {"days": 30, "total": 0, "governorates": []}


def test_report_rejects_invalid_coordinates(client):
    assert client.post("/risk-map/report", json={"label": "x", "lat": 200, "lon": 0}).status_code == 422
