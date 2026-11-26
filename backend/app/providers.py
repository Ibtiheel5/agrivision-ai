"""Briques interchangeables : STT (voix→texte), LLM (texte→texte), TTS (texte→voix).

Chaque fonction lit sa config dans les variables d'environnement, donc on peut
changer de modèle sans toucher au code (voir README).
"""

import io
import logging
import os
import random
import time
from pathlib import Path
from functools import lru_cache
from typing import Dict, List

try:  # facultatif : lit backend/.env (GEMINI_API_KEY=..., sans guillemets ni espaces)
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass

logger = logging.getLogger("agrivision.providers")


def _clean(value) -> str:
    """Enlève espaces et guillemets autour d'une valeur (erreur fréquente dans un .env)."""
    v = (value or "").strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        v = v[1:-1].strip()
    return v


# Dossier CTranslate2 (int8) produit par scripts/convert_stt_model.py, ou nom d'un modèle faster-whisper
# standard ("small", "base"…). Défaut : whisper-small tunisien converti (~250 Mo, adapté à 8 Go de RAM).
STT_MODEL = os.getenv("STT_MODEL", "models/whisper-small-tn-ct2")
STT_COMPUTE = os.getenv("STT_COMPUTE", "int8")  # int8 = 2 à 4x moins de RAM, quasi sans perte
# "faster-whisper" : local, gratuit, mais faible en derja. "gemini" : distant, bien meilleur en derja.
STT_PROVIDER = (_clean(os.getenv("STT_PROVIDER")) or "faster-whisper").lower()
STT_GEMINI_MODEL = _clean(os.getenv("STT_GEMINI_MODEL")) or "gemini-3.5-transcribe"
STT_GEMINI_FALLBACK = _clean(os.getenv("STT_GEMINI_FALLBACK")) or "gemini-3.6-flash"
STT_BEAM_SIZE = int(os.getenv("STT_BEAM_SIZE", "1"))  # 1 = le plus rapide ; 3 à 5 = plus juste, plus lent
# Vocabulaire soufflé au modèle local : oriente le décodage vers le domaine agricole.
STT_PROMPT = _clean(os.getenv("STT_PROMPT")) or (
    "حديث بالدارجة التونسية على النباتات و الفلاحة : ورقة، نبتة، مرض، صفرا، بقع، سقي، سماد، دوا، طماطم، فلفل، دالية، زيتون."
)
_stt_gemini_model = None  # modèle réellement accepté par l'API (déterminé au premier appel)
STT_THREADS = int(os.getenv("STT_THREADS", "0"))  # 0 = tous les coeurs
# "edge" : voix Microsoft ar-TN, rapide mais prononciation d'arabe standard.
# "gemini" : synthèse Gemini, pilotable par une consigne de style (plus tunisienne), via ta clé Gemini.
TTS_PROVIDER = (_clean(os.getenv("TTS_PROVIDER")) or "edge").lower()
TTS_VOICE = _clean(os.getenv("TTS_VOICE")) or "ar-TN-ReemNeural"  # ar-TN-HediNeural = voix masculine
GEMINI_TTS_MODEL = _clean(os.getenv("GEMINI_TTS_MODEL")) or "gemini-3.8-flash-tts"
GEMINI_TTS_VOICE = _clean(os.getenv("GEMINI_TTS_VOICE")) or "Kore"
GEMINI_TTS_STYLE = _clean(os.getenv("GEMINI_TTS_STYLE")) or (
    "Speak Tunisian Arabic (Derja) with a natural Tunisian accent, like someone from Tunis talking to a farmer: "
    "warm, friendly, unhurried, everyday spoken rhythm. Do not use Modern Standard Arabic pronunciation."
)
TTS_RATE = _clean(os.getenv("TTS_RATE")) or "+0%"  # ex. "-10%" pour parler plus lentement
TTS_PITCH = _clean(os.getenv("TTS_PITCH")) or "+0Hz"  # ex. "-5Hz" pour une voix plus grave
_GEMINI_KEY = _clean(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
# "gemini" | "anthropic" | "openai" (vLLM/Ollama, ex. Labess-7b-chat). Par défaut : gemini si une clé Gemini existe.
LLM_PROVIDER = os.getenv("LLM_PROVIDER") or ("gemini" if _GEMINI_KEY else "anthropic")
LLM_MODEL = os.getenv("LLM_MODEL") or ("gemini-3.6-flash" if LLM_PROVIDER == "gemini" else "claude-sonnet-5-5")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:11434/v1")
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "512"))  # réponses courtes = moins d'attente
# Niveau de « raisonnement » interne de Gemini, qui coûte du temps.
# Gemini 3.x : "minimal", "low", "medium", "high" (sans réglage, c'est "high" = le plus lent).
# Gemini 2.5 : mettre un nombre = budget en jetons ("0" désactive le raisonnement).
# Vide = on n'envoie rien et le modèle décide.
GEMINI_THINKING = _clean(os.getenv("GEMINI_THINKING", "low"))
_thinking_supported = True  # passe à False si l'API refuse l'option, pour ne plus la renvoyer

