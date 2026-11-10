"""Préparation des données : fusion PlantDoc + PlantSeg (format YOLO), dédoublonnage, splits.

Règles anti-fuite :
  * PlantDoc garde ses splits officiels (train/test) ; il fournit val + test.
  * PlantSeg est ajouté au TRAIN uniquement.
  * Toute image du train dont le hash perceptuel (dHash) est identique à une image val/test est retirée.
  * Aucune augmentation ici : elle est faite à l'entraînement, sur train seulement (Ultralytics).

Attendu en entrée (adapter `load_*` à la structure réelle des datasets Kaggle) :
  data/raw/<source>/{train,valid,test}/{images,labels}  + data.yaml (liste `names`)
"""
import argparse
import hashlib
import json
import logging
import random
import shutil
from pathlib import Path
from typing import Dict, List, Tuple

import yaml
from PIL import Image

logger = logging.getLogger("dataset")
IMG_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def dhash(path: Path, size: int = 8) -> str:
    with Image.open(path) as im:
        g = im.convert("L").resize((size + 1, size), Image.LANCZOS)
    px = list(g.getdata())
    bits = []
    for r in range(size):
        row = px[r * (size + 1) : (r + 1) * (size + 1)]
        bits += [row[c] > row[c + 1] for c in range(size)]
    return hashlib.md5("".join("1" if b else "0" for b in bits).encode()).hexdigest()


def is_valid_image(path: Path) -> bool:
    try:
        with Image.open(path) as im:
            im.verify()
        return True
    except Exception:  # noqa: BLE001
        return False


def read_names(src: Path) -> List[str]:
    cfg = yaml.safe_load((src / "data.yaml").read_text(encoding="utf-8"))
    names = cfg["names"]
    return [names[k] for k in sorted(names)] if isinstance(names, dict) else list(names)


def collect(src: Path, split: str) -> List[Tuple[Path, Path]]:
    imgs = [p for p in (src / split / "images").glob("*") if p.suffix.lower() in IMG_EXT]
    pairs = []
    for p in sorted(imgs):
        lab = src / split / "labels" / f"{p.stem}.txt"
        if lab.exists() and is_valid_image(p):
            pairs.append((p, lab))
        else:
            logger.warning("Ignoré (image corrompue ou sans label) : %s", p)
    return pairs


def remap_label(lab: Path, id_map: Dict[int, int]) -> str:
    out = []
    for ln in lab.read_text().splitlines():
        parts = ln.split()
        if len(parts) >= 5 and int(parts[0]) in id_map:
            out.append(" ".join([str(id_map[int(parts[0])])] + parts[1:5]))  # boîtes seulement
    return "\n".join(out)


def build(params: dict) -> None:
    d = params["data"]
    random.seed(params["seed"])
    out = Path(d["processed_dir"])
    if out.exists():
        shutil.rmtree(out)
    merge = d.get("class_merge", {})
    sources = {k: Path(v) for k, v in d["datasets"].items()}

    # 1) vocabulaire de classes global (après fusion d'orthographes)
    vocab: List[str] = []
    local_maps: Dict[str, Dict[int, int]] = {}
    for name, src in sources.items():
        m = {}
        for i, cls in enumerate(read_names(src)):
            cls = merge.get(cls, cls)
            if cls not in vocab:
                vocab.append(cls)
            m[i] = vocab.index(cls)
        local_maps[name] = m

    # 2) PlantDoc -> val/test ; PlantSeg -> train ; PlantDoc train -> train
    plan = {"train": [], "val": [], "test": []}
    for name, src in sources.items():
        for split in ("train", "valid", "val", "test"):
            if not (src / split).exists():
                continue
            target = {"valid": "val"}.get(split, split)
            if name == "plantseg":
                target = "train"  # PlantSeg uniquement dans le train
            plan[target] += [(p, l, name) for p, l in collect(src, split)]

    # 3) anti-fuite : retirer du train tout doublon (hash) d'une image val/test
    held = {dhash(p, d["dedup_hash_size"]) for s in ("val", "test") for p, _, _ in plan[s]}
    kept, removed, seen = [], 0, set()
    for p, l, n in plan["train"]:
        h = dhash(p, d["dedup_hash_size"])
        if h in held or h in seen:
            removed += 1
            continue
        seen.add(h)
        kept.append((p, l, n))
    plan["train"] = kept
    logger.info("Doublons/quasi-doublons retirés du train : %d", removed)

    # 4) écriture
    stats = {"classes": len(vocab), "removed_duplicates": removed}
    for split, items in plan.items():
        (out / "images" / split).mkdir(parents=True)
        (out / "labels" / split).mkdir(parents=True)
        for p, l, n in items:
            stem = f"{n}_{p.stem}"
            shutil.copy2(p, out / "images" / split / f"{stem}{p.suffix.lower()}")
            (out / "labels" / split / f"{stem}.txt").write_text(remap_label(l, local_maps[n]))
        stats[split] = len(items)
    (out / "data.yaml").write_text(
        yaml.safe_dump(
            {"path": str(out.resolve()), "train": "images/train", "val": "images/val",
             "test": "images/test", "names": {i: c for i, c in enumerate(vocab)}},
            allow_unicode=True,
        )  # fmt: skip
    )
    Path("models").mkdir(exist_ok=True)
    Path("models/classes.txt").write_text("\n".join(vocab) + "\n", encoding="utf-8")
    Path("reports").mkdir(exist_ok=True)
    Path("reports/data_stats.json").write_text(json.dumps(stats, indent=2))
    logger.info("Données prêtes : %s", stats)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    ap = argparse.ArgumentParser()
    ap.add_argument("--params", default="params.yaml")
    build(yaml.safe_load(Path(ap.parse_args().params).read_text()))
