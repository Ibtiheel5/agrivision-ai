"""Carte des risques : signalements anonymisés de maladies, agrégés par gouvernorat.

Aucune photo n'est stockée, et les coordonnées sont arrondies à environ 1 km avant enregistrement.
Branchement : app.include_router(risk_map.router) et risk_map.init_db() au démarrage.
"""

import logging
import os
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import APIRouter, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from ..tunisia import GOVERNORATES, nearest

logger = logging.getLogger("agrivision.riskmap")
router = APIRouter(prefix="/risk-map", tags=["carte des risques"])

DB_PATH = Path(os.getenv("RISK_MAP_DB", str(Path(__file__).resolve().parents[2] / "risk_map.sqlite3")))
PRECISION = 2  # 2 décimales ≈ 1 km : on ne sait pas localiser une parcelle précise


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS reports (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   label TEXT NOT NULL,
                   gov_id TEXT NOT NULL,
                   gov_name TEXT NOT NULL,
                   lat REAL NOT NULL,
                   lon REAL NOT NULL,
                   created_at TEXT NOT NULL
               )"""
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(created_at)")


class Report(BaseModel):
    label: str = Field(..., min_length=1, max_length=120)
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class ReportAck(BaseModel):
    stored: bool
    gov_id: str
    gov_name: str


class TopLabel(BaseModel):
    label: str
    count: int


class GovSummary(BaseModel):
    gov_id: str
    gov_name: str
    lat: float
    lon: float
    count: int
    top: List[TopLabel]


class Summary(BaseModel):
    days: int
    total: int
    governorates: List[GovSummary]


class GovRisk(BaseModel):
    gov_id: str
    gov_name: str
    lat: float
    lon: float
    score: int = Field(ge=0, le=100)
    level: str  # calme | warn | danger
    drivers: List[str]
    temperature: float
    humidity: int
    wind: float


class RiskMap(BaseModel):
    days: int
    total: int
    observed: List[GovSummary]
    weather: List[GovRisk]


def _insert(report: Report) -> dict:
    gov = nearest(report.lat, report.lon)
    with connect() as conn:
        conn.execute(
            "INSERT INTO reports (label, gov_id, gov_name, lat, lon, created_at) VALUES (?,?,?,?,?,?)",
            (
                report.label,
                gov["id"],
                gov["name"],
                round(report.lat, PRECISION),
                round(report.lon, PRECISION),
                datetime.now(timezone.utc).isoformat(timespec="seconds"),
            ),
        )
    return gov


@router.post("/report", response_model=ReportAck)
async def report(payload: Report) -> ReportAck:
    """Signale une détection. Position arrondie à ~1 km, jamais la parcelle exacte."""
    gov = await run_in_threadpool(_insert, payload)
    return ReportAck(stored=True, gov_id=gov["id"], gov_name=gov["name"])


def _summary(days: int) -> Summary:
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat(timespec="seconds")
    with connect() as conn:
        rows = conn.execute(
            "SELECT gov_id, gov_name, lat, lon, label FROM reports WHERE created_at >= ?", (since,)
        ).fetchall()

    par_gov: dict = {}
    for row in rows:
        entry = par_gov.setdefault(
            row["gov_id"],
            {"gov_id": row["gov_id"], "gov_name": row["gov_name"], "lat": row["lat"], "lon": row["lon"],
             "count": 0, "labels": {}},
        )
        entry["count"] += 1
        entry["labels"][row["label"]] = entry["labels"].get(row["label"], 0) + 1

    governorates = [
        GovSummary(
            gov_id=e["gov_id"], gov_name=e["gov_name"], lat=e["lat"], lon=e["lon"], count=e["count"],
            top=[TopLabel(label=l, count=c) for l, c in sorted(e["labels"].items(), key=lambda kv: -kv[1])[:3]],
        )
        for e in sorted(par_gov.values(), key=lambda e: -e["count"])
    ]
    return Summary(days=days, total=len(rows), governorates=governorates)


@router.get("/summary", response_model=Summary)
async def summary(days: int = Query(30, ge=1, le=365)) -> Summary:
    """Nombre de signalements par gouvernorat sur la période, avec les maladies dominantes."""
    return await run_in_threadpool(_summary, days)

# ───────────────────────── Risque agronomique calculé ─────────────────────────
# Les signalements sont rares au démarrage : une carte qui n'affiche qu'eux reste vide
# et n'aide personne. On y superpose un risque calculé depuis la météo de chaque
# gouvernorat, avec les mêmes règles agronomiques que les alertes de l'écran Météo.
#
# ATTENTION : c'est une heuristique transparente, pas un modèle épidémiologique validé.
# Chaque point de score vient d'une règle nommée, renvoyée dans « drivers » pour que
# l'utilisateur voie toujours POURQUOI un gouvernorat est en rouge.

OPEN_METEO_BULK = "https://api.open-meteo.com/v1/forecast"
CACHE_TTL_S = int(os.getenv("RISK_WEATHER_TTL", "3600"))  # 1 h : la météo ne bouge pas plus vite
_cache: dict = {"at": 0.0, "data": None}

REGLES = (
    # (identifiant, points, libellé affiché)
    ("mildiou", 45, "Humidité forte et températures douces : mildiou"),
    ("feuillage", 25, "Pluie et humidité : maladies du feuillage"),
    ("oidium", 20, "Chaud et moyennement sec : oïdium"),
    ("chaleur", 30, "Plus de 38 °C attendus"),
    ("vent", 10, "Vent trop fort pour traiter"),
)
POINTS = {cle: pts for cle, pts, _ in REGLES}
LIBELLES = {cle: txt for cle, _, txt in REGLES}


def _regles_declenchees(temp: float, hum: float, vent: float, pluie3: float, tmax3: float) -> List[str]:
    """Quelles règles s'appliquent, dans l'ordre de gravité. Mêmes seuils que les alertes météo."""
    actives = []
    if hum >= 80 and 10 <= temp <= 25:
        actives.append("mildiou")
    elif hum >= 70 and pluie3 >= 5:
        actives.append("feuillage")
    if 20 <= temp <= 30 and 40 <= hum <= 70:
        actives.append("oidium")
    if tmax3 >= 38:
        actives.append("chaleur")
    if vent >= 20:
        actives.append("vent")
    return actives


def _niveau(score: int) -> str:
    if score >= 45:
        return "danger"
    if score >= 20:
        return "warn"
    return "calme"


def _fetch_bulk() -> list:
    """Un seul appel Open-Meteo pour les 24 gouvernorats : la liste des coordonnées est acceptée."""
    r = httpx.get(
        OPEN_METEO_BULK,
        params={
            "latitude": ",".join(str(g["lat"]) for g in GOVERNORATES),
            "longitude": ",".join(str(g["lon"]) for g in GOVERNORATES),
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m",
            "daily": "temperature_2m_max,precipitation_sum",
            "timezone": "auto",
            "forecast_days": 3,
        },
        timeout=20,
    )
    r.raise_for_status()
    data = r.json()
    return data if isinstance(data, list) else [data]


def _risque_meteo() -> List["GovRisk"]:
    maintenant = time.time()
    if _cache["data"] is not None and maintenant - _cache["at"] < CACHE_TTL_S:
        return _cache["data"]

    blocs = _fetch_bulk()
    sortie: List[GovRisk] = []
    for gov, bloc_gov in zip(GOVERNORATES, blocs):
        actuel = bloc_gov.get("current") or {}
        jours = bloc_gov.get("daily") or {}
        temp = float(actuel.get("temperature_2m") or 0)
        hum = float(actuel.get("relative_humidity_2m") or 0)
        vent = float(actuel.get("wind_speed_10m") or 0)
        pluies = [float(v or 0) for v in (jours.get("precipitation_sum") or [])][:3]
        maxima = [float(v or 0) for v in (jours.get("temperature_2m_max") or [])][:3]
        actives = _regles_declenchees(temp, hum, vent, sum(pluies), max(maxima, default=0))
        score = min(100, sum(POINTS[c] for c in actives))
        sortie.append(GovRisk(
            gov_id=gov["id"], gov_name=gov["name"], lat=gov["lat"], lon=gov["lon"],
            score=score, level=_niveau(score),
            drivers=[LIBELLES[c] for c in actives],
            temperature=round(temp, 1), humidity=round(hum), wind=round(vent, 1),
        ))

    _cache["at"], _cache["data"] = maintenant, sortie
    return sortie


@router.get("/risk", response_model=RiskMap)
async def risk(days: int = Query(30, ge=1, le=365)) -> RiskMap:
    """
    Deux couches pour la carte : ce qui a été observé (signalements) et ce qui est probable
    (risque météo calculé). La seconde est disponible même sans aucun signalement.
    """
    observe = await run_in_threadpool(_summary, days)
    try:
        meteo = await run_in_threadpool(_risque_meteo)
    except Exception as exc:  # noqa: BLE001 - la couche météo est un bonus, jamais un bloqueur
        logger.warning("Risque météo indisponible : %s", exc)
        meteo = []
    return RiskMap(days=days, total=observe.total, observed=observe.governorates, weather=meteo)