# Modèles de secours si le modèle principal est saturé (503) ou limité (429), dans l'ordre d'essai.
# Ex. : LLM_MODEL_FALLBACKS=gemini-3.5-flash,gemini-3.5-flash-lite
# Pour connaître les modèles ouverts à ta clé : GET https://generativelanguage.googleapis.com/v1beta/models
LLM_MODEL_FALLBACKS = [m for m in (_clean(os.getenv("LLM_MODEL_FALLBACKS")) or "").split(",") if m.strip()]
# Reprises automatiques sur surcharge passagère de l'API.
GEMINI_RETRIES = int(os.getenv("GEMINI_RETRIES", "3"))
GEMINI_RETRY_BASE = float(os.getenv("GEMINI_RETRY_BASE", "1.0"))  # secondes, doublées à chaque essai
# Codes qui valent la peine d'être réessayés : surcharge serveur et quota momentané.
_CODES_REPRISE = frozenset({429, 500, 502, 503, 504})


def _detail_erreur(reponse) -> str:
    """Extrait le message lisible d'une erreur Gemini, sans recracher tout le JSON dans l'interface."""
    try:
        msg = reponse.json().get("error", {}).get("message")
        if msg:
            return msg[:160]
    except Exception:  # noqa: BLE001 - corps non JSON
        pass
    return (reponse.text or "")[:160]


def _attente(essai: int, retry_after) -> float:
    """Attente exponentielle plafonnée, avec un peu d'aléa pour ne pas retomber en même temps que les autres."""
    try:
        if retry_after is not None:
            return min(20.0, max(0.0, float(retry_after)))
    except (TypeError, ValueError):
        pass
    base = min(20.0, GEMINI_RETRY_BASE * (2 ** essai))
    return base + random.uniform(0, base * 0.3)


def _post_gemini(url: str, headers: dict, body: dict, timeout: float = 60.0):
    """
    POST vers l'API Gemini avec reprise sur surcharge passagère (429, 5xx) et sur incident réseau.

    Un 503 « high demand » n'est pas une panne : c'est une file d'attente. On réessaie quelques fois
    avant d'abandonner, au lieu de renvoyer l'erreur brute à l'agriculteur.
    """
    import httpx

    reponse = None
    for essai in range(GEMINI_RETRIES + 1):
        dernier = essai == GEMINI_RETRIES
        try:
            reponse = httpx.post(url, headers=headers, json=body, timeout=timeout)
        except httpx.RequestError as exc:
            if dernier:
                raise RuntimeError(f"Gemini injoignable : {exc}") from exc
            logger.warning("Gemini injoignable (%s) ; nouvel essai.", exc)
            time.sleep(_attente(essai, None))
            continue
        if reponse.status_code not in _CODES_REPRISE or dernier:
            return reponse
        pause = _attente(essai, reponse.headers.get("retry-after"))
        logger.warning(
            "Gemini %s (essai %d/%d) : %s — nouvel essai dans %.1f s.",
            reponse.status_code, essai + 1, GEMINI_RETRIES, _detail_erreur(reponse), pause,
        )
        time.sleep(pause)
    return reponse


