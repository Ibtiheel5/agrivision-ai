"""Assistant AgriVision en derja : chat texte (/chat) et voix (/voice-chat).

Branchement dans main.py :
    from .routers import chat
    app.include_router(chat.router)
"""

import base64
import json
import logging
import os
import time
from typing import Dict, List, Literal, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from .. import providers

logger = logging.getLogger("agrivision.chat")
router = APIRouter(tags=["assistant"])

MAX_AUDIO_MB = 10
MAX_HISTORY = 10  # derniers messages gardés
MAX_ANALYSES = 8
# En dessous de ce niveau de certitude, on ne fait aucun accord de genre.
ACCORD_CONFIANCE_MIN = float(os.getenv("ACCORD_CONFIANCE_MIN", "0.5"))  # analyses passées rappelées au modèle

SYSTEM_PROMPT = """Tu es l'assistant agricole de l'application AgriVision. Tu parles en DERJA TUNISIENNE \
(dialecte tunisien naturel), pas en arabe standard. Un agriculteur te parle, souvent depuis le terrain.

Règles :
- Réponds en 2 à 4 phrases courtes, simples, comme à l'oral.
- {script_rule}
- Tu peux garder en français les noms techniques courants (mildiou, fongicide, irrigation…), comme le font les \
Tunisiens.
- Base-toi sur le diagnostic de l'application s'il est fourni ; ne l'invente pas.
- Si la confiance du diagnostic est inférieure à 60 % ou si le cas est incertain, dis-le et conseille de reprendre \
une photo plus nette et de consulter un technicien agricole.
- Ne donne jamais de dose précise de pesticide : renvoie à l'étiquette du produit et au technicien agricole.
- Tu n'es pas un diagnostic certifié. Si la question n'a rien à voir avec les plantes et les cultures, \
ramène poliment la conversation vers l'agriculture.
{context}"""

SCRIPT_ARABIC = """Écris en LETTRES ARABES uniquement : ta réponse est lue par une synthèse vocale, qui ne sait pas \
lire les lettres latines. Mais écris du VRAI DERJA TUNISIEN parlé, surtout pas de l'arabe standard (فصحى) :
- Utilise le vocabulaire tunisien : شنوة، كيفاش، علاش، برشا، ياسر، باهي، تو، زادة، كيما، وقتاش، هكة، باش، تنجم، \
لازم، أما.
- Évite les tournures de l'arabe standard : ماذا → شنوة، كثيراً → برشا، سوف → باش، هذا → هاذا، ليس → موش، يجب → لازم.
- Négation à la tunisienne : ما تخافش، ما فماش، موش.
- Réponse TRÈS courte : 2 à 3 phrases parlées, pas plus (l'agriculteur écoute, il ne lit pas).
- Si un mot technique français est indispensable, écris-le en lettres arabes (مثلاً : فونجيسيد) : la voix ne lit pas \
l'alphabet latin.

Voici le ton exact attendu (imite ces exemples) :

Question : علاش الورقة ولات صفرا ؟
Réponse : الاصفرار هاذا ياجي برشا مرّات من الماء الزايد ولا من نقص فالسماد. نقّص شويّة فالسقي و شوف الجذور كيفاش. \
كان ما تتحسّنش، شاور تقني فلاحي.

Question : شنوّة نعمل للمرض هاذا ؟
Réponse : أوّل حاجة، نحّي الورقات المريضة و رمّيهم بعيد. بعد، خلّي الهوا يدور بين النبتات و ما تسقّيش على الورق. على \
الدوا، أقرا الاتيكات و اسأل التقني الفلاحي."""
SCRIPT_LATIN = (
    "Écris en derja en lettres latines (arabizi : 3 = ع, 7 = ح, 9 = ق, 5 = خ), comme sur les réseaux sociaux."
)


class Diagnosis(BaseModel):
    """Résultat de /predict/top3, à transmettre pour que le chatbot en parle."""

    label: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    status: Optional[str] = None


