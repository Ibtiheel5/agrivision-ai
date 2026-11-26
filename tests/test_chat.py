"""Tests de l'API avec STT / LLM / TTS simulés (aucun modèle téléchargé)."""

import copy
import io
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app import providers  # noqa: E402
from app.routers import chat  # noqa: E402

REAL_GENERATE = providers.generate  # la fixture ci-dessous remplace providers.generate par un faux
REAL_TRANSCRIBE = providers.transcribe
REAL_SYNTHESIZE = providers.synthesize

app = FastAPI()
app.include_router(chat.router)
client = TestClient(app)


@pytest.fixture(autouse=True)
def fake_providers(monkeypatch):
    calls = {}

    def fake_generate(system, messages):
        calls["system"], calls["messages"] = system, messages
        return "ورقة الطماطم فيها مرض، ركّز على التهوية"

    async def fake_tts(text):
        calls["tts_text"] = text
        return b"ID3fake-mp3", "audio/mpeg"

    monkeypatch.setattr(providers, "generate", fake_generate)
    monkeypatch.setattr(providers, "transcribe", lambda audio: "علاش الورقة تاعي صفراء؟")
    monkeypatch.setattr(providers, "synthesize", fake_tts)
    return calls


def test_chat_includes_diagnosis_and_latin_rule(fake_providers):
    r = client.post(
        "/chat",
        json={
            "message": "chnowa na3mel?",
            "diagnosis": {"label": "Tomato_Late_blight", "confidence": 0.42},
            "script": "latin",
        },
    )
    assert r.status_code == 200 and r.json()["reply"]
    assert "Tomato_Late_blight" in fake_providers["system"]
    assert "42 %" in fake_providers["system"]
    assert "arabizi" in fake_providers["system"]


def test_chat_history_is_truncated(fake_providers):
    history = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"m{i}"} for i in range(30)]
    client.post("/chat", json={"message": "salut", "history": history})
    assert len(fake_providers["messages"]) == chat.MAX_HISTORY + 1


def test_chat_rejects_empty_message():
    assert client.post("/chat", json={"message": ""}).status_code == 422