# ---------- STT ----------
_BACKEND_DIR = Path(__file__).resolve().parents[1]


def _stt_model_ref() -> str:
    """Chemin local du modèle converti (relatif à backend/), ou nom de modèle standard (« small »…)."""
    if not any(sep in STT_MODEL for sep in "/\\"):
        return STT_MODEL  # nom court : faster-whisper le télécharge
    path = Path(STT_MODEL)
    if not path.is_absolute():
        path = _BACKEND_DIR / path
    if not path.exists():
        raise RuntimeError(
            f"Modèle vocal introuvable : {path}. Lance scripts/convert_stt_model.py, "
            "ou définis STT_MODEL=small pour tester avec un Whisper standard."
        )
    return str(path)


@lru_cache(maxsize=1)
def _asr():
    from faster_whisper import WhisperModel

    return WhisperModel(_stt_model_ref(), device="cpu", compute_type=STT_COMPUTE, cpu_threads=STT_THREADS)


def warmup() -> None:
    """Charge le modèle STT local à l'avance (évite une première requête lente)."""
    if STT_PROVIDER != "gemini":
        _asr()


def _decode_audio(data: bytes, rate: int = 16000):
    """Décode webm/mp4/wav/m4a en float32 mono 16 kHz.

    On décode nous-mêmes plutôt que de laisser faster-whisper le faire : son appel interne
    utilise un argument supprimé dans PyAV >= 19 (« metadata_errors »), ce qui casse la voix.
    """
    import av
    import numpy as np
    from av.audio.resampler import AudioResampler

    resampler = AudioResampler(format="s16", layout="mono", rate=rate)
    chunks = []

    def collect(out):
        if out is None:
            return
        for frame in out if isinstance(out, list) else [out]:
            chunks.append(frame.to_ndarray().reshape(-1))

    with av.open(io.BytesIO(data), mode="r") as container:
        if not container.streams.audio:
            raise RuntimeError("Aucune piste audio dans l'enregistrement")
        stream = container.streams.audio[0]
        stream.thread_type = "AUTO"
        for frame in container.decode(stream):
            collect(resampler.resample(frame))
        collect(resampler.resample(None))  # vidange du rééchantillonneur

    if not chunks:
        return np.zeros(0, dtype=np.float32)
    return np.concatenate(chunks).astype(np.float32) / 32768.0


def _to_wav(samples, rate: int = 16000) -> bytes:
    """float32 mono → fichier WAV 16 bits en mémoire (format accepté par Gemini)."""
    import wave

    import numpy as np

    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


def _transcribe_gemini(samples) -> str:
    """Transcription par Gemini : bien meilleure en derja que Whisper, et rien à calculer en local."""
    import base64

    import httpx

    global _stt_gemini_model
    key = _clean(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    if not key:
        raise RuntimeError("GEMINI_API_KEY manquante pour STT_PROVIDER=gemini")

    wav = _to_wav(samples)
    if len(wav) > 18 * 1024 * 1024:  # la requête entière est limitée à 20 Mo
        raise RuntimeError("Enregistrement trop long pour la transcription Gemini")

    instruction = (
        "Transcris cet enregistrement mot pour mot en arabe tunisien (derja), en lettres arabes. "
        "C'est un agriculteur tunisien qui parle de ses plantes et de leurs maladies. "
        "Garde ses mots exacts, ne traduis pas en arabe standard, n'ajoute aucun commentaire. "
        "Si un mot français est prononcé, écris-le en lettres arabes. "
        "Si rien n'est audible, réponds par un texte vide."
    )
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": instruction},
                    {"inline_data": {"mime_type": "audio/wav", "data": base64.b64encode(wav).decode()}},
                ],
            }
        ],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 512},
    }

    def call(model):
        return _post_gemini(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            {"x-goog-api-key": key},
            body,
            timeout=90,
        )

    model = _stt_gemini_model or STT_GEMINI_MODEL
    r = call(model)
    if (r.status_code in (400, 403, 404) or r.status_code in _CODES_REPRISE) and model != STT_GEMINI_FALLBACK:
        logger.warning("%s refuse la transcription ; bascule sur %s.", model, STT_GEMINI_FALLBACK)
        model = STT_GEMINI_FALLBACK
        r = call(model)
    if r.status_code != 200:
        raise RuntimeError(f"Gemini STT {r.status_code} ({model}) : {_detail_erreur(r)}")
    _stt_gemini_model = model

    data = r.json()
    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError):
        return ""
    return "".join(p.get("text", "") for p in parts).strip()


