"""Reconnaissance indicative du locuteur (homme / femme) et accord en derja."""

import io
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app import providers  # noqa: E402
from app.routers import chat  # noqa: E402

app = FastAPI()
app.include_router(chat.router)
client = TestClient(app)


@pytest.fixture(autouse=True)
def faux_fournisseurs(monkeypatch):
    appels = {}

    def faux_generate(system, messages):
        appels["system"] = system
        return "الجواب"

    async def faux_tts(text):
        return b"ID3", "audio/mpeg"

    monkeypatch.setattr(providers, "generate", faux_generate)
    monkeypatch.setattr(providers, "transcribe", lambda audio: "علاش الورقة صفراء؟")
    monkeypatch.setattr(providers, "synthesize", faux_tts)
    return appels


def envoyer(**donnees):
    return client.post("/voice-chat", files={"audio": ("v.webm", io.BytesIO(b"xx"), "audio/webm")}, data=donnees)


def mesure(genre, confiance=0.9, f0=120.0):
    return lambda audio: {"genre": genre, "f0_hz": f0, "confiance": confiance, "trames_voisees": 40}


def test_renvoie_le_profil_mesure(monkeypatch):
    monkeypatch.setattr(providers, "profil_voix", mesure("femme", 0.8, 210.0))
    corps = envoyer().json()
    assert corps["speaker"] == {"genre": "femme", "f0_hz": 210.0, "confiance": 0.8, "source": "voix"}


def test_accord_masculin_dans_le_prompt(monkeypatch, faux_fournisseurs):
    monkeypatch.setattr(providers, "profil_voix", mesure("homme"))
    envoyer()
    assert "au masculin" in faux_fournisseurs["system"]
    assert "au féminin" not in faux_fournisseurs["system"]


def test_accord_feminin_dans_le_prompt(monkeypatch, faux_fournisseurs):
    monkeypatch.setattr(providers, "profil_voix", mesure("femme", 0.7, 205.0))
    envoyer()
    assert "au féminin" in faux_fournisseurs["system"]


def test_le_reglage_prime_sur_la_mesure(monkeypatch, faux_fournisseurs):
    """La voix dit « homme », l'utilisatrice a réglé « femme » : c'est le réglage qui gagne."""
    monkeypatch.setattr(providers, "profil_voix", mesure("homme", 0.95))
    corps = envoyer(speaker_gender="femme").json()
    assert corps["speaker"]["source"] == "reglage"
    assert corps["speaker"]["genre"] == "femme"
    assert "au féminin" in faux_fournisseurs["system"]


def test_pas_d_accord_si_mesure_peu_sure(monkeypatch, faux_fournisseurs):
    """Confiance sous le seuil : aucune consigne de genre, formulation neutre."""
    monkeypatch.setattr(providers, "profil_voix", mesure("femme", 0.2))
    envoyer()
    assert "au masculin" not in faux_fournisseurs["system"]
    assert "au féminin" not in faux_fournisseurs["system"]


def test_pas_d_accord_si_indetermine(monkeypatch, faux_fournisseurs):
    monkeypatch.setattr(providers, "profil_voix", mesure("indetermine", 0.0, 167.0))
    corps = envoyer().json()
    assert corps["speaker"]["genre"] == "indetermine"
    assert "au masculin" not in faux_fournisseurs["system"]


def test_mesure_en_echec_ne_casse_pas_la_conversation(monkeypatch):
    def plante(audio):
        raise RuntimeError("décodage impossible")

    monkeypatch.setattr(providers, "profil_voix", plante)
    r = envoyer()
    assert r.status_code == 200
    assert r.json()["reply"] == "الجواب"
    assert r.json()["speaker"]["genre"] == "indetermine"


def test_reglage_transmis_aussi_en_chat_texte(faux_fournisseurs):
    client.post("/chat", json={"message": "3aslema", "speaker_gender": "femme"})
    assert "au féminin" in faux_fournisseurs["system"]


def test_reglage_invalide_refuse():
    """Une valeur hors liste ne doit pas se glisser dans le prompt."""
    r = client.post("/chat", json={"message": "3aslema", "speaker_gender": "autre"})
    assert r.status_code == 422
