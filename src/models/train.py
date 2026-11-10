"""Train a configured YOLO experiment and track it in MLflow."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import time
from pathlib import Path
from typing import Any

import mlflow
import yaml

from src.models.architecture import build_model


def _manifest_hash(path: Path) -> str:
    if not path.exists():
        return "unavailable"
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _loggable(value: Any) -> str | float | int | bool:
    if isinstance(value, (str, int, float, bool)):
        return value
    return json.dumps(value, sort_keys=True, ensure_ascii=False)


def train(experiment_name: str, params_path: str | Path = "params.yaml") -> Path:
    params_file = Path(params_path)
    params = yaml.safe_load(params_file.read_text(encoding="utf-8"))
    experiments = params.get("experiments", {})
    if experiment_name not in experiments:
        raise ValueError(
            f"Unknown experiment '{experiment_name}'. Choose from {sorted(experiments)}"
        )

    experiment = experiments[experiment_name]
    common = params["train"]
    run_name = experiment["run_name"]
    weights = experiment["weights"]
    output = Path(experiment["output"])
    data_yaml = Path(params["data"]["processed_dir"]) / "data.yaml"
    if not data_yaml.is_file():
        raise FileNotFoundError(
            f"Prepared dataset not found: {data_yaml}; run the DVC prepare stage"
        )

    mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "http://127.0.0.1:5000"))
    mlflow.set_experiment(common["experiment"])
    logged_params = {
        "experiment_id": experiment_name,
        "run_name": run_name,
        "weights": weights,
        "seed": params["seed"],
        "imgsz": common["imgsz"],
        "epochs": common["epochs"],
        "batch": common["batch"],
        "patience": common["patience"],
        "optimizer": common["optimizer"],
        "lr0": common["lr0"],
        "lrf": common["lrf"],
        "warmup_epochs": common["warmup_epochs"],
        "time_hours": common.get("time_hours"),
        "augmentation": common.get("augment", {}),
    }

    with mlflow.start_run(run_name=run_name):
        mlflow.set_tags(
            {
                "architecture_family": "YOLO",
                "experiment_role": experiment_name,
                "dataset_manifest_sha256": _manifest_hash(
                    Path(params["data"]["processed_dir"]) / "split_manifest.json"
                ),
            }
        )
        mlflow.log_params({key: _loggable(value) for key, value in logged_params.items()})

        model = build_model(weights)
        train_args: dict[str, Any] = {
            "data": str(data_yaml),
            "imgsz": int(common["imgsz"]),
            "epochs": int(common["epochs"]),
            "batch": int(common["batch"]),
            "patience": int(common["patience"]),
            "optimizer": common["optimizer"],
            "lr0": float(common["lr0"]),
            "lrf": float(common["lrf"]),
            "warmup_epochs": int(common["warmup_epochs"]),
            "seed": int(params["seed"]),
            "deterministic": True,
            "project": "runs/train",
            "name": run_name,
            "exist_ok": True,
            "plots": True,
            "save": True,
        }
        if common.get("time_hours") is not None:
            train_args["time"] = float(common["time_hours"])
        if common.get("device"):
            train_args["device"] = common["device"]
        train_args.update(common.get("augment", {}))

        started = time.perf_counter()
        results = model.train(**train_args)
        training_duration = time.perf_counter() - started
        metrics = {
            key.replace("(", "_").replace(")", ""): float(value)
            for key, value in results.results_dict.items()
            if isinstance(value, (int, float))
        }
        if metrics:
            mlflow.log_metrics(metrics)
        mlflow.log_metric("training_duration_seconds", training_duration)

        best_path = Path(results.save_dir) / "weights" / "best.pt"
        if not best_path.is_file():
            raise FileNotFoundError(f"Ultralytics did not create the best checkpoint: {best_path}")
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(best_path, output)
        mlflow.log_artifact(str(output), artifact_path="checkpoint")
        for artifact_name in ("results.csv", "results.png", "confusion_matrix.png"):
            artifact = Path(results.save_dir) / artifact_name
            if artifact.is_file():
                mlflow.log_artifact(str(artifact), artifact_path="training")
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--experiment", choices=("baseline", "advanced"), required=True)
    parser.add_argument("--params", default="params.yaml")
    args = parser.parse_args()
    train(args.experiment, args.params)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
