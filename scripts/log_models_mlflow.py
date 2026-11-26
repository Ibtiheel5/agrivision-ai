import json
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import mlflow
import onnx
import yaml
from mlflow import MlflowClient

ROOT = Path(__file__).resolve().parent.parent
TRACKING_URI = "http://127.0.0.1:5000"
EXPERIMENT = "agrivision"

MODELS = {
    "best.onnx": "agrivision-leaf-classifier",
    "agrivision_v5_outputs/classifier.onnx": "agrivision-leaf-classifier",
    "agrivision_v5_outputs/leaf_detector.onnx": "agrivision-leaf-detector",
}


def load_json(path):
    with (ROOT / path).open(encoding="utf-8") as handle:
        return json.load(handle)


def flatten(prefix, value):
    if isinstance(value, dict):
        items = []
        for key, child in value.items():
            items.extend(flatten(f"{prefix}.{key}" if prefix else key, child))
        return items
    return [(prefix, value)]


def git_commit():
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    except Exception:
        return "unknown"


def main():
    metrics = load_json("models/metrics.json")
    config = load_json("models/inference_config.json")
    metadata = load_json("models/metadata.json")
    params = yaml.safe_load((ROOT / "params.yaml").read_text(encoding="utf-8"))

    mlflow.set_tracking_uri(TRACKING_URI)
    mlflow.set_experiment(EXPERIMENT)
    client = MlflowClient()

    registered = []
    with mlflow.start_run(run_name="log-existing-models"):
        mlflow.log_params({k: v for k, v in flatten("", {**params, **config, **metadata}) if isinstance(v, (str, int, float, bool))})
        mlflow.log_metrics({k: float(v) for k, v in flatten("", metrics) if isinstance(v, (int, float)) and not isinstance(v, bool)})
        mlflow.set_tag("git_commit", git_commit())
        for artifact in ("requirements-lock.txt", "dvc.lock", "params.yaml", "models/metrics.json", "models/metadata.json", "models/inference_config.json"):
            path = ROOT / artifact
            if path.exists():
                mlflow.log_artifact(str(path), artifact_path="metadata")

        for relative, name in MODELS.items():
            path = ROOT / "models" / relative
            if not path.exists():
                print(f"skip missing: {path}")
                continue
            info = mlflow.onnx.log_model(onnx.load(str(path)), name=Path(relative).stem, registered_model_name=name)
            version = info.registered_model_version
            client.set_registered_model_alias(name, "challenger", version)
            registered.append((name, version, str(path.relative_to(ROOT))))

    for name, version, path in registered:
        print(f"registered {name} v{version} from {path}")
    if not registered:
        print("no ONNX model registered")


if __name__ == "__main__":
    main()
