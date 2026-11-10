"""Schémas Pydantic stricts (entrées / sorties de l'API)."""

from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class Box(BaseModel):
    model_config = ConfigDict(extra="forbid")
    x1: float = Field(..., description="Coin haut-gauche (pixels image originale)")
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    class_id: int = Field(..., ge=0)
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    box: Box


class PredictResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    detections: List[Detection]
    class_scores: Dict[str, float] = Field(..., description="Meilleur score par classe détectée")
    image_width: int
    image_height: int
    conf_threshold: float
    iou_threshold: float
    server_latency_ms: float = Field(..., description="Temps d'inférence serveur")
    model_version: str


class VisualizeResponse(PredictResponse):
    annotated_image_base64: str = Field(..., description="JPEG annoté, base64")


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    gpu_available: bool
    model_version: Optional[str]
    inference_engine: str


class ModelMetadata(BaseModel):
    name: str
    architecture: str
    version: str
    num_classes: int
    class_names: List[str]
    input_size: List[int]
    conf_threshold: float
    iou_threshold: float
    validation_metrics: Dict[str, float]
    extra: Dict[str, str] = {}
    benchmark_cpu: Optional[Dict[str, Dict[str, float]]] = None


class ErrorResponse(BaseModel):
    detail: str
