from ultralytics import YOLO


def build_model(weights="yolov8n.pt"):
    # Modèle YOLO pré-entraîné (transfer learning)
    return YOLO(weights)
