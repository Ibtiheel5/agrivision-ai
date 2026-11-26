"""Météo agricole : prévisions Open-Meteo (sans clé) et alertes utiles au champ.

Branchement : app.include_router(weather.router)
"""

import logging
from typing import Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from ..tunisia import BY_ID, GOVERNORATES

logger = logging.getLogger("agrivision.weather")
router = APIRouter(prefix="/weather", tags=["météo"])

OPEN_METEO = "https://api.open-meteo.com/v1/forecast"

# Codes WMO renvoyés par Open-Meteo.
WMO: Dict[int, tuple] = {
    0: ("Ciel dégagé", "sun"),
    1: ("Peu nuageux", "sun"),
    2: ("Partiellement nuageux", "cloud"),
    3: ("Couvert", "cloud"),
    45: ("Brouillard", "cloud"),
    48: ("Brouillard givrant", "cloud"),
    51: ("Bruine faible", "rain"),
    53: ("Bruine", "rain"),
    55: ("Bruine dense", "rain"),
    56: ("Bruine verglaçante", "rain"),
    57: ("Bruine verglaçante dense", "rain"),
    61: ("Pluie faible", "rain"),
    63: ("Pluie", "rain"),
    65: ("Pluie forte", "rain"),
    66: ("Pluie verglaçante", "rain"),
    67: ("Pluie verglaçante forte", "rain"),
    71: ("Neige faible", "cloud"),
    73: ("Neige", "cloud"),
    75: ("Neige forte", "cloud"),
    77: ("Grains de neige", "cloud"),
    80: ("Averses faibles", "rain"),
    81: ("Averses", "rain"),
    82: ("Averses violentes", "rain"),
    85: ("Averses de neige", "cloud"),
    86: ("Fortes averses de neige", "cloud"),
    95: ("Orage", "rain"),
    96: ("Orage avec grêle", "rain"),
    97: ("Orage violent", "rain"),
    99: ("Orage avec forte grêle", "rain"),
}


class Place(BaseModel):
    id: str
    name: str
    lat: float
    lon: float


class Current(BaseModel):
    temperature: float
    humidity: int
    wind: float
    description: str
    icon: str


class Day(BaseModel):
    date: str
    tmax: float
    tmin: float
    rain: float
    description: str
    icon: str


class Alert(BaseModel):
    level: str  # "info" | "warn" | "danger"
    title: str
    detail: str


class WeatherResponse(BaseModel):
    place: Place
    current: Current
    days: List[Day]
    alerts: List[Alert]


def describe(code: Optional[int]) -> tuple:
    return WMO.get(int(code) if code is not None else -1, ("Conditions inconnues", "cloud"))


def build_alerts(current: Current, days: List[Day]) -> List[Alert]:
    """Lectures agronomiques simples : risques de maladie et conditions de traitement."""
    alerts: List[Alert] = []
    rain_total = sum(d.rain for d in days[:3])

    if current.humidity >= 80 and 10 <= current.temperature <= 25:
        alerts.append(
            Alert(
                level="danger",
                title="Risque de mildiou élevé",
                detail="Humidité forte et températures douces : conditions idéales pour le mildiou. "
                "Surveille tomate et pomme de terre, et aère les cultures sous abri.",
            )
        )
    elif current.humidity >= 70 and rain_total >= 5:
        alerts.append(
            Alert(
                level="warn",
                title="Conditions favorables aux maladies du feuillage",
                detail="Pluie et humidité attendues : inspecte le feuillage après l'épisode pluvieux.",
            )
        )

    if 20 <= current.temperature <= 30 and 40 <= current.humidity <= 70:
        alerts.append(
            Alert(
                level="warn",
                title="Risque d'oïdium",
                detail="Temps chaud et sec en journée : surveille les poudres blanches sur courges et vigne.",
            )
        )

    if any(d.tmax >= 38 for d in days[:3]):
        alerts.append(
            Alert(
                level="danger",
                title="Coup de chaleur attendu",
                detail="Plus de 38 °C prévus : arrose tôt le matin et évite tout traitement en pleine journée.",
            )
        )

    if current.wind >= 20:
        alerts.append(
            Alert(
                level="warn",
                title="Vent trop fort pour traiter",
                detail="Au-delà de 20 km/h, la bouillie dérive : reporte la pulvérisation.",
            )
        )
    elif rain_total < 1 and current.wind < 15:
        alerts.append(
            Alert(
                level="info",
                title="Fenêtre favorable aux traitements",
                detail="Peu de vent et pas de pluie annoncée : conditions correctes pour intervenir.",
            )
        )

    return alerts


def fetch(lat: float, lon: float) -> dict:
    r = httpx.get(
        OPEN_METEO,
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
            "timezone": "auto",
            "forecast_days": 5,
        },
        timeout=20,
    )
    r.raise_for_status()
    return r.json()


@router.get("/places", response_model=List[Place])
async def places() -> List[Place]:
    """Liste des gouvernorats proposés."""
    return [Place(**g) for g in GOVERNORATES]


@router.get("", response_model=WeatherResponse)
async def weather(place: str = Query("tunis", description="identifiant de gouvernorat")) -> WeatherResponse:
    gov = BY_ID.get(place)
    if not gov:
        raise HTTPException(404, f"Gouvernorat inconnu : {place}")

    try:
        data = await run_in_threadpool(fetch, gov["lat"], gov["lon"])
    except Exception as exc:
        logger.warning("Open-Meteo indisponible : %s", exc)
        raise HTTPException(502, "Service météo indisponible") from exc

    cur = data.get("current") or {}
    label, icon = describe(cur.get("weather_code"))
    current = Current(
        temperature=round(float(cur.get("temperature_2m", 0)), 1),
        humidity=int(cur.get("relative_humidity_2m", 0)),
        wind=round(float(cur.get("wind_speed_10m", 0)), 1),
        description=label,
        icon=icon,
    )

    daily = data.get("daily") or {}
    days: List[Day] = []
    for i, date in enumerate(daily.get("time", [])):
        d_label, d_icon = describe((daily.get("weather_code") or [None])[i])
        days.append(
            Day(
                date=date,
                tmax=round(float(daily["temperature_2m_max"][i]), 1),
                tmin=round(float(daily["temperature_2m_min"][i]), 1),
                rain=round(float(daily["precipitation_sum"][i] or 0), 1),
                description=d_label,
                icon=d_icon,
            )
        )

    return WeatherResponse(place=Place(**gov), current=current, days=days, alerts=build_alerts(current, days))
