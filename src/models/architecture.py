"""Définition du réseau : YOLO11 (Ultralytics), poids pré-entraînés COCO (transfer learning)."""
from ultralytics import YOLO


def build_model(weights: str = "yolo11s.pt") -> YOLO:
    return YOLO(weights)
