"""Profil de voix : mesure de la hauteur (F0) et étiquette indicative."""
import sys
import numpy as np
import pytest
sys.path.insert(0, "/home/claude/derja_voice/backend")
from app import providers


def voix(f0, secondes=1.5, rate=16000, bruit=0.0, harmoniques=6):
    """Signal périodique riche en harmoniques : imite grossièrement une voyelle tenue."""
    t = np.arange(int(secondes * rate)) / rate
    s = np.zeros_like(t)
    for k in range(1, harmoniques + 1):
        s += (1.0 / k) * np.sin(2 * np.pi * f0 * k * t + k * 0.3)
    if bruit:
        s += np.random.default_rng(0).normal(0, bruit, s.shape)
    return (s / np.abs(s).max()).astype(np.float32)


@pytest.fixture(autouse=True)
def sans_decodage(monkeypatch):
    """On injecte directement les échantillons : le test porte sur la mesure, pas sur PyAV."""
    monkeypatch.setattr(providers, "_decode_audio", lambda data, rate=16000: data)


@pytest.mark.parametrize("f0,attendu", [(100, "homme"), (120, "homme"), (145, "homme"),
                                        (195, "femme"), (210, "femme"), (240, "femme")])
def test_classe_les_hauteurs_typiques(f0, attendu):
    p = providers.profil_voix(voix(f0))
    assert p["genre"] == attendu, p
    assert abs(p["f0_hz"] - f0) < 5, p


def test_zone_grise_non_tranchee():
    """Entre 155 et 180 Hz les deux voix se chevauchent : on refuse de deviner."""
    p = providers.profil_voix(voix(167))
    assert p["genre"] == "indetermine"
    assert p["confiance"] == 0.0


def test_audio_trop_court():
    assert providers.profil_voix(voix(120, secondes=0.1))["genre"] == "indetermine"


def test_silence():
    assert providers.profil_voix(np.zeros(16000, dtype=np.float32))["genre"] == "indetermine"


def test_bruit_blanc_non_classe():
    bruit = np.random.default_rng(1).normal(0, 0.3, 16000).astype(np.float32)
    assert providers.profil_voix(bruit)["genre"] == "indetermine"


def test_resiste_a_du_bruit_modere():
    p = providers.profil_voix(voix(115, bruit=0.08))
    assert p["genre"] == "homme" and p["confiance"] > 0


def test_confiance_plus_forte_loin_de_la_zone_grise():
    proche = providers.profil_voix(voix(152))["confiance"]
    loin = providers.profil_voix(voix(100))["confiance"]
    assert loin > proche


def test_seuils_reglables(monkeypatch):
    monkeypatch.setattr(providers, "F0_FEMME_MIN", 140.0)
    monkeypatch.setattr(providers, "F0_HOMME_MAX", 130.0)
    assert providers.profil_voix(voix(150))["genre"] == "femme"