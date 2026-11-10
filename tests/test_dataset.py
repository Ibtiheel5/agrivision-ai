"""Test de la préparation des données sur un mini-jeu synthétique (anti-fuite)."""
import os
from pathlib import Path

import yaml
from PIL import Image

from src.data import dataset


def make_src(root: Path, names, splits):
    for split, items in splits.items():
        (root / split / "images").mkdir(parents=True)
        (root / split / "labels").mkdir(parents=True)
        for stem, color, cls in items:
            img = Image.new("RGB", (64, 64), color)
            for x in range(32):  # motif pour avoir un dHash non trivial
                img.putpixel((x, x), (255 - color[0], 0, 0))
            img.save(root / split / "images" / f"{stem}.jpg")
            (root / split / "labels" / f"{stem}.txt").write_text(f"{cls} 0.5 0.5 0.2 0.2\n")
    (root / "data.yaml").write_text(yaml.safe_dump({"names": names}))


def test_build_no_leak(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    make_src(tmp_path / "pd", ["A", "Soyabean"], {"train": [("p1", (10, 10, 10), 0)],
             "valid": [("v1", (200, 0, 0), 1)], "test": [("t1", (0, 200, 0), 0)]})
    # PlantSeg : s1 est un DOUBLON de v1 (même image) -> doit disparaître ; s2 est légitime
    make_src(tmp_path / "ps", ["Soybean", "A"], {"train": [("s1", (200, 0, 0), 0), ("s2", (0, 0, 200), 1)]})
    params = {"seed": 1, "data": {"processed_dir": "out", "dedup_hash_size": 8, "class_merge": {"Soyabean": "Soybean"},
              "datasets": {"plantdoc": "pd", "plantseg": "ps"}}}
    dataset.build(params)
    names = yaml.safe_load(Path("out/data.yaml").read_text())["names"]
    assert sorted(names.values()) == ["A", "Soybean"]  # fusion Soyabean/Soybean
    train = sorted(os.listdir("out/images/train"))
    assert "plantseg_s1.jpg" not in train and "plantseg_s2.jpg" in train
    assert os.listdir("out/images/val") == ["plantdoc_v1.jpg"]
    assert os.listdir("out/images/test") == ["plantdoc_t1.jpg"]
