"""API FastAPI AgriVision IA."""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from .inference import InvalidImageError, ModelNotLoadedError, YoloOnnx
from .schemas import (
    ErrorResponse,
    HealthResponse,
    ModelMetadata,
    PredictResponse,
    VisualizeResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("agrivision.api")

DEFAULT_MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
MODEL_DIR = Path(os.getenv("MODEL_DIR", str(DEFAULT_MODEL_DIR)))
MODEL_FILE = os.getenv("MODEL_FILE", "best.onnx")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

state: dict = {"model": None, "error": None}


def load_model() -> None:
    try:
        state["model"] = YoloOnnx(MODEL_DIR / MODEL_FILE, MODEL_DIR / "classes.txt", MODEL_DIR / "metadata.json")
        state["error"] = None
    except ModelNotLoadedError as exc:
        state["model"], state["error"] = None, str(exc)
        logger.error("Chargement du modèle impossible : %s", exc)


@asynccontextmanager
async def lifespan(_: FastAPI):
    load_model()  # chargé une seule fois au démarrage
    yield


app = FastAPI(
    title="AgriVision IA API",
    description="Détection de maladies foliaires (YOLO11 + ONNX Runtime).",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["*"], allow_headers=["*"])


def get_model() -> YoloOnnx:
    if state["model"] is None:
        raise HTTPException(status_code=503, detail=f"Modèle indisponible : {state['error']}")
    return state["model"]


async def read_image(file: UploadFile, model: YoloOnnx):
    data = await file.read()
    if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Image trop lourde (max {MAX_UPLOAD_MB} Mo)")
    try:
        return model.open_image(data)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health():
    m = state["model"]
    return HealthResponse(
        status="ok" if m else "degraded",
        model_loaded=m is not None,
        gpu_available=bool(m and m.gpu),
        model_version=m.version if m else None,
        inference_engine="onnxruntime",
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
    return await run_in_threadpool(m.predict, img, conf, iou)


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
    result["annotated_image_base64"] = await run_in_threadpool(m.annotate, img, result["detections"])
    return result
