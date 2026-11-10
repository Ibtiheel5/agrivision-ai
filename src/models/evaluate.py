"""Select a YOLO checkpoint on validation, evaluate test once, and export ONNX."""

from __future__ import annotations

import argparse
import json
import os
import shutil
from pathlib import Path
from typing import Any

import mlflow
import yaml


def detection_metrics(result: Any) -> dict[str, float]:
    """Normalize Ultralytics detection metrics to stable report keys."""
    box = result.box
    return {
        "mAP50": float(box.map50),
        "mAP50_95": float(box.map),
        "precision": float(box.mp),
        "rappel": float(box.mr),
    }


def _per_class_metrics(result: Any, classes: list[str]) -> dict[str, dict[str, float]]:
    box = result.box
    precision = list(getattr(box, "p", []))
    recall = list(getattr(box, "r", []))
    f1 = list(getattr(box, "f1", []))
    ap50 = list(getattr(box, "ap50", []))
    ap = list(getattr(box, "all_ap", []))
    output: dict[str, dict[str, float]] = {}
    for class_id, name in enumerate(classes):
        row: dict[str, float] = {}
        for key, values in (
            ("precision", precision),
            ("recall", recall),
            ("f1", f1),
            ("AP50", ap50),
        ):
            if class_id < len(values):
                row[key] = float(values[class_id])
        if class_id < len(ap):
            row["AP50_95"] = float(sum(ap[class_id]) / len(ap[class_id]))
        output[name] = row
    return output


def _evaluate(weights: str, data_yaml: str, split: str, name: str, imgsz: int) -> Any:
    from ultralytics import YOLO

    model = YOLO(weights)
    return model.val(
        data=data_yaml,
        split=split,
        imgsz=imgsz,
        plots=True,
        project="runs/evaluation",
        name=name,
        exist_ok=True,
    )


