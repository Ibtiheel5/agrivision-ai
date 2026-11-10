import json
from pathlib import Path

import pytest
import yaml
from PIL import Image

from src.data.dataset import DatasetError, prepare


def _write_image(folder: Path, name: str, color: tuple[int, int, int]) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name
    Image.new("RGB", (24, 24), color).save(path)
    return path


def _write_label(folder: Path, stem: str, row: str = "0 0.5 0.5 0.4 0.4") -> None:
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{stem}.txt").write_text(row + "\n", encoding="utf-8")


def _write_config(root: Path, classes=None, extra_train=True) -> Path:
    params = {
        "seed": 42,
        "data": {
            "raw_dir": str(root / "raw"),
            "processed_dir": str(root / "processed"),
            "classes": classes or ["disease"],
            "split": {"ratios": {"train": 0.7, "val": 0.15, "test": 0.15}},
        },
    }
    if extra_train:
        params["data"]["extra_train"] = {"source": "plantseg", "max_images_per_class": 2}
    path = root / "params.yaml"
    path.write_text(yaml.safe_dump(params), encoding="utf-8")
    return path


def test_prepare_keeps_plantseg_in_train_and_is_reproducible(tmp_path):
    plantdoc_images = tmp_path / "raw" / "plantdoc" / "images"
    plantdoc_labels = tmp_path / "raw" / "plantdoc" / "labels"
    for index in range(6):
        _write_image(plantdoc_images, f"leaf_{index}.jpg", (index * 30, 10, 5))
        _write_label(plantdoc_labels, f"leaf_{index}")

    plantseg_images = tmp_path / "raw" / "plantseg" / "images"
    plantseg_labels = tmp_path / "raw" / "plantseg" / "labels"
    for index in range(3):
        _write_image(plantseg_images, f"extra_{index}.jpg", (index * 30, 100, 5))
        _write_label(plantseg_labels, f"extra_{index}")

    params_path = _write_config(tmp_path)
    first = prepare(params_path)
    second = prepare(params_path)

    assert first == second
    assert first["raw_images"] == 9
    assert first["train_only_extra_images"] == 2
    assert first["train_only_extra_images_removed_by_class_cap"] == {"0": 1}
    assert len(first["splits"]["val"]["images"]) == 1
    assert len(first["splits"]["test"]["images"]) == 1
    plantseg_train = [name for name in first["splits"]["train"]["images"] if name.startswith("plantseg_train_only__")]
    assert len(plantseg_train) == 2
    assert not any(
        name.startswith("plantseg_train_only__")
        for split in ("val", "test")
        for name in first["splits"][split]["images"]
    )

    manifest_path = tmp_path / "processed" / "split_manifest.json"
    assert json.loads(manifest_path.read_text(encoding="utf-8")) == first
    yaml_data = yaml.safe_load((tmp_path / "processed" / "data.yaml").read_text(encoding="utf-8"))
    assert yaml_data["names"] == {0: "disease"}


def test_prepare_removes_exact_duplicates_before_splitting(tmp_path):
    images = tmp_path / "raw" / "images"
    labels = tmp_path / "raw" / "labels"
    image = _write_image(images, "leaf.jpg", (10, 20, 30))
    _write_label(labels, "leaf")
    duplicate = images / "leaf_copy.jpg"
    duplicate.write_bytes(image.read_bytes())
    _write_label(labels, "leaf_copy")
    for index in range(2):
        _write_image(images, f"other_{index}.jpg", (100 + index, 20, 30))
        _write_label(labels, f"other_{index}")

    manifest = prepare(_write_config(tmp_path, extra_train=False))

    assert manifest["raw_images"] == 4
    assert manifest["unique_images"] == 3
    assert len(manifest["exact_duplicates_removed"]) == 1


def test_prepare_rejects_mixed_flat_folder_when_extra_train_is_configured(tmp_path):
    images = tmp_path / "raw" / "images"
    labels = tmp_path / "raw" / "labels"
    _write_image(images, "leaf.jpg", (1, 2, 3))
    _write_label(labels, "leaf")

    with pytest.raises(DatasetError, match="mixed flat folder cannot be split safely"):
        prepare(_write_config(tmp_path, extra_train=True))


def test_prepare_rejects_invalid_yolo_box(tmp_path):
    images = tmp_path / "raw" / "images"
    labels = tmp_path / "raw" / "labels"
    _write_image(images, "leaf.jpg", (1, 2, 3))
    _write_label(labels, "leaf", "0 0.5 0.5 1.4 0.4")

    with pytest.raises(DatasetError, match=r"must be in \[0, 1\]"):
        prepare(_write_config(tmp_path, extra_train=False))