class PastAnalysis(BaseModel):
    """Analyse déjà faite par l'application, envoyée pour que l'assistant s'en souvienne."""

    label: str = Field(..., max_length=120)
    confidence: float = Field(..., ge=0.0, le=1.0)
    when: Optional[str] = Field(None, max_length=40, description="date lisible, ex. « 22 novembre »")


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[Turn] = []
    diagnosis: Optional[Diagnosis] = None
    recent_analyses: List[PastAnalysis] = []
    script: Literal["arabic", "latin"] = "latin"
    # Réglage choisi par l'utilisateur dans l'application : fait l'accord en derja.
    speaker_gender: Optional[Literal["homme", "femme"]] = None


class ChatResponse(BaseModel):
    reply: str


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


class TTSResponse(BaseModel):
    audio_base64: str
    audio_mime: str = "audio/mpeg"


class Locuteur(BaseModel):
    """Estimation indicative tirée de la hauteur de la voix. Jamais une certitude."""

    genre: str = "indetermine"  # "homme" | "femme" | "indetermine"
    f0_hz: Optional[float] = None  # hauteur moyenne mesurée
    confiance: float = 0.0  # 0 à 1 ; 0 dans la zone de recouvrement
    source: str = "voix"  # "voix" = mesuré, "reglage" = choisi par l'utilisateur


class VoiceChatResponse(BaseModel):
    transcript: str
    reply: str
    audio_base64: str
    audio_mime: str = "audio/mpeg"
    timings_ms: Dict[str, int] = {}  # durée de chaque étape : stt, llm, tts
    speaker: Locuteur = Locuteur()


ACCORD = {
    "homme": "\n\nL'agriculteur est un homme : parle-lui au masculin "
    "(« 3mel », « chouf », « enti mrigel »). Ne commente jamais ce choix.",
    "femme": "\n\nL'agricultrice est une femme : parle-lui au féminin "
    "(« 3melti », « chouf i », « enti mriglaa »). Ne commente jamais ce choix.",
}


def build_system(
    diagnosis: Optional[Diagnosis],
    script: str,
    analyses: Optional[List[PastAnalysis]] = None,
    genre: Optional[str] = None,
) -> str:
    ctx = ACCORD.get(genre or "", "")
    if diagnosis:
        ctx += (
            f"\nDiagnostic de l'application pour la photo en cours : {diagnosis.label} "
            f"(confiance {round(diagnosis.confidence * 100)} %"
            + (f", statut : {diagnosis.status}" if diagnosis.status else "")
            + ")."
        )
    if analyses:
        lignes = "\n".join(
            f"- {a.label} ({round(a.confidence * 100)} %)" + (f", le {a.when}" if a.when else "")
            for a in analyses[:MAX_ANALYSES]
        )
        ctx += (
            "\n\nAnalyses déjà faites par cet agriculteur, de la plus récente à la plus ancienne :\n"
            f"{lignes}\n"
            "Tu peux t'y référer s'il pose une question dessus (« la photo d'hier », « el maradh "
            "elli 9ablt »), et repérer qu'un problème revient. N'en parle pas de toi-même si sa "
            "question ne les concerne pas."
        )
    return SYSTEM_PROMPT.format(script_rule=SCRIPT_ARABIC if script == "arabic" else SCRIPT_LATIN, context=ctx)


async def _answer(
    message: str, history: List[Turn], diagnosis, script: str, analyses=None, genre: Optional[str] = None
) -> str:
    messages = [t.model_dump() for t in history[-MAX_HISTORY:]]
    messages.append({"role": "user", "content": message})
    system = build_system(diagnosis, script, analyses, genre)
    try:
        return await run_in_threadpool(providers.generate, system, messages)
    except Exception as exc:  # fournisseur LLM indisponible, clé manquante, etc.
        logger.exception("LLM en échec")
        raise HTTPException(502, f"Assistant indisponible : {exc}") from exc


async def _speak(text: str):
    """Renvoie (audio en base64, type MIME) : MP3 avec edge-tts, WAV avec Gemini."""
    try:
        audio, mime = await providers.synthesize(text)
    except Exception as exc:
        logger.exception("TTS en échec")
        raise HTTPException(502, f"Synthèse vocale indisponible : {exc}") from exc
    return base64.b64encode(audio).decode(), mime


