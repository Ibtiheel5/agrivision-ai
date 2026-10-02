import io
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, UnidentifiedImageError

from app.inference import load_detector
from app.visualize import draw_boxes
from app.schemas import HealthResponse, ModelMetadata, PredictResponse


@asynccontextmanager
async def lifespan(app):
    app.state.detector = load_detector()
    yield


app = FastAPI(title="AgriVision AI API", version="1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.state.detector = None


def get_detector():
    det = app.state.detector
    if det is None:
        raise HTTPException(status_code=503, detail="Modèle non chargé")
    return det


async def read_image(file: UploadFile) -> Image.Image:
    try:
        return Image.open(io.BytesIO(await file.read())).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Le fichier n'est pas une image valide")


@app.get("/health", response_model=HealthResponse)
def health():
    det = app.state.detector
    return HealthResponse(
        status="ok",
        model_loaded=det is not None,
        gpu=bool(det and det.gpu),
        model_version=det.version if det else "none",
    )


@app.get("/model/metadata", response_model=ModelMetadata)
def metadata():
    det = get_detector()
    return ModelMetadata(
        name="agrivision-yolo",
        architecture="YOLOv8",
        version=det.version,
        classes=det.classes,
        metrics={},
    )  # TODO : lire models/metrics.json


@app.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    det = get_detector()
    img = await read_image(file)
    dets, ms = det.predict(np.array(img))
    return PredictResponse(detections=dets, inference_ms=ms, model_version=det.version)


@app.post("/predict/visualize")
async def visualize(file: UploadFile = File(...)):
    det = get_detector()
    img = await read_image(file)
    dets, _ = det.predict(np.array(img))
    out = io.BytesIO()
    draw_boxes(img, dets).save(out, format="PNG")
    return Response(content=out.getvalue(), media_type="image/png")
