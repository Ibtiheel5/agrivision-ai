"""Schémas Pydantic (entrée/sortie) de l'API AgriVision."""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class BoundingBox(BaseModel):
    """Boîte en pixels, dans le repère de l'image d'origine (origine en haut à gauche)."""

    model_config = ConfigDict(extra="forbid")
    x1: float = Field(..., ge=0)
    y1: float = Field(..., ge=0)
    x2: float = Field(..., ge=0)
    y2: float = Field(..., ge=0)


class Alternative(BaseModel):
    """Classe candidate d'une boîte (score YOLO : sigmoïde indépendante, pas une probabilité)."""

    model_config = ConfigDict(extra="forbid")
    class_id: int = Field(..., ge=0)
    label: str
    score: float = Field(..., ge=0, le=1)


class Detection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    class_id: int = Field(..., ge=0)
    label: str
    confidence: float = Field(..., ge=0, le=1)
    box: BoundingBox
    # Champs optionnels du mode top-3 (absents du mode simple)
    alternatives: Optional[list[Alternative]] = None
    margin: Optional[float] = Field(
        None, ge=0, le=1, description="Écart de score entre la 1re et la 2e classe"
    )
    status: Optional[Literal["ok", "incertain"]] = None


class Timings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    preprocess_ms: float = Field(..., ge=0)
    inference_ms: float = Field(..., ge=0)
    postprocess_ms: float = Field(..., ge=0)
    total_ms: float = Field(..., ge=0)


class PredictResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", protected_namespaces=())
    image_width: int = Field(..., gt=0)
    image_height: int = Field(..., gt=0)
    conf_threshold: float = Field(..., ge=0, le=1)
    iou_threshold: float = Field(..., ge=0, le=1)
    detections: list[Detection]
    status: Optional[Literal["ok", "incertain", "aucune_detection"]] = Field(
        None,
        description="Statut global (mode top-3) : 'incertain' si au moins une boîte est douteuse",
    )
    latency_ms: float = Field(
        ..., ge=0, description="Latence serveur totale (décodage image + modèle)"
    )
    timings: Timings
    model_version: str


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    status: Literal["ok", "degraded"]
    model_loaded: bool
    gpu: bool
    model_version: Optional[str] = None


class ModelMetadata(BaseModel):
    name: str
    version: str
    architecture: str
    input_size: int = Field(..., gt=0)
    num_classes: int = Field(..., gt=0)
    classes: list[str]
    validation_metrics: Optional[dict[str, float]] = None
    test_metrics: Optional[dict[str, float]] = None
    benchmark_cpu: Optional[dict[str, dict[str, float]]] = None
    mlflow_url: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str