def test_voice_chat_pipeline_forces_arabic_script(fake_providers):
    r = client.post(
        "/voice-chat",
        files={"audio": ("a.webm", b"\x1aE\xdf\xa3fake", "audio/webm")},
        data={"diagnosis_label": "Corn_Rust", "diagnosis_confidence": "0.9"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["transcript"].startswith("علاش")
    assert body["audio_base64"] and body["audio_mime"] == "audio/mpeg"
    assert "LETTRES ARABES" in fake_providers["system"]
    assert "Corn_Rust" in fake_providers["system"]
    assert fake_providers["tts_text"] == body["reply"]


def test_voice_chat_empty_audio():
    r = client.post("/voice-chat", files={"audio": ("a.webm", b"", "audio/webm")})
    assert r.status_code == 400


def test_voice_chat_no_speech(monkeypatch):
    monkeypatch.setattr(providers, "transcribe", lambda audio: "")
    r = client.post("/voice-chat", files={"audio": ("a.webm", b"x", "audio/webm")})
    assert r.status_code == 422


def test_llm_failure_gives_502(monkeypatch):
    def boom(system, messages):
        raise RuntimeError("clé API manquante")

    monkeypatch.setattr(providers, "generate", boom)
    assert client.post("/chat", json={"message": "salut"}).status_code == 502


def test_stt_uses_faster_whisper(monkeypatch):
    """transcribe() doit passer l'audio à faster-whisper et concaténer les segments."""
    import importlib
    import types

    class Seg:
        def __init__(self, text):
            self.text = text

    seen = {}

    class FakeModel:
        def __init__(self, name, **kw):
            seen["init"] = (name, kw)

        def transcribe(self, audio, **kw):
            seen["kw"] = kw
            return iter([Seg(" مرحبا "), Seg("كيفاش")]), None

    import numpy as np

    monkeypatch.setitem(sys.modules, "faster_whisper", types.SimpleNamespace(WhisperModel=FakeModel))
    importlib.reload(providers)
    # Un backend/.env local ne doit pas influencer le test (il peut choisir « gemini »).
    providers.STT_PROVIDER = "faster-whisper"
    providers.STT_COMPUTE = "int8"
    providers.STT_BEAM_SIZE = 1
    providers.STT_MODEL = "small"  # nom court : pas de dossier local requis
    providers._decode_audio = lambda data, rate=16000: np.zeros(16000, dtype=np.float32)
    try:
        assert providers.transcribe(b"abc") == "مرحبا كيفاش"
        assert seen["init"][1]["compute_type"] == "int8"
        assert seen["kw"]["language"] == "ar" and seen["kw"]["beam_size"] == 1
        assert "ورقة" in seen["kw"]["initial_prompt"]  # vocabulaire agricole soufflé
    finally:
        monkeypatch.undo()
        importlib.reload(providers)


def test_voice_chat_uses_history(fake_providers):
    import json

    hist = json.dumps([{"role": "user", "content": "salut"}, {"role": "assistant", "content": "ahla"}])
    r = client.post("/voice-chat", files={"audio": ("a.webm", b"x", "audio/webm")}, data={"history": hist})
    assert r.status_code == 200
    assert [m["content"] for m in fake_providers["messages"][:2]] == ["salut", "ahla"]


def test_voice_chat_bad_history_is_ignored(fake_providers):
    r = client.post("/voice-chat", files={"audio": ("a.webm", b"x", "audio/webm")}, data={"history": "{pas du json"})
    assert r.status_code == 200 and len(fake_providers["messages"]) == 1


def test_tts_endpoint(fake_providers):
    r = client.post("/tts", json={"text": "مرحبا"})
    assert r.status_code == 200
    assert r.json()["audio_base64"] and fake_providers["tts_text"] == "مرحبا"


def test_tts_rejects_empty_and_long():
    assert client.post("/tts", json={"text": ""}).status_code == 422
    assert client.post("/tts", json={"text": "x" * 1001}).status_code == 422


def test_tts_failure_gives_502(monkeypatch):
    async def boom(text):  # noqa: D401
        raise RuntimeError("hors ligne")

    monkeypatch.setattr(providers, "synthesize", boom)
    assert client.post("/tts", json={"text": "salut"}).status_code == 502


class _FakeResp:
    def __init__(self, status, payload):
        self.status_code, self._p, self.text = status, payload, str(payload)

    def json(self):
        return self._p


def test_gemini_provider_request_and_parse(monkeypatch):
    import httpx

    seen = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        seen.update(url=url, headers=headers, json=json)
        return _FakeResp(200, {"candidates": [{"content": {"parts": [{"text": " مرحبا "}, {"text": "بيك"}]}}]})

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(providers, "LLM_PROVIDER", "gemini")
    monkeypatch.setattr(providers, "LLM_MODEL", "gemini-3.6-flash")
    monkeypatch.setenv("GEMINI_API_KEY", "k-test")
    out = REAL_GENERATE(
        "SYS",
        [{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"}, {"role": "user", "content": "c"}],
    )
    assert out == "مرحبا بيك"
    assert seen["url"].endswith("/models/gemini-3.6-flash:generateContent")
    assert seen["headers"]["x-goog-api-key"] == "k-test"
    assert seen["json"]["systemInstruction"]["parts"][0]["text"] == "SYS"
    assert [c["role"] for c in seen["json"]["contents"]] == ["user", "model", "user"]


def test_gemini_errors_are_explicit(monkeypatch):
    import httpx

    monkeypatch.setattr(providers, "LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setattr(httpx, "post", lambda *a, **k: _FakeResp(400, {"error": "API key not valid"}))
    with pytest.raises(RuntimeError, match="Gemini 400"):
        REAL_GENERATE("s", [{"role": "user", "content": "x"}])
    monkeypatch.setattr(
        httpx, "post", lambda *a, **k: _FakeResp(200, {"candidates": [], "promptFeedback": {"blockReason": "SAFETY"}})
    )
    with pytest.raises(RuntimeError, match="vide ou bloquée"):
        REAL_GENERATE("s", [{"role": "user", "content": "x"}])
    monkeypatch.delenv("GEMINI_API_KEY")
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="GEMINI_API_KEY manquante"):
        REAL_GENERATE("s", [{"role": "user", "content": "x"}])


def test_stt_missing_folder_gives_clear_error(monkeypatch):
    monkeypatch.setattr(providers, "STT_MODEL", "models/n-existe-pas")
    with pytest.raises(RuntimeError, match="convert_stt_model"):
        providers._stt_model_ref()


def test_stt_short_name_passes_through(monkeypatch):
    monkeypatch.setattr(providers, "STT_MODEL", "small")
    assert providers._stt_model_ref() == "small"


def test_stt_relative_path_resolves_to_backend(monkeypatch, tmp_path):
    monkeypatch.setattr(providers, "_BACKEND_DIR", tmp_path)
    (tmp_path / "models" / "m").mkdir(parents=True)
    monkeypatch.setattr(providers, "STT_MODEL", "models/m")
    assert providers._stt_model_ref() == str(tmp_path / "models" / "m")


def test_clean_strips_quotes_and_spaces():
    assert providers._clean('"AQ.abc"') == "AQ.abc"
    assert providers._clean("'AQ.abc' ") == "AQ.abc"
    assert providers._clean("  AQ.abc  ") == "AQ.abc"
    assert providers._clean(None) == ""


def test_gemini_key_from_env_is_cleaned(monkeypatch):
    import httpx

    seen = {}
    monkeypatch.setattr(providers, "LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", '"AQ.avec-guillemets"')
    monkeypatch.setattr(
        httpx,
        "post",
        lambda url, headers=None, json=None, timeout=None: (
            seen.update(headers=headers) or _FakeResp(200, {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]})
        ),
    )
    REAL_GENERATE("s", [{"role": "user", "content": "x"}])
    assert seen["headers"]["x-goog-api-key"] == "AQ.avec-guillemets"


def test_decode_audio_real_wav():
    """Décodage d'un vrai WAV 8 kHz stéréo -> float32 mono 16 kHz (le double d'échantillons)."""
    import struct
    import wave

    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(8000)
        w.writeframes(b"".join(struct.pack("<hh", 8000, 8000) for _ in range(8000)))  # 1 s
    samples = providers._decode_audio(buf.getvalue())
    assert samples.dtype.name == "float32"
    assert abs(samples.size - 16000) < 200  # ~1 s à 16 kHz
    assert 0.2 < float(abs(samples).max()) < 0.3  # 8000/32768


def test_transcribe_ignores_too_short_audio(monkeypatch):
    import numpy as np

    monkeypatch.setattr(providers, "_decode_audio", lambda d, rate=16000: np.zeros(10, dtype=np.float32))
    assert REAL_TRANSCRIBE(b"x") == ""


def test_arabic_prompt_demands_real_derja():
    sys_prompt = chat.build_system(None, "arabic")
    assert "LETTRES ARABES" in sys_prompt
    for mot in ("برشا", "شنوة", "فصحى", "ما تخافش"):
        assert mot in sys_prompt
    assert "arabizi" not in chat.build_system(None, "arabic")
    assert "arabizi" in chat.build_system(None, "latin")


def test_tts_passes_voice_rate_pitch(monkeypatch):
    import asyncio
    import types

    seen = {}

    class FakeCommunicate:
        def __init__(self, text, voice, rate=None, pitch=None):
            seen.update(text=text, voice=voice, rate=rate, pitch=pitch)

        async def stream(self):
            yield {"type": "audio", "data": b"ID3"}

    monkeypatch.setitem(sys.modules, "edge_tts", types.SimpleNamespace(Communicate=FakeCommunicate))
    monkeypatch.setattr(providers, "TTS_VOICE", "ar-TN-HediNeural")
    monkeypatch.setattr(providers, "TTS_RATE", "-10%")
    monkeypatch.setattr(providers, "TTS_PITCH", "-5Hz")
    monkeypatch.setattr(providers, "TTS_PROVIDER", "edge")
    assert asyncio.run(REAL_SYNTHESIZE("مرحبا")) == (b"ID3", "audio/mpeg")
    assert seen == {"text": "مرحبا", "voice": "ar-TN-HediNeural", "rate": "-10%", "pitch": "-5Hz"}


def test_voice_chat_returns_timings(fake_providers):
    r = client.post("/voice-chat", files={"audio": ("a.webm", b"x", "audio/webm")})
    t = r.json()["timings_ms"]
    assert set(t) == {"stt", "llm", "tts", "total"}
    assert all(isinstance(v, int) and v >= 0 for v in t.values())


def test_gemini_sends_thinking_level_and_falls_back_on_400(monkeypatch):
    import httpx

    calls = []

    def fake_post(url, headers=None, json=None, timeout=None):
        calls.append(copy.deepcopy(json))  # le code réutilise le même dict : on fige l'état
        if len(calls) == 1:
            return _FakeResp(400, {"error": {"message": "Request contains an invalid argument."}})
        return _FakeResp(200, {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]})

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(providers, "LLM_PROVIDER", "gemini")
    monkeypatch.setattr(providers, "GEMINI_THINKING", "low")
    monkeypatch.setattr(providers, "_thinking_supported", True)
    monkeypatch.setenv("GEMINI_API_KEY", "k")

    assert REAL_GENERATE("s", [{"role": "user", "content": "x"}]) == "ok"
    assert calls[0]["generationConfig"]["thinkingConfig"] == {"thinkingLevel": "low"}
    assert "thinkingConfig" not in calls[1]["generationConfig"]  # repli, message d'erreur muet
    assert providers._thinking_supported is False  # plus réessayé ensuite

    REAL_GENERATE("s", [{"role": "user", "content": "y"}])
    assert "thinkingConfig" not in calls[2]["generationConfig"]


def test_gemini_numeric_thinking_uses_legacy_budget(monkeypatch):
    import httpx

    calls = []
    monkeypatch.setattr(
        httpx,
        "post",
        lambda url, headers=None, json=None, timeout=None: (
            calls.append(copy.deepcopy(json))
            or _FakeResp(200, {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]})
        ),
    )
    monkeypatch.setattr(providers, "LLM_PROVIDER", "gemini")
    monkeypatch.setattr(providers, "GEMINI_THINKING", "0")  # ancien paramètre Gemini 2.5
    monkeypatch.setattr(providers, "_thinking_supported", True)
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    REAL_GENERATE("s", [{"role": "user", "content": "x"}])
    assert calls[0]["generationConfig"]["thinkingConfig"] == {"thinkingBudget": 0}


def test_gemini_thinking_can_be_disabled(monkeypatch):
    import httpx

    calls = []
    monkeypatch.setattr(
        httpx,
        "post",
        lambda url, headers=None, json=None, timeout=None: (
            calls.append(copy.deepcopy(json))
            or _FakeResp(200, {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]})
        ),
    )
    monkeypatch.setattr(providers, "LLM_PROVIDER", "gemini")
    monkeypatch.setattr(providers, "GEMINI_THINKING", "")  # on laisse le modèle décider
    monkeypatch.setattr(providers, "_thinking_supported", True)
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    REAL_GENERATE("s", [{"role": "user", "content": "x"}])
    assert "thinkingConfig" not in calls[0]["generationConfig"]


