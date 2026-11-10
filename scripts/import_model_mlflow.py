"""Importe dans MLflow les poids et métriques d'un modèle déjà entraîné."""
import json
import os
from pathlib import Path
import sys

import mlflow
import yaml

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
REQUIRED_FILES = ("best.onnx", "best.pt", "classes.txt", "model_metadata.json")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")
    missing = [name for name in REQUIRED_FILES if not (MODEL_DIR / name).is_file()]
    if missing:
        raise FileNotFoundError(f"Fichiers requis manquants dans {MODEL_DIR}: {', '.join(missing)}")

    details = json.loads((MODEL_DIR / "model_metadata.json").read_text(encoding="utf-8"))
    params = yaml.safe_load((ROOT / "params.yaml").read_text(encoding="utf-8"))
    mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", params["mlflow"]["tracking_uri"]))
    experiment = mlflow.set_experiment(params["mlflow"]["experiment"])
    if not experiment.artifact_location.startswith("mlflow-artifacts:"):
        raise RuntimeError(
            f"L'expérience MLflow utilise un stockage local non accessible au client: {experiment.artifact_location}"
        )

    with mlflow.start_run(run_name=f"{details['model']}_import") as run:
        mlflow.set_tags({
            "source": "Kaggle",
            "run_type": "imported_trained_model",
            "metrics_source": "model_metadata.json",
        })
        mlflow.log_params({
            "model": details["model"],
            "imgsz": details["imgsz"],
            "num_classes": len(details["classes"]),
            "conf_threshold": details["conf_recommande"],
            "iou_threshold": details["iou"],
        })
        mlflow.log_metrics({
            "test_map50": details["test_map50"],
            "test_map50_95": details["test_map50_95"],
        })
        for name in (*REQUIRED_FILES, "metadata.json"):
            path = MODEL_DIR / name
            if path.is_file():
                mlflow.log_artifact(str(path), artifact_path="model")

    print(f"Modèle importé dans MLflow. Run ID: {run.info.run_id}")


if __name__ == "__main__":
    main()
