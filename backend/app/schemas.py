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


    plant: Optional[str] = None
    disease: Optional[str] = None
    source: Optional[str] = None
    alternatives: Optional[List["Alternative"]] = None


class Alternative(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: str
    confidence: float


class LeafResult(BaseModel):
    """Une feuille detectee : boite + top-3 du classifieur."""
    model_config = ConfigDict(extra="forbid")
    box: Box
    leaf_confidence: float
    recognized: bool
    class_id: Optional[int] = None
    label: Optional[str] = None
    plant: Optional[str] = None
    disease: Optional[str] = None
    confidence: Optional[float] = None
    alternatives: List[Alternative] = []
    source: Optional[str] = None


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


    status: str = "ok"
    leaves: Optional[List[LeafResult]] = None


class VisualizeResponse(PredictResponse):
    annotated_image_base64: str = Field(..., description="JPEG annoté, base64")


# ── Pipeline fruits / légumes (détecteur + classifieur) : mêmes champs + détails produit / état.
# `extra="forbid"` est hérité : tout champ renvoyé par le pipeline doit donc être déclaré ici.
class TopClass(BaseModel):
    model_config = ConfigDict(extra="forbid")
    class_id: int = Field(..., ge=0)
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class FruitDetection(Detection):
    det_confidence: float = Field(..., ge=0.0, le=1.0, description="Confiance du détecteur (boîte)")
    score: float = Field(..., ge=0.0, le=1.0, description="det_confidence^alpha × probabilité de classe")
    produce: str = Field(..., description="Produit (ex. Apple, Mango)")
    state: str = Field(..., description="État : fresh | rotten | diseased")
    healthy: bool = Field(..., description="True si l'état est « fresh »")
    fallback_full_image: bool = Field(..., description="Aucun fruit détecté : l'image entière a été classée")
    top3: List[TopClass]


class FruitPredictResponse(PredictResponse):
    detections: List[FruitDetection]


class FruitVisualizeResponse(FruitPredictResponse):
    annotated_image_base64: str = Field(..., description="JPEG annoté, base64")


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    gpu_available: bool
    model_version: Optional[str]
    inference_engine: str
    fruit_model_loaded: bool = False
    fruit_model_version: Optional[str] = None


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

Detection.model_rebuild()