@router.post("/tts", response_model=TTSResponse)
async def tts(req: TTSRequest) -> TTSResponse:
    """Lit un texte (lettres arabes) à voix haute : « 9rali »."""
    audio, mime = await _speak(req.text)
    return TTSResponse(audio_base64=audio, audio_mime=mime)


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    return ChatResponse(
        reply=await _answer(
            req.message, req.history, req.diagnosis, req.script, req.recent_analyses, req.speaker_gender
        )
    )


@router.post("/voice-chat", response_model=VoiceChatResponse)
async def voice_chat(
    audio: UploadFile = File(..., description="Enregistrement du micro (webm, wav, m4a…)"),
    diagnosis_label: Optional[str] = Form(None),
    diagnosis_confidence: Optional[float] = Form(None),
    history: Optional[str] = Form(None, description="JSON : [{role, content}, …]"),
    recent_analyses: Optional[str] = Form(None, description="JSON : [{label, confidence, when}, …]"),
    speaker_gender: Optional[str] = Form(
        None, description="Réglage de l'utilisateur : homme | femme. " "Prioritaire sur l'estimation faite sur la voix."
    ),
) -> VoiceChatResponse:
    data = await audio.read()
    if not data:
        raise HTTPException(400, "Audio vide")
    if len(data) > MAX_AUDIO_MB * 1024 * 1024:
        raise HTTPException(413, f"Audio trop volumineux (max {MAX_AUDIO_MB} Mo)")

    t0 = time.perf_counter()
    try:
        transcript = await run_in_threadpool(providers.transcribe, data)
    except Exception as exc:
        logger.exception("STT en échec")
        raise HTTPException(422, f"Transcription impossible : {exc}") from exc
    if not transcript:
        raise HTTPException(422, "Aucune parole détectée")

    # Le réglage de l'utilisateur prime toujours sur la mesure : la hauteur de voix se trompe.
    if speaker_gender in ("homme", "femme"):
        locuteur = Locuteur(genre=speaker_gender, confiance=1.0, source="reglage")
    else:
        try:
            mesure = await run_in_threadpool(providers.profil_voix, data)
            locuteur = Locuteur(**mesure, source="voix") if "genre" in mesure else Locuteur()
        except Exception:  # noqa: BLE001 - une mesure ratée ne doit jamais couper la conversation
            logger.exception("Profil de voix indisponible")
            locuteur = Locuteur()

    diagnosis = (
        Diagnosis(label=diagnosis_label, confidence=diagnosis_confidence)
        if diagnosis_label and diagnosis_confidence is not None
        else None
    )
    turns: List[Turn] = []
    if history:
        try:
            turns = [Turn(**t) for t in json.loads(history)][-MAX_HISTORY:]
        except (ValueError, TypeError):
            logger.warning("historique ignoré (JSON invalide)")
    past: List[PastAnalysis] = []
    if recent_analyses:
        try:
            past = [PastAnalysis(**a) for a in json.loads(recent_analyses)][:MAX_ANALYSES]
        except (ValueError, TypeError):
            logger.warning("analyses passées ignorées (JSON invalide)")

    t1 = time.perf_counter()
    # La voix doit lire des lettres arabes, jamais de l'arabizi.
    # On n'impose l'accord que si l'on est raisonnablement sûr : sinon, formulation neutre.
    genre = locuteur.genre if locuteur.genre != "indetermine" and locuteur.confiance >= ACCORD_CONFIANCE_MIN else None
    reply = await _answer(transcript, turns, diagnosis, "arabic", past, genre)
    t2 = time.perf_counter()
    audio, mime = await _speak(reply)
    t3 = time.perf_counter()

    timings = {
        "stt": int((t1 - t0) * 1000),
        "llm": int((t2 - t1) * 1000),
        "tts": int((t3 - t2) * 1000),
        "total": int((t3 - t0) * 1000),
    }
    logger.info("voice-chat : %s ms", timings)
    return VoiceChatResponse(
        transcript=transcript,
        reply=reply,
        audio_base64=audio,
        audio_mime=mime,
        timings_ms=timings,
        speaker=locuteur,
    )
