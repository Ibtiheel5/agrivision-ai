"""Évaluation sur val et test (le test ne doit être lancé qu'à la fin) -> reports/metrics.json."""
import argparse
import json
from pathlib import Path

import yaml
from ultralytics import YOLO


def main(params_path: str) -> None:
    P = yaml.safe_load(Path(params_path).read_text())
    e, data_yaml = P["evaluate"], str(Path(P["data"]["processed_dir"]) / "data.yaml")
    model = YOLO("models/best.pt")
    report = {}
    for split in ("val", "test"):
        r = model.val(data=data_yaml, split=split, conf=0.001, iou=e["iou"], imgsz=P["train"]["imgsz"])
        report[split] = {
            "precision": float(r.box.mp), "recall": float(r.box.mr),
            "mAP50": float(r.box.map50), "mAP50-95": float(r.box.map),
            "AP50_per_class": {r.names[i]: float(v) for i, v in zip(r.box.ap_class_index, r.box.ap50)},
        }  # fmt: skip
    Path("reports").mkdir(exist_ok=True)
    Path("reports/metrics.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(json.dumps({k: {m: v for m, v in d.items() if m != "AP50_per_class"} for k, d in report.items()}, indent=2))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--params", default="params.yaml")
    main(ap.parse_args().params)
