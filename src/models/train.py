"""Entraînement YOLO11 + tracking MLflow (params, métriques par epoch, artefacts, tags)."""
import argparse
import subprocess
import time
from pathlib import Path

import mlflow
import yaml

from .architecture import build_model


def git_commit() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    except Exception:  # noqa: BLE001
        return "unknown"


def main(params_path: str) -> None:
    P = yaml.safe_load(Path(params_path).read_text())
    t, data_yaml = P["train"], str(Path(P["data"]["processed_dir"]) / "data.yaml")
    mlflow.set_tracking_uri(P["mlflow"]["tracking_uri"])
    mlflow.set_experiment(P["mlflow"]["experiment"])
    with mlflow.start_run(run_name=f"{Path(t['model']).stem}_{t['imgsz']}"):
        mlflow.set_tags({"git_commit": git_commit(), "dataset": "PlantDoc+PlantSeg"})
        mlflow.log_params({k: v for k, v in t.items() if k != "augment"} | t["augment"] | {"seed": P["seed"]})
        mlflow.log_artifact(params_path)
        model = build_model(t["model"])

        def on_epoch_end(trainer):
            mlflow.log_metrics(
                {k.replace("(", "_").replace(")", "").replace("/", "_"): float(v) for k, v in trainer.metrics.items()},
                step=trainer.epoch,
            )

        model.add_callback("on_fit_epoch_end", on_epoch_end)
        start = time.time()
        model.train(
            data=data_yaml, epochs=t["epochs"], imgsz=t["imgsz"], batch=t["batch"], patience=t["patience"],
            optimizer=t["optimizer"], seed=P["seed"], project="runs", name="train", exist_ok=True, **t["augment"],
        )  # fmt: skip
        mlflow.log_metric("training_duration_s", time.time() - start)
        best = Path("runs/train/weights/best.pt")
        Path("models").mkdir(exist_ok=True)
        Path("models/best.pt").write_bytes(best.read_bytes())
        mlflow.log_artifacts("runs/train", artifact_path="ultralytics_run")  # courbes PR, matrice de confusion...


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--params", default="params.yaml")
    main(ap.parse_args().params)
