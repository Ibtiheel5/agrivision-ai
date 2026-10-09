"""API FastAPI AgriVision AI Lite : détection de maladies foliaires.

YOLO11s exporté en ONNX, mode top-3 avec refus « incertain »."""

from __future__ import annotations

import io
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .inference import (
    Detector,
    draw_detections,
    load_classes,
    load_image,
    overall_status,
)
from .schemas import (
    Alternative,
    BoundingBox,
    Detection,
    ErrorResponse,
    HealthResponse,
    ModelMetadata,
    PredictResponse,
    Timings,
)

log = logging.getLogger("agrivision")


def _default_models_dir() -> Path:
    """Dossier models/ : ./models, sinon celui de la racine du dépôt."""
    here = Path(__file__).resolve()
    candidates = [Path("models")] + [p / "models" for p in list(here.parents)[1:3]]
    return next((c for c in candidates if (c / "best.onnx").exists()), Path("models"))


MODELS_DIR = _default_models_dir()
MODEL_PATH = Path(os.getenv("MODEL_PATH", MODELS_DIR / "best.onnx"))
CLASSES_PATH = Path(os.getenv("CLASSES_PATH", MODELS_DIR / "classes.txt"))
METRICS_PATH = Path(os.getenv("METRICS_PATH", MODELS_DIR / "metrics.json"))
CONFIG_PATH = Path(os.getenv("CONFIG_PATH", MODELS_DIR / "inference_config.json"))
# Valeurs par défaut du mode top-3 (écrasées par inference_config.json produit par le notebook)
DEFAULT_CONFIG = {
    "conf_min": 0.10,
    "iou": 0.45,
    "accept": 0.30,
    "margin_min": 0.10,
    "alt_min_score": 0.05,
}
MLFLOW_URL = os.getenv("MLFLOW_URL")
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
]
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "10")) * 1024 * 1024


