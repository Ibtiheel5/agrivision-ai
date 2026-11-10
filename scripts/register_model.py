"""Enregistre models/best.onnx dans MLflow Model Registry et le promeut (alias staging / production).

Usage : python scripts/register_model.py --stage production --version-tag B2
Le passage en production exige la porte d'évaluation (voir export_onnx.py).
"""
import argparse

import mlflow
from mlflow.tracking import MlflowClient

ap = argparse.ArgumentParser()
ap.add_argument("--uri", default="http://localhost:5000")
ap.add_argument("--name", default="agrivision-ia")
ap.add_argument("--stage", choices=["staging", "production"], default="staging")
ap.add_argument("--version-tag", default="")
a = ap.parse_args()

mlflow.set_tracking_uri(a.uri)
mlflow.set_experiment("agrivision-ia")
with mlflow.start_run(run_name="register_onnx") as run:
    mlflow.log_artifact("models/best.onnx", artifact_path="model")
    mlflow.log_artifact("models/classes.txt", artifact_path="model")
    mv = mlflow.register_model(f"runs:/{run.info.run_id}/model", a.name)
client = MlflowClient()
client.set_registered_model_alias(a.name, a.stage, mv.version)  # alias = remplaçant moderne des "stages"
if a.version_tag:
    client.set_model_version_tag(a.name, mv.version, "release", a.version_tag)
print(f"Version {mv.version} -> alias '{a.stage}'")
