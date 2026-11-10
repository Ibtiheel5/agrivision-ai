"""
backend/app/routers/risk_map.py  (à adapter au chemin de ton repo)

Carte des risques RÉELLE pour AgriVision AI, sur toute la Tunisie :
  1) /map/weather-risk : bilan hydrique réel par gouvernorat (Open-Meteo : pluie + ET0 FAO)
  2) /map/analyses     : analyses réelles de l'app (label, confiance, position arrondie ~1 km)

Dépendance : pip install httpx
Dans main.py : from app.routers.risk_map import router as risk_router, init_db
               app.include_router(risk_router); init_db()
"""

import sqlite3
import time
from pathlib import Path

import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/map", tags=["map"])

DB_PATH = Path("data/analyses.db")
OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
PAST_DAYS, FORECAST_DAYS = 14, 7
CACHE_TTL = 3 * 3600  # 3 h : on ménage l'API gratuite (usage non commercial)

# Centres approximatifs (chef-lieu) des 24 gouvernorats
GOVERNORATES = {
    "Tunis": (36.8065, 10.1815),
    "Ariana": (36.8665, 10.1647),
    "Ben Arous": (36.7531, 10.2189),
    "Manouba": (36.8101, 10.0863),
    "Nabeul": (36.4513, 10.7357),
    "Zaghouan": (36.4029, 10.1429),
    "Bizerte": (37.2744, 9.8739),
    "Béja": (36.7256, 9.1817),
    "Jendouba": (36.5011, 8.7802),
    "Le Kef": (36.1675, 8.7049),
    "Siliana": (36.0849, 9.3708),
    "Sousse": (35.8256, 10.6369),
    "Monastir": (35.7643, 10.8113),
    "Mahdia": (35.5047, 11.0622),
    "Sfax": (34.7406, 10.7603),
    "Kairouan": (35.6781, 10.0963),
    "Kasserine": (35.1676, 8.8365),
    "Sidi Bouzid": (35.0382, 9.4849),
    "Gabès": (33.8815, 10.0982),
    "Médenine": (33.3549, 10.5055),
    "Tataouine": (32.9297, 10.4518),
    "Gafsa": (34.4250, 8.7842),
    "Tozeur": (33.9197, 8.1335),
    "Kébili": (33.7044, 8.9690),
}

_cache: dict = {"t": 0.0, "data": None}


def _level(deficit: float) -> str:
    # Seuils HEURISTIQUES (à calibrer avec NDVI / observations terrain)
    if deficit < 0.5:
        return "faible"
    if deficit < 0.75:
        return "modere"
    if deficit < 0.9:
        return "eleve"
    return "tres_eleve"


@router.get("/weather-risk")
async def weather_risk():
    """Indice de déficit hydrique = 1 - Pluie / ET0 sur 14 j passés + 7 j prévus."""
    if _cache["data"] and time.time() - _cache["t"] < CACHE_TTL:
        return _cache["data"]

    names = list(GOVERNORATES)
    params = {
        "latitude": ",".join(str(GOVERNORATES[n][0]) for n in names),
        "longitude": ",".join(str(GOVERNORATES[n][1]) for n in names),
        "daily": "precipitation_sum,et0_fao_evapotranspiration",
        "past_days": PAST_DAYS,
        "forecast_days": FORECAST_DAYS,
        "timezone": "Africa/Tunis",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(OPEN_METEO, params=params)
        r.raise_for_status()
        payload = r.json()  # liste, une entrée par coordonnée

    out = []
    for name, loc in zip(names, payload):
        p = [v or 0.0 for v in loc["daily"]["precipitation_sum"]]
        et = [v or 0.0 for v in loc["daily"]["et0_fao_evapotranspiration"]]
        p_sum, et_sum = sum(p), sum(et)
        deficit = min(1.0, max(0.0, 1 - p_sum / et_sum)) if et_sum > 0 else 0.0
        out.append(
            {
                "name": name,
                "lat": GOVERNORATES[name][0],
                "lon": GOVERNORATES[name][1],
                "rain_past_mm": round(sum(p[:PAST_DAYS]), 1),
                "rain_next_mm": round(sum(p[PAST_DAYS:]), 1),
                "et0_total_mm": round(et_sum, 1),
                "deficit_index": round(deficit, 2),
                "level": _level(deficit),
            }
        )
    _cache.update(t=time.time(), data=out)
    return out


# ---------- Analyses réelles de l'app ----------
def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as c:
        c.execute(
            """CREATE TABLE IF NOT EXISTS analyses(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT DEFAULT (datetime('now')),
            lat REAL, lon REAL, crop TEXT, label TEXT,
            confidence REAL, model_version TEXT)"""
        )


def save_analysis(lat, lon, crop, label, confidence, model_version=None):
    """À appeler dans /predict, SEULEMENT si l'utilisateur a accepté de partager sa position.
    Position arrondie à 2 décimales (~1 km) : la parcelle exacte n'est jamais stockée."""
    with sqlite3.connect(DB_PATH) as c:
        c.execute(
            "INSERT INTO analyses(lat,lon,crop,label,confidence,model_version) VALUES(?,?,?,?,?,?)",
            (round(lat, 2), round(lon, 2), crop, label, round(confidence, 3), model_version),
        )


@router.get("/analyses")
def analyses(days: int = Query(30, ge=1, le=365)):
    with sqlite3.connect(DB_PATH) as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(
            "SELECT created_at,lat,lon,crop,label,confidence FROM analyses "
            "WHERE created_at >= datetime('now', ?) ORDER BY created_at DESC LIMIT 2000",
            (f"-{days} days",),
        ).fetchall()
    return [dict(r) for r in rows]
