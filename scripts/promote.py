"""Enregistre l'évaluation dans MLflow et gère les alias challenger / champion."""

import json
import subprocess

import mlflow
import onnx
import yaml
from mlflow import MlflowClient

NAME = "agrivision-leaf-classifier"
p = yaml.safe_load(open("params.yaml", encoding="utf-8"))["eval"]
m = json.load(open("metrics/classifier.json", encoding="utf-8"))
mlflow.set_tracking_uri("http://127.0.0.1:5000")
mlflow.set_experiment("agrivision")
client = MlflowClient()

with mlflow.start_run(run_name="eval-classifier"):
    mlflow.log_params(p)
    mlflow.log_metrics({"accuracy": m["accuracy"], "images": m["images"]})
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    mlflow.set_tag("git_commit", commit)
    for f in ("dvc.lock", "params.yaml", "requirements-lock.txt"):
        mlflow.log_artifact(f)
    info = mlflow.onnx.log_model(onnx.load("models/classifier.onnx"), name="model", registered_model_name=NAME)

version = info.registered_model_version
client.set_registered_model_alias(NAME, "challenger", version)
best = float("-inf")
aliases = client.get_registered_model(NAME).aliases
if "champion" in aliases:
    champ = client.get_model_version(NAME, aliases["champion"])
    best = client.get_run(champ.run_id).data.metrics.get("accuracy", best)
if m["accuracy"] >= p["min_accuracy"] and m["accuracy"] >= best + p["min_gain"]:
    client.set_registered_model_alias(NAME, "champion", version)
    print("promu champion :", version)
else:
    print("non promu :", m["accuracy"])