# ---------- Profil de la voix ----------
# Bornes de hauteur de voix (F0) en Hz. Entre les deux, on ne tranche pas : « indetermine ».
# Repères usuels : voix d'homme adulte 85-180 Hz, voix de femme adulte 165-255 Hz. Les deux plages
# se chevauchent, et l'âge, le rhume ou le bruit déplacent la mesure : la zone grise est volontaire.
F0_HOMME_MAX = float(os.getenv("F0_HOMME_MAX", "155"))
F0_FEMME_MIN = float(os.getenv("F0_FEMME_MIN", "180"))
_F0_MIN, _F0_MAX = 70.0, 320.0  # hors de cette plage, ce n'est pas une voix parlée


def _f0_trame(trame, rate: int):
    """Hauteur d'une trame par autocorrélation. Renvoie (f0, qualité) ou (None, 0) si non voisée."""
    import numpy as np

    trame = trame - trame.mean()
    norme = float(np.dot(trame, trame))
    if norme <= 1e-9:
        return None, 0.0
    corr = np.correlate(trame, trame, mode="full")[len(trame) - 1:]
    lag_min = max(2, int(rate / _F0_MAX))
    lag_max = min(len(corr) - 2, int(rate / _F0_MIN))
    if lag_max <= lag_min:
        return None, 0.0
    fenetre = corr[lag_min:lag_max]
    i = int(np.argmax(fenetre))
    lag = lag_min + i
    qualite = float(corr[lag] / norme)
    # Interpolation parabolique : affine le sommet entre deux échantillons.
    y0, y1, y2 = corr[lag - 1], corr[lag], corr[lag + 1]
    denom = y0 - 2 * y1 + y2
    if denom != 0:
        lag += 0.5 * (y0 - y2) / denom
    if lag <= 0:
        return None, 0.0
    return rate / lag, qualite


def profil_voix(audio: bytes, rate: int = 16000) -> dict:
    """
    Estime la hauteur moyenne de la voix et en déduit une étiquette indicative.

    Ce n'est PAS une identification fiable : la mesure se trompe sur les voix d'enfants, les voix
    graves de femmes, les voix aiguës d'hommes, et dès que le micro est bruyant. Elle sert de
    proposition par défaut, que l'utilisateur doit pouvoir corriger dans les réglages.
    """
    import numpy as np

    vide = {"genre": "indetermine", "f0_hz": None, "confiance": 0.0, "trames_voisees": 0}
    try:
        samples = _decode_audio(audio, rate)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Profil de voix : décodage impossible (%s)", exc)
        return vide
    if samples.size < rate // 4:  # moins de 0,25 s : trop court pour mesurer
        return vide

    taille, pas = int(0.04 * rate), int(0.02 * rate)
    trames = [samples[d:d + taille] for d in range(0, len(samples) - taille, pas)]
    if not trames:
        return vide
    energies = np.array([float(np.sqrt(np.mean(t ** 2))) for t in trames])
    seuil = max(0.02 * float(energies.max()), 1e-4)  # écarte les silences

    hauteurs = []
    for trame, energie in zip(trames, energies):
        if energie < seuil:
            continue
        f0, qualite = _f0_trame(trame, rate)
        if f0 and qualite > 0.35 and _F0_MIN <= f0 <= _F0_MAX:
            hauteurs.append(f0)
    if len(hauteurs) < 5:
        return vide

    h = np.array(hauteurs)
    # On resserre autour de la médiane : élimine les erreurs d'octave (hauteur doublée ou divisée).
    mediane = float(np.median(h))
    h = h[(h > mediane * 0.6) & (h < mediane * 1.7)]
    f0 = float(np.median(h)) if h.size else mediane

    if f0 <= F0_HOMME_MAX:
        genre = "homme"
        marge = (F0_HOMME_MAX - f0) / F0_HOMME_MAX
    elif f0 >= F0_FEMME_MIN:
        genre = "femme"
        marge = (f0 - F0_FEMME_MIN) / F0_FEMME_MIN
    else:
        genre = "indetermine"
        marge = 0.0
    # La confiance monte avec l'écart à la zone grise et avec le nombre de trames mesurées.
    confiance = round(min(1.0, marge * 3.5) * min(1.0, len(hauteurs) / 25), 2)
    return {"genre": genre, "f0_hz": round(f0, 1), "confiance": confiance, "trames_voisees": len(hauteurs)}


