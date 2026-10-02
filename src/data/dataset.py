import hashlib
import random
import shutil
from pathlib import Path

import yaml


def file_hash(path):
    return hashlib.md5(Path(path).read_bytes()).hexdigest()


def prepare(params_path="params.yaml"):
    # Split train/val/test AVANT toute augmentation, avec suppression des doublons.
    p = yaml.safe_load(open(params_path))
    raw = Path(p["data"]["raw_dir"])
    out = Path(p["data"]["processed_dir"])
    images = sorted((raw / "images").glob("*.*"))
    seen, unique = set(), []
    for img in images:
        h = file_hash(img)
        if h not in seen:
            seen.add(h)
            unique.append(img)
    random.Random(p["seed"]).shuffle(unique)
    n = len(unique)
    s = p["data"]["split"]
    cuts = {
        "train": unique[: int(n * s["train"])],
        "val": unique[int(n * s["train"]) : int(n * (s["train"] + s["val"]))],
        "test": unique[int(n * (s["train"] + s["val"])) :],
    }
    for name, files in cuts.items():
        (out / name / "images").mkdir(parents=True, exist_ok=True)
        (out / name / "labels").mkdir(parents=True, exist_ok=True)
        for img in files:
            shutil.copy(img, out / name / "images" / img.name)
            lbl = raw / "labels" / (img.stem + ".txt")
            if lbl.exists():
                shutil.copy(lbl, out / name / "labels" / lbl.name)
    cfg = {
        "path": str(out.resolve()),
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "names": {i: c for i, c in enumerate(p["data"]["classes"])},
    }
    yaml.safe_dump(cfg, open(out / "data.yaml", "w"))


if __name__ == "__main__":
    prepare()
