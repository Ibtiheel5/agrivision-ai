"""Porte d'évaluation : vérifie le modèle de models/ avant de le déclarer « production ».

Lit params.yaml (gate), models/metrics.json et models/inference_config.json.
La latence vient de models/benchmark_local.json si elle existe (mesure sur la machine
cible), sinon de metrics.json (mesure du notebook). La mAP50 vient de la VALIDATION,
jamais du test. Code de sortie 1 si une condition échoue.
"""

import json
import sys
from pathlib import Path

import yaml


def latency_p95(metrics: dict) -> tuple:
    local = Path("models/benchmark_local.json")
    if local.exists():
        return (
            json.loads(local.read_text(encoding="utf-8")).get("p95_ms"),
            "benchmark_local.json",
        )
    return (metrics.get("onnx") or {}).get("p95_ms"), "metrics.json (notebook)"


def main() -> int:
    gate = yaml.safe_load(Path("params.yaml").read_text(encoding="utf-8"))["gate"]
    metrics = json.loads(Path("models/metrics.json").read_text(encoding="utf-8"))
    config = json.loads(
        Path("models/inference_config.json").read_text(encoding="utf-8")
    )
    run = config["model"]
    row = next(
        (r for r in metrics.get("comparaison_val", []) if r.get("run") == run), None
    )
    if row is None:
        print(f"ECHEC : run '{run}' absent de metrics.json (comparaison_val)")
        return 1
    p95, source = latency_p95(metrics)
    if p95 is None:
        print("ECHEC : latence p95 introuvable")
        return 1
    ok_map = row["mAP50"] >= gate["min_map50"]
    ok_lat = p95 <= gate["max_latency_ms"]
    verdict = {True: "OK", False: "ECHEC"}
    print(f"Modèle : {run}")
    print(
        f"mAP50 validation : {row['mAP50']:.3f} (min {gate['min_map50']}) -> {verdict[ok_map]}"
    )
    print(
        f"Latence p95 : {p95:.1f} ms (max {gate['max_latency_ms']}) -> {verdict[ok_lat]}"
    )
    print(f"Source de la latence : {source}")
    return 0 if (ok_map and ok_lat) else 1


if __name__ == "__main__":
    sys.exit(main())
