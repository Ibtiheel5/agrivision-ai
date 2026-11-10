"""Gate the models/release artifact before model registration.

Validation mAP50 is compared with its configured minimum; p95 latency is measured locally.
"""

import json
import os
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
    release_dir = Path(os.getenv("MODEL_RELEASE_DIR", "models/release"))
    metrics = json.loads((release_dir / "metrics.json").read_text(encoding="utf-8"))
    config = json.loads((release_dir / "inference_config.json").read_text(encoding="utf-8"))
    run = config["model"]
    row = next((r for r in metrics.get("comparaison_val", []) if r.get("run") == run), None)
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
    print(f"mAP50 validation : {row['mAP50']:.3f} (min {gate['min_map50']}) -> {verdict[ok_map]}")
    print(f"Latence p95 : {p95:.1f} ms (max {gate['max_latency_ms']}) -> {verdict[ok_lat]}")
    print(f"Source de la latence : {source}")
    return 0 if (ok_map and ok_lat) else 1


if __name__ == "__main__":
    sys.exit(main())
