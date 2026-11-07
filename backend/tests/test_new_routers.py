from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import advice
from app.routers.weather import compute_alert, describe

app = FastAPI()
app.include_router(advice.router)
client = TestClient(app)


def post(label, conf):
    return client.post("/advice", json={"label": label, "confidence": conf}).json()


def test_healthy():
    assert post("Tomato healthy", 0.9)["status"] == "sain"


def test_late_blight_before_generic_spot():
    assert "Mildiou" in post("Tomato leaf late blight", 0.8)["title"]


def test_bell_pepper_spot():
    assert post("Bell_pepper leaf spot", 0.7)["title"] == "Taches foliaires"


def test_low_confidence_abstains():
    assert post("Tomato leaf late blight", 0.3)["status"] == "incertain"


def test_unknown_label_generic():
    assert post("Xyz", 0.9)["title"] == "Problème détecté"


def test_alert_levels():
    assert compute_alert(0, 40, [30] * 7)["level"] == "alerte"
    assert compute_alert(15, 40, [30] * 7)["level"] == "vigilance"
    assert compute_alert(30, 40, [30] * 7)["level"] == "aucune"
    assert compute_alert(30, 40, [40, 41] + [30] * 5)["level"] == "vigilance"


def test_describe():
    assert describe(0) == "Ciel dégagé" and describe(95) == "Orage"
