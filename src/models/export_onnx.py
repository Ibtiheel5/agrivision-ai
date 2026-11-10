"""Export ONNX, parité PyTorch/ONNX, benchmark de latence, porte d'évaluation, Registry MLflow.

Sorties : models/best.onnx, reports/onnx_benchmark.json
"""
import argparse
import json
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
import yaml
from ultralytics import YOLO


def bench(fn, n=50, warm=5):
    for _ in range(warm):
        fn()
    ts = []
    for _ in range(n):
        t0 = time.perf_counter()
        fn()
        ts.append((time.perf_counter() - t0) * 1000)
    return {"p50_ms": float(np.percentile(ts, 50)), "p95_ms": float(np.percentile(ts, 95)),
            "fps": float(1000 / np.mean(ts))}  # fmt: skip


def main(params_path: str) -> None:
    P = yaml.safe_load(Path(params_path).read_text())
    imgsz = P["train"]["imgsz"]
    pt = YOLO("models/best.pt")
    ex = P["export"]
    onnx_path = Path(pt.export(format="onnx", imgsz=imgsz, opset=ex["opset"], simplify=ex["simplify"]))
    target = Path(P["export"]["onnx_path"])
    target.write_bytes(onnx_path.read_bytes())

    x = np.random.RandomState(P["seed"]).rand(1, 3, imgsz, imgsz).astype(np.float32)
    sess = ort.InferenceSession(str(target), providers=["CPUExecutionProvider"])
    name = sess.get_inputs()[0].name
    import torch

    with torch.no_grad():
        ref = pt.model.eval()(torch.from_numpy(x))
    ref = (ref[0] if isinstance(ref, (list, tuple)) else ref).numpy()
    got = sess.run(None, {name: x})[0]
    parity = float(np.abs(ref - got).max())

    report = {
        "parity_max_abs_diff": parity,
        "onnx_size_mb": target.stat().st_size / 1e6,
        "pytorch_size_mb": Path("models/best.pt").stat().st_size / 1e6,
        "onnx_cpu": bench(lambda: sess.run(None, {name: x})),
    }
    Path("reports").mkdir(exist_ok=True)
    Path("reports/onnx_benchmark.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))

    # porte d'évaluation avant passage en Production (Registry MLflow)
    gate, metrics_file = P["evaluate"]["gate"], Path("reports/metrics.json")
    if metrics_file.exists():
        m = json.loads(metrics_file.read_text())["val"]["mAP50"]
        ok = m >= gate["min_map50"] and report["onnx_cpu"]["p95_ms"] <= gate["max_latency_p95_ms"]
        p95 = report["onnx_cpu"]["p95_ms"]
        print(f"Porte d'évaluation : mAP50={m:.3f}, p95={p95:.1f} ms -> {'OK' if ok else 'REFUSÉ'}")
        # Voir scripts/register_model.py pour l'enregistrement dans le Registry (stage Staging -> Production)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--params", default="params.yaml")
    main(ap.parse_args().params)