def transcribe(audio: bytes) -> str:
    """Audio brut (webm/mp4/wav/m4a) → texte derja."""
    samples = _decode_audio(audio)
    if samples.size < 1600:  # moins de 0,1 s
        return ""
    if STT_PROVIDER == "gemini":
        return _transcribe_gemini(samples)
    segments, _ = _asr().transcribe(
        samples,
        language="ar",
        task="transcribe",
        beam_size=STT_BEAM_SIZE,  # 1 = greedy, le plus rapide sur CPU
        initial_prompt=STT_PROMPT or None,  # oriente vers le vocabulaire agricole
        temperature=0,  # pas de nouvelle tentative en cas de doute : plus rapide
        vad_filter=True,  # ignore les silences
        condition_on_previous_text=False,
    )
    return " ".join(seg.text.strip() for seg in segments).strip()


# ---------- LLM ----------
def generate(system: str, messages: List[Dict[str, str]]) -> str:
    if LLM_PROVIDER == "gemini":
        import httpx

        key = _clean(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
        if not key:
            raise RuntimeError("GEMINI_API_KEY manquante (clé à créer sur aistudio.google.com/apikey)")
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [
                {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
                for m in messages
            ],
            "generationConfig": {"maxOutputTokens": LLM_MAX_TOKENS, "temperature": 0.7},
        }
        global _thinking_supported
        if GEMINI_THINKING and _thinking_supported:
            # un nombre = ancien paramètre (Gemini 2.5) ; un mot = paramètre actuel (Gemini 3.x)
            key_name = "thinkingBudget" if GEMINI_THINKING.lstrip("-").isdigit() else "thinkingLevel"
            value = int(GEMINI_THINKING) if key_name == "thinkingBudget" else GEMINI_THINKING
            body["generationConfig"]["thinkingConfig"] = {key_name: value}

        def call(payload, modele):
            return _post_gemini(
                f"https://generativelanguage.googleapis.com/v1beta/models/{modele}:generateContent",
                {"x-goog-api-key": key},
                payload,
            )

        # Le modèle principal d'abord, puis les modèles de secours : un modèle populaire peut être
        # saturé alors qu'un autre répond immédiatement.
        modeles = [LLM_MODEL] + [m for m in LLM_MODEL_FALLBACKS if m != LLM_MODEL]
        r = None
        modele = LLM_MODEL
        for rang, modele in enumerate(modeles):
            r = call(body, modele)
            if r.status_code == 400 and "thinkingConfig" in body["generationConfig"]:
                # chaque modèle accepte des valeurs différentes, et le message d'erreur est souvent muet :
                # on réessaie sans l'option et on ne la renvoie plus de la session.
                logger.warning(
                    "%s n'accepte pas GEMINI_THINKING=%s ; on continue sans ce réglage.", modele, GEMINI_THINKING
                )
                _thinking_supported = False
                body["generationConfig"].pop("thinkingConfig")
                r = call(body, modele)
            if r.status_code == 200:
                break
            if r.status_code in _CODES_REPRISE and rang + 1 < len(modeles):
                logger.warning("%s indisponible (%s) ; bascule sur %s.", modele, r.status_code, modeles[rang + 1])
                continue
            break
        if r.status_code != 200:
            raise RuntimeError(f"Gemini {r.status_code} ({modele}) : {_detail_erreur(r)}")
        data = r.json()
        try:
            text = "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"]).strip()
        except (KeyError, IndexError):
            text = ""
        if not text:
            raise RuntimeError(f"Gemini : réponse vide ou bloquée ({data.get('promptFeedback') or 'aucun détail'})")
        return text

    if LLM_PROVIDER == "anthropic":
        import anthropic

        r = anthropic.Anthropic(api_key=_clean(os.getenv("ANTHROPIC_API_KEY")) or None).messages.create(
            model=LLM_MODEL, max_tokens=LLM_MAX_TOKENS, system=system, messages=messages
        )
        return r.content[0].text.strip()

    if LLM_PROVIDER == "openai":  # endpoint compatible OpenAI : vLLM, Ollama, llama.cpp…
        import httpx

        r = httpx.post(
            f"{LLM_BASE_URL}/chat/completions",
            json={
                "model": LLM_MODEL,
                "max_tokens": LLM_MAX_TOKENS,
                "messages": [{"role": "system", "content": system}, *messages],
            },
            timeout=120,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()

    raise RuntimeError(f"LLM_PROVIDER inconnu : {LLM_PROVIDER}")


# ---------- TTS ----------
async def synthesize(text: str):
    """Texte en lettres arabes → (octets audio, type MIME)."""
    if TTS_PROVIDER == "gemini":
        return _synthesize_gemini(text), "audio/wav"
    return await _synthesize_edge(text), "audio/mpeg"


async def _synthesize_edge(text: str) -> bytes:
    """Voix Microsoft ar-TN. Gratuite et rapide, mais prononciation proche de l'arabe standard."""
    import edge_tts

    buf = bytearray()
    async for chunk in edge_tts.Communicate(text, TTS_VOICE, rate=TTS_RATE, pitch=TTS_PITCH).stream():
        if chunk["type"] == "audio":
            buf += chunk["data"]
    if not buf:
        raise RuntimeError("TTS : aucun audio produit")
    return bytes(buf)


def _synthesize_gemini(text: str) -> bytes:
    """Synthèse Gemini : la consigne de style demande explicitement un accent tunisien. Renvoie un WAV."""
    import base64

    import httpx

    key = _clean(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    if not key:
        raise RuntimeError("GEMINI_API_KEY manquante pour TTS_PROVIDER=gemini")

    r = _post_gemini(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {"x-goog-api-key": key},
        {
            "model": GEMINI_TTS_MODEL,
            "input": [
                {
                    "type": "user_input",
                    "content": [
                        {
                            "type": "text",
                            "text": text,
                            "annotations": [{"type": "speech_metadata", "style": GEMINI_TTS_STYLE}],
                        }
                    ],
                }
            ],
            "response_format": {"type": "audio"},
            "generation_config": {"speech_config": [{"voice": GEMINI_TTS_VOICE}]},
        },
        timeout=90,
    )
    if r.status_code != 200:
        raise RuntimeError(f"Gemini TTS {r.status_code} : {_detail_erreur(r)}")

    audio = None
    for step in r.json().get("steps", []):
        if step.get("type") == "model_output":
            for part in step.get("content", []):
                if part.get("type") == "audio" and part.get("data"):
                    audio = part["data"]  # le dernier morceau audio est la piste complète
    if not audio:
        raise RuntimeError("Gemini TTS : aucun audio dans la réponse")
    return base64.b64decode(audio)