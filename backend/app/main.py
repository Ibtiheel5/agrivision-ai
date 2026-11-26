"""API FastAPI AgriVision IA."""

import importlib
import json
import logging
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from .metrics import PREDICTIONS, setup_metrics
from .fruit_pipeline import AgriVisionFruitPipeline
from .inference import InvalidImageError, ModelNotLoadedError, YoloOnnx
from .pipeline import TwoStagePipeline
from .schemas import (
    ErrorResponse,
    FruitPredictResponse,
    FruitVisualizeResponse,
    HealthResponse,
    ModelMetadata,
    PredictResponse,
    VisualizeResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("agrivision.api")


def _optional_router(name: str):
    """
    Charge app.routers.<name> s'il existe ; sinon l'API démarre sans ce routeur.

    Deux cas distincts, et il faut les distinguer dans le log :
      - ImportError  : le fichier est absent, ou une dépendance du routeur n'est pas installée
                       dans l'environnement courant (cas fréquent : faster-whisper, edge-tts).
      - autre erreur : le fichier existe mais plante à l'import (faute de frappe, variable manquante).
    """
    try:
        return importlib.import_module(f".routers.{name}", __package__)
    except ImportError as exc:
        logger.warning("Routeur « %s » NON chargé — module ou dépendance manquante : %s", name, exc)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.exception("Routeur « %s » NON chargé — erreur à l'import : %s", name, exc)
        return None


advice = _optional_router("advice")
chat = _optional_router("chat")  # assistant : /chat, /voice-chat, /tts
risk_map = _optional_router("risk_map")
weather = _optional_router("weather")

DEFAULT_MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
MODEL_DIR = Path(os.getenv("MODEL_DIR", str(DEFAULT_MODEL_DIR)))
MODEL_FILE = os.getenv("MODEL_FILE", "best.onnx")
# Modèle fruits / légumes : sous-dossier « fruit »
# (fruit_detector.onnx, classifier.onnx, classes.txt, pipeline_config.json)
FRUIT_DIR = Path(os.getenv("FRUIT_MODEL_DIR", str(MODEL_DIR / "fruit")))
BENCHMARK_PATH = Path(os.getenv("BENCHMARK_PATH", str(MODEL_DIR / "benchmark_local.json")))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

state: dict = {"model": None, "error": None, "fruit": None, "fruit_error": None}


def load_model() -> None:
    try:
        if (MODEL_DIR / "detector.onnx").exists() and (MODEL_DIR / "classifier.onnx").exists():
            state["model"] = TwoStagePipeline(MODEL_DIR)
            logger.info("Pipeline 2 etages charge (detecteur + classifieur)")
        else:
            state["model"] = YoloOnnx(MODEL_DIR / MODEL_FILE, MODEL_DIR / "classes.txt", MODEL_DIR / "metadata.json")
        state["error"] = None
    except ModelNotLoadedError as exc:
        state["model"], state["error"] = None, str(exc)
        logger.error("Chargement du modèle impossible : %s", exc)


def load_fruit_model() -> None:
    """Modèle fruits optionnel : s'il est absent, le reste de l'API fonctionne normalement."""
    det, cls, cfg = FRUIT_DIR / "fruit_detector.onnx", FRUIT_DIR / "classifier.onnx", FRUIT_DIR / "pipeline_config.json"
    if not (det.exists() and cls.exists() and cfg.exists()):
        state["fruit"], state["fruit_error"] = None, f"fichiers absents dans {FRUIT_DIR}"
        logger.info("Modèle fruits non installé (%s) : /predict/fruit renverra 503.", FRUIT_DIR)
        return
    try:
        state["fruit"] = AgriVisionFruitPipeline(det, cls, cfg)
        state["fruit_error"] = None
        logger.info("Modèle fruits chargé : %d classes", len(state["fruit"].classes))
    except Exception as exc:  # noqa: BLE001
        state["fruit"], state["fruit_error"] = None, str(exc)
        logger.error("Chargement du modèle fruits impossible : %s", exc)


def warmup_stt() -> None:
    """
    Précharge le moteur de reconnaissance vocale pour que le premier message vocal ne paie pas
    le chargement du modèle. Tourne en arrière-plan : un échec ici ne bloque jamais l'API.
    """
    try:
        from .providers import warmup

        warmup()
        logger.info("Moteur vocal préchauffé")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Préchauffage du moteur vocal ignoré : %s", exc)


def load_benchmark() -> dict:
    if not BENCHMARK_PATH.exists():
        return {}
    try:
        return json.loads(BENCHMARK_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Benchmark local illisible (%s) : %s", BENCHMARK_PATH, exc)
        return {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    if risk_map is not None and hasattr(risk_map, "init_db"):
        risk_map.init_db()
    load_model()
    load_fruit_model()
    if chat is not None:
        threading.Thread(target=warmup_stt, daemon=True).start()  # ne retarde pas le démarrage
    yield


app = FastAPI(
    title="AgriVision IA API",
    description="Détection de maladies foliaires (YOLO11 + ONNX Runtime), qualité des fruits / légumes "
    "(détecteur + classifieur) et assistant agricole en derja.",
    version="1.2.0",
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["*"], allow_headers=["*"])

setup_metrics(app)
for _r in (advice, chat, risk_map, weather):
    if _r is not None and hasattr(_r, "router"):
        app.include_router(_r.router)

# Récapitulatif au démarrage : on voit tout de suite ce qui manque, sans fouiller dans /openapi.json.
logger.info(
    "Routeurs actifs : %s",
    ", ".join(
        n
        for n, m in (("advice", advice), ("chat", chat), ("risk_map", risk_map), ("weather", weather))
        if m is not None and hasattr(m, "router")
    )
    or "aucun",
)


def get_model() -> YoloOnnx:
    if state["model"] is None:
        raise HTTPException(status_code=503, detail=f"Modèle indisponible : {state['error']}")
    return state["model"]


def get_fruit_model() -> AgriVisionFruitPipeline:
    if state["fruit"] is None:
        raise HTTPException(status_code=503, detail=f"Modèle fruits indisponible : {state['fruit_error']}")
    return state["fruit"]


async def read_image(file: UploadFile, model=YoloOnnx):
    """
    Lit et valide l'image envoyée.

    `model` peut exposer son propre open_image(bytes) — c'est le cas de YoloOnnx, qui applique
    la correction EXIF. Les pipelines qui n'en ont pas (le pipeline fruits, par exemple) retombent
    sur l'ouvreur générique : passer le modèle reste donc toujours sans danger.
    """
    data = await file.read()
    if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Image trop lourde (max {MAX_UPLOAD_MB} Mo)")
    ouvrir = getattr(model, "open_image", None) or YoloOnnx.open_image
    try:
        return ouvrir(data)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health():
    m, f = state["model"], state["fruit"]
    return HealthResponse(
        status="ok" if m else "degraded",
        model_loaded=m is not None,
        gpu_available=bool(m and m.gpu),
        model_version=m.version if m else None,
        inference_engine="onnxruntime",
        fruit_model_loaded=f is not None,
        fruit_model_version=f.version if f else None,
    )


@app.get(
    "/model/metadata",
    response_model=ModelMetadata,
    responses={503: {"model": ErrorResponse}},
    tags=["model"],
)
async def model_metadata():
    m = get_model()
    md = m.metadata
    benchmark = md.get("benchmark_cpu")
    if not benchmark:
        local_benchmark = load_benchmark()
        p50 = local_benchmark.get("p50_ms")
        p95 = local_benchmark.get("p95_ms")
        if p50 is not None and p95 is not None:
            model_path = MODEL_DIR / MODEL_FILE
            benchmark = {
                "onnx_fp32_cpu": {
                    "p50_ms": float(p50),
                    "p95_ms": float(p95),
                    "fps": 1000 / float(p50) if float(p50) > 0 else 0.0,
                    "size_mb": model_path.stat().st_size / (1024 * 1024) if model_path.exists() else 0.0,
                }
            }
    return ModelMetadata(
        name=md.get("name", "AgriVision IA"),
        architecture=md.get("architecture", "YOLO"),
        version=m.version,
        num_classes=len(m.classes),
        class_names=m.classes,
        input_size=list(m.input_hw),
        conf_threshold=m.conf_default,
        iou_threshold=m.iou_default,
        validation_metrics=md.get("validation_metrics", {}),
        extra={k: str(v) for k, v in md.get("extra", {}).items()},
        benchmark_cpu=benchmark,
    )


@app.post(
    "/predict",
    response_model=PredictResponse,
    responses={400: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
    tags=["inference"],
)
async def predict(
    file: UploadFile = File(...),
    conf: float = Query(None, ge=0.01, le=0.99),
    iou: float = Query(None, ge=0.05, le=0.95),
):
    m = get_model()
    img = await read_image(file, m)
    result = await run_in_threadpool(m.predict, img, conf, iou)
    PREDICTIONS.labels("ok" if result["detections"] else "aucune_detection").inc()
    return result


@app.post(
    "/predict/visualize",
    response_model=VisualizeResponse,
    responses={400: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
    tags=["inference"],
)
async def predict_visualize(
    file: UploadFile = File(...),
    conf: float = Query(None, ge=0.01, le=0.99),
    iou: float = Query(None, ge=0.05, le=0.95),
):
    m = get_model()
    img = await read_image(file, m)
    result = await run_in_threadpool(m.predict, img, conf, iou)
    extra = (result["leaves"],) if "leaves" in result else ()
    result["annotated_image_base64"] = await run_in_threadpool(m.annotate, img, result["detections"], *extra)
    return result


# ───────────── Fruits / légumes ─────────────
@app.post(
    "/predict/fruit",
    response_model=FruitPredictResponse,
    responses={400: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
    tags=["inference"],
)
async def predict_fruit(
    file: UploadFile = File(...),
    conf: float = Query(None, ge=0.01, le=0.99, description="Seuil du détecteur (défaut : valeur calibrée du modèle)"),
    iou: float = Query(None, ge=0.05, le=0.95),
):
    m = get_fruit_model()
    img = await read_image(file, m)
    result = await run_in_threadpool(m.predict, img, conf, iou)
    PREDICTIONS.labels("ok" if result["detections"] else "aucune_detection").inc()
    return result


@app.post(
    "/predict/fruit/visualize",
    response_model=FruitVisualizeResponse,
    responses={400: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
    tags=["inference"],
)
async def predict_fruit_visualize(
    file: UploadFile = File(...),
    conf: float = Query(None, ge=0.01, le=0.99),
    iou: float = Query(None, ge=0.05, le=0.95),
):
    m = get_fruit_model()
    img = await read_image(file, m)
    result = await run_in_threadpool(m.predict, img, conf, iou)
    result["annotated_image_base64"] = await run_in_threadpool(m.annotate, img, result["detections"])
    return result