def _load_metrics() -> dict:
    try:
        return json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _load_config() -> dict:
    cfg = dict(DEFAULT_CONFIG)
    try:
        cfg.update(json.loads(CONFIG_PATH.read_text(encoding="utf-8")))
    except Exception:
        log.warning(
            "inference_config.json absent ou illisible (%s) : valeurs par défaut",
            CONFIG_PATH,
        )
    return cfg


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Charge le modèle une seule fois. S'il manque, l'API démarre quand même (503 sur /predict)."""
    app.state.metrics = _load_metrics()
    app.state.config = _load_config()
    app.state.detector = None
    try:
        app.state.detector = Detector(MODEL_PATH, load_classes(CLASSES_PATH))
        log.info("Modèle chargé : %s (%s)", MODEL_PATH, app.state.detector.providers)
    except Exception as e:  # modèle/classes absents ou incohérents
        log.error("Modèle non chargé (%s) : %s", MODEL_PATH.resolve(), e)
    yield


app = FastAPI(
    title="AgriVision AI Lite",
    version="1.0.0",
    lifespan=lifespan,
    description="Détection de maladies foliaires (PlantDoc + PlantSeg, YOLO11s, ONNX Runtime).",
)
app.add_middleware(
    CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"]
)


def _model_version(request: Request) -> str:
    app = request.app
    return (
        os.getenv("MODEL_VERSION")
        or app.state.metrics.get("best_run")
        or app.state.config.get("model")
        or "unknown"
    )


def _read_image(file: UploadFile):
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            413, f"Fichier trop volumineux (max {MAX_UPLOAD_BYTES // 1024 // 1024} Mo)"
        )
    try:
        return load_image(data)
    except Exception:
        raise HTTPException(400, "Le fichier envoyé n'est pas une image valide")


def _require_detector(request: Request) -> Detector:
    det: Optional[Detector] = request.app.state.detector
    if det is None:
        raise HTTPException(503, "Modèle non chargé")
    return det


@app.get("/health", response_model=HealthResponse, tags=["système"])
def health(request: Request):
    det = request.app.state.detector
    return HealthResponse(
        status="ok" if det else "degraded",
        model_loaded=det is not None,
        gpu=bool(det and det.gpu),
        model_version=_model_version(request) if det else None,
    )


def _architecture(request: Request) -> str:
    """YOLO11s / YOLOv8n... déduit de params.WEIGHTS (notebook) ou du nom du run."""
    m = request.app.state.metrics
    weights = (m.get("params") or {}).get("WEIGHTS")
    if weights:
        return Path(weights).stem.replace("yolo", "YOLO", 1)
    best = m.get("best_run")
    return "YOLOv8n" if best and "_n_" in best else "YOLO"


@app.get(
    "/model/metadata",
    response_model=ModelMetadata,
    responses={503: {"model": ErrorResponse}},
    tags=["modèle"],
)
def model_metadata(request: Request):
    det = _require_detector(request)
    m = request.app.state.metrics
    if "comparaison_val" in m:  # format du notebook AgriVision (PlantDoc + PlantSeg)
        best = request.app.state.config.get("model")
        row = next((r for r in m["comparaison_val"] if r.get("run") == best), None)
        validation = (
            {k: float(v) for k, v in row.items() if k != "run" and isinstance(v, (int, float))}
            if row
            else None
        )
        test = {
            k: float(v) for k, v in (m.get("test") or {}).items() if isinstance(v, (int, float))
        } or None
        onnx = m.get("onnx") or {}
        bench = (
            {"onnx_fp32": {k: float(onnx[k]) for k in ("p50_ms", "p95_ms") if k in onnx}}
            if onnx
            else None
        )
        name = "AgriVision PlantDoc + PlantSeg"
    else:  # ancien format (runs MLflow exportés)
        best = m.get("best_run")
        val = next((r for r in m.get("runs", []) if r.get("tags.mlflow.runName") == best), None)
        validation = (
            {
                k.removeprefix("metrics."): float(v)
                for k, v in val.items()
                if k.startswith("metrics.")
            }
            if val
            else None
        )
        test = {k: float(v) for k, v in m.get("final_test", {}).items()} or None
        bench = m.get("benchmark") or None
        name = "AgriVision YOLOv8n PlantDoc"
    return ModelMetadata(
        name=name,
        version=_model_version(request),
        architecture=_architecture(request),
        input_size=det.size[0],
        num_classes=len(det.classes),
        classes=det.classes,
        validation_metrics=validation,
        test_metrics=test,
        benchmark_cpu=bench or None,
        mlflow_url=MLFLOW_URL,
    )


_ERRORS = {
    400: {"model": ErrorResponse},
    413: {"model": ErrorResponse},
    503: {"model": ErrorResponse},
}


@app.post("/predict", response_model=PredictResponse, responses=_ERRORS, tags=["inférence"])
def predict(
    request: Request,
    file: UploadFile = File(..., description="Image JPEG/PNG"),
    conf: float = Query(0.25, ge=0, le=1, description="Seuil de confiance"),
    iou: float = Query(0.45, ge=0, le=1, description="Seuil d'IoU pour le NMS"),
):
    t0 = time.perf_counter()
    img = _read_image(file)  # 400 si invalide, avant de tester le modèle
    det = _require_detector(request)
    preds, timings = det.predict(img, conf, iou)
    return PredictResponse(
        image_width=img.width,
        image_height=img.height,
        conf_threshold=conf,
        iou_threshold=iou,
        detections=[
            Detection(
                class_id=p.class_id,
                label=p.label,
                confidence=min(max(p.confidence, 0.0), 1.0),
                box=BoundingBox(x1=p.x1, y1=p.y1, x2=p.x2, y2=p.y2),
            )
            for p in preds
        ],
        latency_ms=(time.perf_counter() - t0) * 1000,
        timings=Timings(**timings),
        model_version=_model_version(request),
    )


@app.post(
    "/predict/top3",
    response_model=PredictResponse,
    responses=_ERRORS,
    tags=["inférence"],
    description="Top-3 des classes par boîte et statut « ok » / « incertain ». "
    "`alternatives` contient le top-3 (1re classe incluse) ; les scores YOLO ne "
    "somment pas à 1. Seuils par défaut : inference_config.json.",
)
def predict_top3(
    request: Request,
    file: UploadFile = File(..., description="Image JPEG/PNG"),
    conf_min: Optional[float] = Query(None, ge=0, le=1, description="Score minimal d'une boîte"),
    iou: Optional[float] = Query(None, ge=0, le=1, description="Seuil d'IoU pour le NMS"),
    accept: Optional[float] = Query(
        None, ge=0, le=1, description="Score minimal pour répondre « ok »"
    ),
    margin_min: Optional[float] = Query(
        None, ge=0, le=1, description="Écart minimal entre la 1re et la 2e classe"
    ),
):
    t0 = time.perf_counter()
    img = _read_image(file)
    det = _require_detector(request)
    cfg = request.app.state.config
    conf_min = cfg["conf_min"] if conf_min is None else conf_min
    iou = cfg["iou"] if iou is None else iou
    accept = cfg["accept"] if accept is None else accept
    margin_min = cfg["margin_min"] if margin_min is None else margin_min
    alt_min = cfg["alt_min_score"]
    preds, timings = det.predict_top3(
        img, conf_min=conf_min, iou=iou, accept=accept, margin_min=margin_min
    )
    detections = []
    for p in preds:
        cid, label, score = p.candidates[0]
        alts = [
            Alternative(class_id=c, label=l, score=min(max(sc, 0.0), 1.0))
            for k, (c, l, sc) in enumerate(p.candidates)
            if k == 0 or sc >= alt_min
        ]
        detections.append(
            Detection(
                class_id=cid,
                label=label,
                confidence=min(max(score, 0.0), 1.0),
                box=BoundingBox(x1=p.x1, y1=p.y1, x2=p.x2, y2=p.y2),
                alternatives=alts,
                margin=min(max(p.margin, 0.0), 1.0),
                status=p.status,
            )
        )
    return PredictResponse(
        image_width=img.width,
        image_height=img.height,
        conf_threshold=conf_min,
        iou_threshold=iou,
        detections=detections,
        status=overall_status(preds),
        latency_ms=(time.perf_counter() - t0) * 1000,
        timings=Timings(**timings),
        model_version=_model_version(request),
    )


@app.post(
    "/predict/visualize",
    responses={200: {"content": {"image/jpeg": {}}}, **_ERRORS},
    tags=["inférence"],
)
def predict_visualize(
    request: Request,
    file: UploadFile = File(...),
    conf: float = Query(0.25, ge=0, le=1),
    iou: float = Query(0.45, ge=0, le=1),
):
    img = _read_image(file)
    det = _require_detector(request)
    preds, timings = det.predict(img, conf, iou)
    buf = io.BytesIO()
    draw_detections(img, preds).save(buf, format="JPEG", quality=90)
    return Response(
        buf.getvalue(),
        media_type="image/jpeg",
        headers={
            "X-Detections": str(len(preds)),
            "X-Latency-Ms": f"{timings['total_ms']:.1f}",
        },
    )
