"""Mesure la latence du détecteur sur CETTE machine et écrit models/benchmark_local.json.

Usage (depuis la racine du dépôt) :
    python scripts/benchmark_latency.py [--image chemin.jpg] [--runs 30]

Mesure predict() après échauffement : prétraitement + inférence + post-traitement,
sans le décodage de l'image ni le réseau HTTP.
"""

import argparse
import json
import os
import platform
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

sys.path.insert(0, "backend")
from app.inference import Detector, load_classes  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--image", default=None, help="image JPEG/PNG (sinon image synthétique)"
    )
    ap.add_argument("--runs", type=int, default=30)
    ap.add_argument("--model", default="models/best.onnx")
    ap.add_argument("--classes", default="models/classes.txt")
    ap.add_argument("--out", default="models/benchmark_local.json")
    args = ap.parse_args()

    if args.image:
        img = Image.open(args.image).convert("RGB")
    else:
        rng = np.random.default_rng(0)
        img = Image.fromarray(rng.integers(0, 255, (480, 640, 3), dtype=np.uint8))

    det = Detector(args.model, load_classes(args.classes))
    for _ in range(5):  # échauffement supplémentaire
        det.predict(img)
    total, infer = [], []
    for _ in range(args.runs):
        _, t = det.predict(img)
        total.append(t["total_ms"])
        infer.append(t["inference_ms"])

    result = {
        "machine": platform.processor() or platform.machine(),
        "cpu_count": os.cpu_count(),
        "onnxruntime": ort.__version__,
        "providers": det.providers,
        "n": args.runs,
        "p50_ms": round(float(np.percentile(total, 50)), 1),
        "p95_ms": round(float(np.percentile(total, 95)), 1),
        "inference_p50_ms": round(float(np.percentile(infer, 50)), 1),
        "inference_p95_ms": round(float(np.percentile(infer, 95)), 1),
    }
    Path(args.out).write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