def test_gemini_tts_request_and_wav(monkeypatch):
    """TTS_PROVIDER=gemini : consigne de style envoyée, WAV décodé depuis steps[].content[]."""
    import asyncio
    import base64
    import httpx

    seen = {}
    wav = b"RIFF....WAVEfmt "

    def fake_post(url, headers=None, json=None, timeout=None):
        seen.update(url=url, headers=headers, body=json)
        return _FakeResp(
            200,
            {
                "steps": [
                    {"type": "other", "content": [{"type": "text", "data": "ignore"}]},
                    {
                        "type": "model_output",
                        "content": [
                            {"type": "text", "data": "ignore"},
                            {"type": "audio", "data": base64.b64encode(wav).decode()},
                        ],
                    },
                ]
            },
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(providers, "TTS_PROVIDER", "gemini")
    monkeypatch.setattr(providers, "GEMINI_TTS_VOICE", "Kore")
    monkeypatch.setenv("GEMINI_API_KEY", "k")

    assert asyncio.run(REAL_SYNTHESIZE("مرحبا")) == (wav, "audio/wav")
    assert seen["url"].endswith("/v1beta/interactions")
    assert seen["headers"]["x-goog-api-key"] == "k"
    body = seen["body"]
    assert body["generation_config"]["speech_config"] == [{"voice": "Kore"}]
    content = body["input"][0]["content"][0]
    assert content["text"] == "مرحبا"
    style = content["annotations"][0]["style"]
    assert "Tunisian" in style and "Derja" in style


def test_gemini_tts_errors(monkeypatch):
    import asyncio
    import httpx

    monkeypatch.setattr(providers, "TTS_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setattr(httpx, "post", lambda *a, **k: _FakeResp(400, {"error": "bad model"}))
    with pytest.raises(RuntimeError, match="Gemini TTS 400"):
        asyncio.run(REAL_SYNTHESIZE("x"))
    monkeypatch.setattr(httpx, "post", lambda *a, **k: _FakeResp(200, {"steps": []}))
    with pytest.raises(RuntimeError, match="aucun audio"):
        asyncio.run(REAL_SYNTHESIZE("x"))


def test_voice_chat_reports_wav_mime(monkeypatch, fake_providers):
    async def fake_wav(text):
        return b"RIFF", "audio/wav"

    monkeypatch.setattr(providers, "synthesize", fake_wav)
    body = client.post("/voice-chat", files={"audio": ("a.webm", b"x", "audio/webm")}).json()
    assert body["audio_mime"] == "audio/wav"


def test_arabic_prompt_has_derja_examples():
    p = chat.build_system(None, "arabic")
    assert "الاصفرار" in p and "نحّي الورقات" in p  # exemples de ton


def test_to_wav_is_valid_16k_mono():
    import wave

    import numpy as np

    data = providers._to_wav(np.linspace(-1, 1, 16000, dtype=np.float32))
    with wave.open(io.BytesIO(data), "rb") as w:
        assert (w.getnchannels(), w.getsampwidth(), w.getframerate()) == (1, 2, 16000)
        assert w.getnframes() == 16000


def test_gemini_stt_sends_wav_and_returns_text(monkeypatch):
    import numpy as np
    import base64
    import wave
    import httpx

    seen = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        seen.update(url=url, body=json)
        return _FakeResp(200, {"candidates": [{"content": {"parts": [{"text": " علاش الورقة صفرا "}]}}]})

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(providers, "STT_PROVIDER", "gemini")
    monkeypatch.setattr(providers, "_stt_gemini_model", None)
    monkeypatch.setattr(providers, "_decode_audio", lambda d, rate=16000: np.zeros(16000, dtype=np.float32))
    monkeypatch.setenv("GEMINI_API_KEY", "k")

    assert REAL_TRANSCRIBE(b"webm") == "علاش الورقة صفرا"
    part = seen["body"]["contents"][0]["parts"][1]["inline_data"]
    assert part["mime_type"] == "audio/wav"
    with wave.open(io.BytesIO(base64.b64decode(part["data"])), "rb") as w:
        assert w.getframerate() == 16000  # vrai WAV envoyé, pas du webm
    assert "derja" in seen["body"]["contents"][0]["parts"][0]["text"]


def test_gemini_stt_falls_back_to_other_model(monkeypatch):
    import numpy as np
    import httpx

    models = []

    def fake_post(url, headers=None, json=None, timeout=None):
        models.append(url.split("/models/")[1].split(":")[0])
        if len(models) == 1:
            return _FakeResp(404, {"error": "model not found"})
        return _FakeResp(200, {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]})

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(providers, "STT_PROVIDER", "gemini")
    monkeypatch.setattr(providers, "_stt_gemini_model", None)
    monkeypatch.setattr(providers, "STT_GEMINI_MODEL", "modele-inexistant")
    monkeypatch.setattr(providers, "STT_GEMINI_FALLBACK", "gemini-3.6-flash")
    monkeypatch.setattr(providers, "_decode_audio", lambda d, rate=16000: np.zeros(16000, dtype=np.float32))
    monkeypatch.setenv("GEMINI_API_KEY", "k")

    assert REAL_TRANSCRIBE(b"x") == "ok"
    assert models == ["modele-inexistant", "gemini-3.6-flash"]
    assert providers._stt_gemini_model == "gemini-3.6-flash"  # mémorisé


def test_gemini_stt_empty_answer(monkeypatch):
    import numpy as np
    import httpx

    monkeypatch.setattr(httpx, "post", lambda *a, **k: _FakeResp(200, {"candidates": []}))
    monkeypatch.setattr(providers, "STT_PROVIDER", "gemini")
    monkeypatch.setattr(providers, "_decode_audio", lambda d, rate=16000: np.zeros(16000, dtype=np.float32))
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    assert REAL_TRANSCRIBE(b"x") == ""


def test_chat_passes_recent_analyses(fake_providers):
    r = client.post(
        "/chat",
        json={
            "message": "el maradh elli 9ablt chnowa kan ?",
            "recent_analyses": [
                {"label": "Tomato_Late_blight", "confidence": 0.81, "when": "22 novembre"},
                {"label": "Corn_Rust", "confidence": 0.44},
            ],
        },
    )
    assert r.status_code == 200
    sys_prompt = fake_providers["system"]
    assert "Tomato_Late_blight (81 %), le 22 novembre" in sys_prompt
    assert "Corn_Rust (44 %)" in sys_prompt
    assert "N'en parle pas de toi-même" in sys_prompt  # pas de rappel non sollicité


def test_chat_without_analyses_has_no_section(fake_providers):
    client.post("/chat", json={"message": "salut"})
    assert "Analyses déjà faites" not in fake_providers["system"]


def test_recent_analyses_are_capped(fake_providers):
    many = [{"label": f"maladie{i}", "confidence": 0.5} for i in range(20)]
    client.post("/chat", json={"message": "x", "recent_analyses": many})
    assert "maladie7" in fake_providers["system"]
    assert "maladie8" not in fake_providers["system"]  # limité à MAX_ANALYSES


def test_voice_chat_accepts_recent_analyses(fake_providers):
    import json as _json

    r = client.post(
        "/voice-chat",
        files={"audio": ("a.webm", b"x", "audio/webm")},
        data={"recent_analyses": _json.dumps([{"label": "Grape_Black_rot", "confidence": 0.7}])},
    )
    assert r.status_code == 200
    assert "Grape_Black_rot (70 %)" in fake_providers["system"]


def test_voice_chat_bad_analyses_json_is_ignored(fake_providers):
    r = client.post("/voice-chat", files={"audio": ("a.webm", b"x", "audio/webm")}, data={"recent_analyses": "{oops"})
    assert r.status_code == 200
    assert "Analyses déjà faites" not in fake_providers["system"]


def test_chat_rejects_malformed_analysis():
    r = client.post("/chat", json={"message": "x", "recent_analyses": [{"label": "a", "confidence": 5}]})
    assert r.status_code == 422  # confiance hors de [0, 1]
