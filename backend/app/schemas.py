from typing import List

from pydantic import BaseModel, Field


class Detection(BaseModel):
    label: str
    confidence: float = Field(ge=0, le=1)
    box: List[float] = Field(min_length=4, max_length=4)  # x1, y1, x2, y2 en pixels


class PredictResponse(BaseModel):
    detections: List[Detection]
    inference_ms: float
    model_version: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    gpu: bool
    model_version: str


class ModelMetadata(BaseModel):
    name: str
    architecture: str
    version: str
    classes: List[str]
    metrics: dict
