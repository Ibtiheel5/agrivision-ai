"""Météo + alertes réelles (Open-Meteo, gratuit non commercial, sans clé)."""
import time
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException

from .risk_map import GOVERNORATES

router = APIRouter(prefix="/weather", tags=["weather"])
URL = "https://api.open-meteo.com/v1/forecast"
TTL = 3600
HEAT_C = 38  # seuil HEURISTIQUE de forte chaleur
_cache: dict = {}


def describe(code: Optional[int]) -> str:
    """Codes météo WMO -> libellé français."""
    if code is None:
        return "Inconnu"
    if code == 0:
        return "Ciel dégagé"
    if code in (1, 2, 3):
        return "Partiellement nuageux"
    if code in (45, 48):
        return "Brouillard"
    if 51 <= code <= 57:
        return "Bruine"
    if 61 <= code <= 67:
        return "Pluie"
    if 71 <= code <= 77:
        return "Neige"
    if 80 <= code <= 82:
        return "Averses"
    if code >= 95:
        return "Orage"
    return "Variable"


def compute_alert(rain7: float, et07: float, tmaxs: list) -> dict:
    """Règle simple et transparente (seuils heuristiques, à calibrer)."""
    hot = sum(1 for t in tmaxs if t is not None and t >= HEAT_C)
    ratio = rain7 / et07 if et07 > 0 else 1.0
    if ratio < 0.2:
        level, title = "alerte", "Alerte déficit hydrique"
        msg = (f"Seulement {rain7:.0f} mm de pluie prévus sur 7 jours pour {et07:.0f} mm "
               "d'évapotranspiration de référence (ET0). Surveillez l'irrigation, arrosez tôt le matin ou le soir.")
    elif ratio < 0.5:
        level, title = "vigilance", "Vigilance déficit hydrique"
        msg = f"Pluie prévue ({rain7:.0f} mm) inférieure à la moitié de l'ET0 ({et07:.0f} mm) sur 7 jours."
    else:
        level, title, msg = "aucune", "Pas d'alerte", "Bilan pluie / ET0 correct sur 7 jours."
    if hot >= 2:
        msg += f" Forte chaleur (≥ {HEAT_C} °C) prévue {hot} jours."
        if level == "aucune":
            level, title = "vigilance", "Vigilance chaleur"
    return {"level": level, "title": title, "message": msg}


@router.get("/places")
def places():
    return [{"name": n, "lat": c[0], "lon": c[1]} for n, c in GOVERNORATES.items()]


@router.get("")
async def weather(place: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None):
    if place:
        if place not in GOVERNORATES:
            raise HTTPException(404, "Gouvernorat inconnu")
        lat, lon = GOVERNORATES[place]
    if lat is None or lon is None:
        raise HTTPException(422, "Fournir place ou lat/lon")
    key = (round(lat, 2), round(lon, 2))
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < TTL:
        return hit[1]

    params = {
        "latitude": lat, "longitude": lon, "timezone": "Africa/Tunis", "forecast_days": 7,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(URL, params=params)
            r.raise_for_status()
            d = r.json()
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Open-Meteo indisponible : {e}")

    cur, day = d["current"], d["daily"]
    days = [{
        "date": day["time"][i], "tmax": day["temperature_2m_max"][i], "tmin": day["temperature_2m_min"][i],
        "rain_mm": day["precipitation_sum"][i] or 0.0, "et0_mm": day["et0_fao_evapotranspiration"][i] or 0.0,
        "label": describe(day["weather_code"][i]),
    } for i in range(len(day["time"]))]
    rain7 = sum(x["rain_mm"] for x in days)
    et07 = sum(x["et0_mm"] for x in days)
    out = {
        "place": place, "lat": lat, "lon": lon,
        "current": {"temp": cur["temperature_2m"], "humidity": cur["relative_humidity_2m"],
                    "wind_kmh": cur["wind_speed_10m"], "rain_mm": cur["precipitation"],
                    "label": describe(cur["weather_code"])},
        "days": days,
        "summary": {"rain_next7_mm": round(rain7, 1), "et0_next7_mm": round(et07, 1)},
        "alert": compute_alert(rain7, et07, [x["tmax"] for x in days]),
    }
    _cache[key] = (time.time(), out)
    return out
