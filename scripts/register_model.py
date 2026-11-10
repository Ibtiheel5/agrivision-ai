"""Enregistre le modèle de models/ dans MLflow (runs + Model Registry).

Étapes :
  1. lance la porte d'évaluation (scripts/check_gate.py) : si elle échoue, rien
     n'est enregistré ;
  2. crée un run par modèle de metrics.json["comparaison_val"] (métriques de
     VALIDATION) ; le run du modèle retenu reçoit en plus les paramètres, le test,
     la latence, la calibration et les petits fichiers de config ;
  3. enregistre une version dans le Registry et lui donne l'alias `champion`.

L'artefact ONNX et son checkpoint sont inclus dans les artefacts MLflow du run
retenu, tandis que DVC versionne le répertoire de release. Le registry conserve
le commit Git et l'empreinte de dvc.lock pour retrouver les entrées exactes.

Usage (depuis la racine du dépôt, serveur MLflow lancé) :
    python scripts/register_model.py [--tracking-uri http://127.0.0.1:5000]
"""

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import mlflow
from mlflow import MlflowClient


def load_json(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def git_commit() -> str:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        )
        return out.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "inconnu"


def dvc_lock_sha256() -> str:
    try:
        return hashlib.sha256(Path("dvc.lock").read_bytes()).hexdigest()
    except OSError:
        return "inconnu"


def log_validation(row: dict) -> None:
    mlflow.log_metrics(
        {
            "val_mAP50": row["mAP50"],
            "val_mAP50_95": row["mAP50_95"],
            "val_precision": row["precision"],
            "val_rappel": row["rappel"],
        }
    )


def log_selected_run(metrics: dict, config: dict, model_dir: Path) -> None:
    mlflow.log_params({k: str(v) for k, v in metrics.get("params", {}).items()})
    mlflow.log_params(
        {
            "inference_conf": config["conf"],
            "inference_accept": config["accept"],
            "inference_iou": config["iou"],
            "inference_margin_min": config["margin_min"],
            "n_classes": len(config["classes"]),
        }
    )
    test = metrics.get("test") or {}
    mlflow.log_metrics({k: v for k, v in test.items() if isinstance(v, float)})
    onnx = metrics.get("onnx") or {}
    for key in ("p50_ms", "p95_ms", "taille_mo"):
        if key in onnx:
            mlflow.log_metric(f"notebook_onnx_{key}", onnx[key])
    local = Path("models/benchmark_local.json")
    if local.exists():
        bench = load_json(str(local))
        mlflow.log_metrics(
            {
                "local_p50_ms": bench["p50_ms"],
                "local_p95_ms": bench["p95_ms"],
                "local_inference_p95_ms": bench["inference_p95_ms"],
            }
        )
    calib = metrics.get("calibration_top3") or {}
    mlflow.log_metrics({f"calib_{k}": v for k, v in calib.items() if isinstance(v, float)})
    files = [
        model_dir / "metrics.json",
        model_dir / "inference_config.json",
        model_dir / "classes.txt",
        model_dir / "best.onnx",
        model_dir / "best.pt",
        local,
        Path("params.yaml"),
        Path("dvc.yaml"),
        Path("dvc.lock"),
    ]
    for file_path in files:
        if file_path.exists():
            mlflow.log_artifact(str(file_path), artifact_path="model_ref")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tracking-uri", default="http://127.0.0.1:5000")
    ap.add_argument("--experiment", default="agrivision")
    ap.add_argument("--model-name", default="agrivision-detector")
    ap.add_argument("--model-dir", default="models/release")
    args = ap.parse_args()
    model_dir = Path(args.model_dir)

    gate = subprocess.run([sys.executable, "scripts/check_gate.py"])
    if gate.returncode != 0:
        print("Porte d'évaluation en échec : rien n'est enregistré.")
        return 1

    metrics = load_json(str(model_dir / "metrics.json"))
    config = load_json(str(model_dir / "inference_config.json"))
    selected = config["model"]

    mlflow.set_tracking_uri(args.tracking_uri)
    mlflow.set_experiment(args.experiment)
    client = MlflowClient()
    commit, lock_hash = git_commit(), dvc_lock_sha256()

    for row in metrics["comparaison_val"]:
        name = row["run"]
        with mlflow.start_run(run_name=name):
            mlflow.set_tags(
                {
                    "source": "import depuis metrics.json (entraînement Kaggle)",
                    "selected": str(name == selected),
                    "git_commit": commit,
                }
            )
            log_validation(row)
            if name == selected:
                mlflow.set_tag("dvc_lock_sha256", lock_hash)
                log_selected_run(metrics, config, model_dir)
    selected_run_id = metrics.get("mlflow_comparison_run_id")
    if selected_run_id is None:
        print("ECHEC : metrics.json ne référence pas le run MLflow complet du modèle ONNX.")
        print("Lancez le pipeline DVC d'entraînement et d'évaluation avant l'enregistrement.")
        return 1

    try:
        client.create_registered_model(
            args.model_name,
            description="Détecteur de maladies foliaires YOLO servi par ONNX Runtime.",
        )
    except mlflow.exceptions.MlflowException:
        pass  # le modèle existe déjà : on ajoute une version
    version = client.create_model_version(
        name=args.model_name,
        source=f"runs:/{selected_run_id}/model",
        run_id=selected_run_id,
        tags={"git_commit": commit, "dvc_lock_sha256": lock_hash, "gate": "OK"},
    )
    client.set_registered_model_alias(args.model_name, "champion", version.version)
    print(
        f"{args.model_name} v{version.version} (alias champion) <- run "
        f"{selected_run_id} | commit {commit} | dvc.lock {lock_hash[:12]}"
    )
    print(f"UI : {args.tracking_uri}/#/models/{args.model_name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
