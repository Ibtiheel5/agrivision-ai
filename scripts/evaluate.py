"""Évalue le classifieur de feuilles sur data/eval (un dossier par classe)."""

import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import yaml
from PIL import Image

p = yaml.safe_load(open("params.yaml", encoding="utf-8"))["eval"]
info = json.load(open("models/classes.json", encoding="utf-8"))
classes = [c["label"] for c in sorted(info, key=lambda c: c["id"])]
sess = ort.InferenceSession("models/classifier.onnx", providers=["CPUExecutionProvider"])


def prep(path):
    """Comme eval_tf du notebook v5 : RGB, resize direct bilinéaire, 0..1 (normalisation incluse dans l'ONNX)."""
    img = Image.open(path).convert("RGB").resize((p["imgsz"], p["imgsz"]), Image.BILINEAR)
    x = np.asarray(img, dtype=np.float32) / 255.0
    return x.transpose(2, 0, 1)[None]


ok = total = 0
for folder in sorted(Path("data/eval").iterdir()):
    if not folder.is_dir():
        continue
    label = classes.index(folder.name)  # erreur si le nom de dossier est inconnu
    for f in sorted(folder.iterdir()):
        if f.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue
        out = sess.run(None, {sess.get_inputs()[0].name: prep(f)})[0]
        ok += int(out.argmax()) == label
        total += 1
if total == 0:
    raise SystemExit("Aucune image dans data/eval")
Path("metrics").mkdir(exist_ok=True)
result = {"accuracy": ok / total, "images": total}
with open("metrics/classifier.json", "w", encoding="utf-8") as out_file:
    json.dump(result, out_file)
print(result)
