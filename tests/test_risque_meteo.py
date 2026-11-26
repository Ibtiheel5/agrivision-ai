"""Couche « risque calculé » de la carte : règles agronomiques, cache, et tolérance aux pannes."""

import sys
import time
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.routers import risk_map  # noqa: E402
from app.tunisia import GOVERNORATES  # noqa: E402


def bloc(temp=20.0, hum=50.0, vent=5.0, pluies=(0, 0, 0), maxima=(25, 25, 25)):
    return {
        "current": {"temperature_2m": temp, "relative_humidity_2m": hum, "wind_speed_10m": vent},
        "daily": {"precipitation_sum": list(pluies), "temperature_2m_max": list(maxima)},
    }


@pytest.fixture(autouse=True)
def cache_vide():
    risk_map._cache["at"], risk_map._cache["data"] = 0.0, None
    yield
    risk_map._cache["at"], risk_map._cache["data"] = 0.0, None


def patch(monkeypatch, blocs):
    appels = {"n": 0}

    def faux():
        appels["n"] += 1
        return blocs

    monkeypatch.setattr(risk_map, "_fetch_bulk", faux)
    return appels


def test_un_gouvernorat_par_entree(monkeypatch):
    patch(monkeypatch, [bloc() for _ in GOVERNORATES])
    res = risk_map._risque_meteo()
    assert len(res) == len(GOVERNORATES)
    assert [r.gov_id for r in res] == [g["id"] for g in GOVERNORATES]


@pytest.mark.parametrize(
    "args,attendu",
    [
        (dict(temp=18, hum=85), "mildiou"),
        (dict(temp=25, hum=60), "oidium"),
        (dict(temp=18, hum=75, pluies=(3, 3, 0)), "feuillage"),
        (dict(maxima=(39, 30, 30)), "chaleur"),
        (dict(vent=25), "vent"),
    ],
)
def test_chaque_regle_se_declenche(monkeypatch, args, attendu):
    patch(monkeypatch, [bloc(**args) for _ in GOVERNORATES])
    r = risk_map._risque_meteo()[0]
    assert risk_map.LIBELLES[attendu] in r.drivers, r.drivers


def test_mildiou_et_feuillage_sexcluent(monkeypatch):
    """Les deux règles décrivent le même phénomène : on ne compte pas deux fois."""
    patch(monkeypatch, [bloc(temp=18, hum=85, pluies=(10, 0, 0)) for _ in GOVERNORATES])
    d = risk_map._risque_meteo()[0].drivers
    assert risk_map.LIBELLES["mildiou"] in d
    assert risk_map.LIBELLES["feuillage"] not in d


def test_niveaux(monkeypatch):
    patch(monkeypatch, [bloc(temp=18, hum=85) for _ in GOVERNORATES])  # 45
    assert risk_map._risque_meteo()[0].level == "danger"
    risk_map._cache["data"] = None
    patch(monkeypatch, [bloc(temp=25, hum=60) for _ in GOVERNORATES])  # 20
    assert risk_map._risque_meteo()[0].level == "warn"
    risk_map._cache["data"] = None
    patch(monkeypatch, [bloc(temp=15, hum=30) for _ in GOVERNORATES])  # 0
    assert risk_map._risque_meteo()[0].level == "calme"


def test_score_plafonne_a_100(monkeypatch):
    patch(monkeypatch, [bloc(temp=18, hum=85, vent=30, maxima=(40, 40, 40)) for _ in GOVERNORATES])
    r = risk_map._risque_meteo()[0]
    assert r.score <= 100 and r.level == "danger"


def test_chaque_point_de_score_est_justifie(monkeypatch):
    """Un gouvernorat en rouge doit toujours pouvoir dire pourquoi."""
    patch(monkeypatch, [bloc(temp=18, hum=85, vent=25) for _ in GOVERNORATES])
    r = risk_map._risque_meteo()[0]
    assert r.score == sum(risk_map.POINTS[c] for c in risk_map.LIBELLES if risk_map.LIBELLES[c] in r.drivers)
    assert r.drivers, "score non nul sans explication"


def test_le_cache_evite_de_rappeler_open_meteo(monkeypatch):
    appels = patch(monkeypatch, [bloc() for _ in GOVERNORATES])
    risk_map._risque_meteo()
    risk_map._risque_meteo()
    risk_map._risque_meteo()
    assert appels["n"] == 1, "24 gouvernorats refetchés à chaque ouverture de la carte"


def test_le_cache_expire(monkeypatch):
    appels = patch(monkeypatch, [bloc() for _ in GOVERNORATES])
    risk_map._risque_meteo()
    risk_map._cache["at"] = time.time() - risk_map.CACHE_TTL_S - 1
    risk_map._risque_meteo()
    assert appels["n"] == 2


def test_valeurs_manquantes_ne_plantent_pas(monkeypatch):
    monkeypatch.setattr(risk_map, "_fetch_bulk", lambda: [{} for _ in GOVERNORATES])
    res = risk_map._risque_meteo()
    assert all(r.score == 0 and r.level == "calme" for r in res)