def evaluate(params_path: str | Path = "params.yaml") -> Path:
    params_file = Path(params_path)
    params = yaml.safe_load(params_file.read_text(encoding="utf-8"))
    output_dir = Path(params["evaluation"]["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)
    data_yaml = str(Path(params["data"]["processed_dir"]) / "data.yaml")
    class_names = list(params["data"]["classes"])
    experiments = params["experiments"]

    mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "http://127.0.0.1:5000"))
    mlflow.set_experiment(params["train"]["experiment"])
    validation: dict[str, Any] = {}
    rows: list[dict[str, Any]] = []
    for experiment_id, config in experiments.items():
        checkpoint = Path(config["output"])
        if not checkpoint.is_file():
            raise FileNotFoundError(f"Checkpoint for {experiment_id} not found: {checkpoint}")
        result = _evaluate(
            str(checkpoint),
            data_yaml,
            "val",
            f"{experiment_id}_val",
            int(params["train"]["imgsz"]),
        )
        metrics = detection_metrics(result)
        row = {"run": config["run_name"], **metrics}
        rows.append(row)
        validation[experiment_id] = {
            "metrics": metrics,
            "per_class": _per_class_metrics(result, class_names),
            "save_dir": str(result.save_dir),
        }
        with mlflow.start_run(run_name=f"{config['run_name']}_validation") as validation_run:
            mlflow.set_tags(
                {
                    "split": "validation",
                    "experiment_role": experiment_id,
                    "selection_metric": "mAP50_95",
                }
            )
            mlflow.log_metrics({f"val_{key}": value for key, value in metrics.items()})
            for plot_name in ("confusion_matrix.png", "PR_curve.png", "F1_curve.png"):
                plot = Path(result.save_dir) / plot_name
                if plot.is_file():
                    mlflow.log_artifact(str(plot), artifact_path="validation")
        validation[experiment_id]["mlflow_run_id"] = validation_run.info.run_id

    selection_metric = params.get("selection", {}).get("metric", "mAP50_95")
    selected_id = max(
        experiments,
        key=lambda experiment_id: validation[experiment_id]["metrics"][selection_metric],
    )
    selected = experiments[selected_id]
    selected_checkpoint = Path(selected["output"])

    # Model selection is finalized from validation before test is ever read.
    test_result = _evaluate(
        str(selected_checkpoint),
        data_yaml,
        "test",
        "selected_model_test",
        int(params["train"]["imgsz"]),
    )
    test_values = detection_metrics(test_result)
    test = {
        "run": selected["run_name"],
        **{f"test_{key}": value for key, value in test_values.items()},
    }
    test_per_class = _per_class_metrics(test_result, class_names)
    with mlflow.start_run(run_name=f"{selected['run_name']}_final_test"):
        mlflow.set_tags({"split": "test", "selected_by": selection_metric})
        mlflow.log_metrics({f"test_{key}": value for key, value in test_values.items()})
        plot = Path(test_result.save_dir) / "confusion_matrix.png"
        if plot.is_file():
            mlflow.log_artifact(str(plot), artifact_path="test")

    shutil.copy2(selected_checkpoint, output_dir / "best.pt")
    from ultralytics import YOLO

    model = YOLO(str(selected_checkpoint))
    exported_path = Path(
        model.export(format="onnx", imgsz=int(params["train"]["imgsz"]), simplify=True)
    )
    onnx_path = output_dir / "best.onnx"
    shutil.copy2(exported_path, onnx_path)
    onnx_val_result = _evaluate(
        str(onnx_path), data_yaml, "val", "selected_onnx_val", int(params["train"]["imgsz"])
    )
    onnx_test_result = _evaluate(
        str(onnx_path), data_yaml, "test", "selected_onnx_test", int(params["train"]["imgsz"])
    )
    onnx_val = detection_metrics(onnx_val_result)
    onnx_test = detection_metrics(onnx_test_result)

    (output_dir / "classes.txt").write_text("\n".join(class_names) + "\n", encoding="utf-8")
    inference = params["inference"]
    config = {
        "model": selected["run_name"],
        "weights": selected["weights"],
        "imgsz": int(params["train"]["imgsz"]),
        "conf": float(inference["conf"]),
        "conf_min": float(inference["conf_min"]),
        "accept": float(inference.get("accept", inference["conf"])),
        "margin_min": float(inference.get("margin_min", 0.0)),
        "iou": float(inference["iou"]),
        "alt_min_score": float(inference.get("alt_min_score", 0.05)),
        "classes": class_names,
    }
    (output_dir / "inference_config.json").write_text(
        json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    metrics = {
        "best_run": selected["run_name"],
        "selection_metric": selection_metric,
        "comparaison_val": rows,
        "validation_per_class": validation,
        "test": test,
        "test_per_class": test_per_class,
        "onnx_val": onnx_val,
        "onnx_test": onnx_test,
        "params": {"WEIGHTS": selected["weights"], "IMGSZ": params["train"]["imgsz"]},
    }
    metrics_path = output_dir / "metrics.json"
    metrics_path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    with mlflow.start_run(run_name="yolo_architecture_comparison") as comparison_run:
        mlflow.set_tags({"purpose": "baseline_vs_advanced", "selection_split": "validation"})
        for row in rows:
            prefix = row["run"].lower()
            mlflow.log_metrics(
                {f"{prefix}_{key}": value for key, value in row.items() if key != "run"}
            )
        mlflow.log_metric(
            "onnx_val_map50_delta", onnx_val["mAP50"] - validation[selected_id]["metrics"]["mAP50"]
        )
        mlflow.log_metric("onnx_test_map50_delta", onnx_test["mAP50"] - test_values["mAP50"])
        mlflow.set_tag("selected_model", selected["run_name"])
        mlflow.onnx.log_model(str(onnx_path), name="model")
        for name in (
            "best.pt",
            "best.onnx",
            "classes.txt",
            "inference_config.json",
            "metrics.json",
        ):
            mlflow.log_artifact(str(output_dir / name), artifact_path="selected_model")
    selected_run_id = comparison_run.info.run_id
    metrics["mlflow_comparison_run_id"] = selected_run_id
    metrics_path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    mlflow.MlflowClient().log_artifact(
        selected_run_id, str(metrics_path), artifact_path="selected_model"
    )
    return output_dir


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--params", default="params.yaml")
    args = parser.parse_args()
    evaluate(args.params)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
