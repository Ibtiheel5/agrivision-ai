"""Validate and reproducibly split an annotated YOLO image dataset."""

from __future__ import annotations

import hashlib
import json
import random
import shutil
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import yaml
from PIL import Image, UnidentifiedImageError

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


class DatasetError(ValueError):
    """Raised when the raw dataset cannot safely be prepared."""


def file_hash(path: Path) -> str:
    """Return a content hash used to remove exact duplicate images."""
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _validate_label(path: Path, num_classes: int) -> list[int]:
    """Validate YOLO detection labels and return class ids in the image."""
    class_ids: list[int] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        fields = line.split()
        if not fields:
            continue
        if len(fields) != 5:
            raise DatasetError(f"{path}:{line_number}: expected 5 YOLO fields, got {len(fields)}")
        try:
            class_id = int(fields[0])
            coords = [float(value) for value in fields[1:]]
        except ValueError as exc:
            raise DatasetError(f"{path}:{line_number}: labels must be numeric") from exc
        if class_id < 0 or class_id >= num_classes:
            raise DatasetError(
                f"{path}:{line_number}: class id {class_id} is outside 0..{num_classes - 1}"
            )
        if any(value < 0 or value > 1 for value in coords):
            raise DatasetError(f"{path}:{line_number}: normalized box values must be in [0, 1]")
        if coords[2] <= 0 or coords[3] <= 0:
            raise DatasetError(f"{path}:{line_number}: box width and height must be positive")
        class_ids.append(class_id)
    return class_ids


def _image_class(class_ids: list[int]) -> int | None:
    """Choose the most frequent class as a deterministic stratification key."""
    if not class_ids:
        return None
    counts = Counter(class_ids)
    return min(counts, key=lambda class_id: (-counts[class_id], class_id))


def _split_by_class(
    records: list[dict[str, Any]], ratios: dict[str, float], seed: int
) -> dict[str, list[dict[str, Any]]]:
    buckets: dict[int | None, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        buckets[record["stratify_class"]].append(record)

    splits = {name: [] for name in ("train", "val", "test")}
    for class_id in sorted(buckets, key=lambda item: (-1 if item is None else item)):
        bucket = buckets[class_id]
        random.Random(f"{seed}:{class_id}").shuffle(bucket)
        n = len(bucket)
        exact = {name: n * ratios[name] for name in ("train", "val", "test")}
        counts = {name: int(exact[name]) for name in exact}
        remainder = n - sum(counts.values())
        for name in sorted(exact, key=lambda key: (-(exact[key] - counts[key]), key))[:remainder]:
            counts[name] += 1
        n_train, n_val, n_test = counts["train"], counts["val"], counts["test"]
        if n:
            n_train = max(1, n_train)
        # Keep every split represented for classes with enough images.
        if n >= 3 and ratios["val"] > 0 and n_val == 0:
            n_val, n_train = 1, n_train - 1
        if n >= 3 and ratios["test"] > 0 and n_test == 0:
            n_test, n_train = 1, n_train - 1
        if n == 2 and ratios["val"] > 0 and n_val == 0:
            n_val, n_train = 1, n_train - 1
        splits["train"].extend(bucket[:n_train])
        splits["val"].extend(bucket[n_train : n_train + n_val])
        splits["test"].extend(bucket[n_train + n_val : n_train + n_val + n_test])
    return splits


def _cap_extra_train(
    records: list[dict[str, Any]], cap: int | None, seed: int
) -> tuple[list, dict]:
    if cap is None or cap <= 0:
        return records, {}
    by_class: dict[int | None, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        by_class[record["stratify_class"]].append(record)
    kept: list[dict[str, Any]] = []
    removed: dict[str, int] = {}
    for class_id, bucket in by_class.items():
        random.Random(f"plantseg:{seed}:{class_id}").shuffle(bucket)
        kept.extend(bucket[:cap])
        if len(bucket) > cap:
            removed[str(class_id)] = len(bucket) - cap
    return kept, removed


def _load_config(params_path: str | Path) -> tuple[dict, Path, Path, dict[str, float]]:
    with Path(params_path).open(encoding="utf-8") as stream:
        params = yaml.safe_load(stream)
    try:
        raw = Path(params["data"]["raw_dir"])
        out = Path(params["data"]["processed_dir"])
        classes = params["data"]["classes"]
        configured = params["data"]["split"]["ratios"]
        ratios = {name: float(configured[name]) for name in ("train", "val", "test")}
        seed = int(params["seed"])
    except (KeyError, TypeError, ValueError) as exc:
        raise DatasetError(
            "params.yaml is missing dataset paths, classes, split ratios, or seed"
        ) from exc
    if not classes or len(set(classes)) != len(classes):
        raise DatasetError("data.classes must be a non-empty list of unique class names")
    if any(value < 0 for value in ratios.values()) or abs(sum(ratios.values()) - 1.0) > 1e-8:
        raise DatasetError("split ratios train/val/test must be non-negative and sum to 1")
    if ratios["train"] <= 0:
        raise DatasetError("the training split ratio must be greater than zero")
    return params, raw, out, {**ratios, "seed": seed}


def prepare(params_path: str | Path = "params.yaml") -> dict:
    """Validate raw YOLO files, deduplicate, stratify, and emit a dataset manifest."""
    params, raw, out, split_config = _load_config(params_path)
    seen: dict[str, dict[str, Any]] = {}
    duplicates: list[dict[str, str]] = []
    primary_records: list[dict[str, Any]] = []
    extra_train_records: list[dict[str, Any]] = []
    class_names = params["data"]["classes"]
    primary_root = raw / "plantdoc"
    extra_root = raw / "plantseg"
    if primary_root.is_dir():
        sources = [("plantdoc", primary_root, primary_records)]
        if (extra_root / "images").is_dir():
            sources.append(("plantseg_train_only", extra_root, extra_train_records))
    elif (raw / "images").is_dir():
        if params["data"].get("extra_train"):
            raise DatasetError(
                "PlantSeg is configured as train-only. Use data/raw/plantdoc/{images,labels} "
                "and data/raw/plantseg/{images,labels}; a mixed flat folder cannot be split safely."
            )
        sources = [("primary", raw, primary_records)]
    else:
        raise DatasetError(
            "Expected data/raw/plantdoc/{images,labels} (and optional train-only "
            "data/raw/plantseg/{images,labels})"
        )

    raw_image_count = 0
    for source_name, source_root, destination in sources:
        image_dir, label_dir = source_root / "images", source_root / "labels"
        if not image_dir.is_dir() or not label_dir.is_dir():
            raise DatasetError(f"Expected YOLO folders {image_dir} and {label_dir}")
        source_images = sorted(
            path for path in image_dir.iterdir() if path.suffix.lower() in IMAGE_SUFFIXES
        )
        raw_image_count += len(source_images)
        for image_path in source_images:
            label_path = label_dir / f"{image_path.stem}.txt"
            if not label_path.is_file():
                raise DatasetError(f"Missing YOLO annotation for {image_path.name}: {label_path}")
            try:
                with Image.open(image_path) as image:
                    image.verify()
            except (OSError, UnidentifiedImageError) as exc:
                raise DatasetError(f"Corrupt or unsupported image: {image_path}") from exc
            class_ids = _validate_label(label_path, len(class_names))
            image_digest = file_hash(image_path)
            normalized_labels = "\n".join(
                line.strip()
                for line in label_path.read_text(encoding="utf-8").splitlines()
                if line.strip()
            )
            if image_digest in seen:
                prior = seen[image_digest]
                if (
                    prior["normalized_labels"] != normalized_labels
                    and source_name != "plantseg_train_only"
                ):
                    raise DatasetError(
                        f"Exact duplicate image has conflicting annotations: "
                        f"{prior['image'].name} and {image_path.name}"
                    )
                duplicates.append(
                    {
                        "kept": prior["image"].name,
                        "duplicate": image_path.name,
                        "source": source_name,
                    }
                )
                continue
            record = {
                "image": image_path,
                "label": label_path,
                "sha256": image_digest,
                "class_ids": class_ids,
                "stratify_class": _image_class(class_ids),
                "normalized_labels": normalized_labels,
                "source": source_name,
                "output_name": (
                    f"{source_name}__{image_path.stem}__{image_digest[:10]}"
                    f"{image_path.suffix.lower()}"
                ),
            }
            seen[image_digest] = record
            destination.append(record)

    split_ratios = {key: split_config[key] for key in ("train", "val", "test")}
    if not primary_records:
        raise DatasetError("The primary PlantDoc dataset contains no valid images")
    extra_config = params["data"].get("extra_train") or {}
    extra_train_records, capped_extra = _cap_extra_train(
        extra_train_records,
        extra_config.get("max_images_per_class"),
        split_config["seed"],
    )
    splits = _split_by_class(primary_records, split_ratios, split_config["seed"])
    splits["train"].extend(extra_train_records)

    # Clear only generated split contents so stale files cannot leak across reruns.
    for split_name in splits:
        split_root = out / split_name
        for child in (split_root / "images", split_root / "labels"):
            if child.exists():
                shutil.rmtree(child)
            child.mkdir(parents=True, exist_ok=True)
        for record in splits[split_name]:
            target_image = split_root / "images" / record["output_name"]
            target_label = split_root / "labels" / f"{Path(record['output_name']).stem}.txt"
            shutil.copy2(record["image"], target_image)
            shutil.copy2(record["label"], target_label)

    data_yaml = {
        "path": str(out.resolve()),
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "names": {index: name for index, name in enumerate(class_names)},
    }
    with (out / "data.yaml").open("w", encoding="utf-8") as stream:
        yaml.safe_dump(data_yaml, stream, sort_keys=False, allow_unicode=True)

    manifest = {
        "seed": split_config["seed"],
        "ratios": split_ratios,
        "raw_images": raw_image_count,
        "unique_images": sum(map(len, splits.values())),
        "train_only_extra_images": len(extra_train_records),
        "train_only_extra_images_removed_by_class_cap": capped_extra,
        "exact_duplicates_removed": duplicates,
        "splits": {},
    }
    for split_name, split_records in splits.items():
        counts = Counter(class_id for record in split_records for class_id in record["class_ids"])
        manifest["splits"][split_name] = {
            "images": [record["output_name"] for record in split_records],
            "image_count": len(split_records),
            "annotation_counts_by_class": {
                class_names[class_id]: counts.get(class_id, 0)
                for class_id in range(len(class_names))
            },
        }
    with (out / "split_manifest.json").open("w", encoding="utf-8") as stream:
        json.dump(manifest, stream, ensure_ascii=False, indent=2)
    return manifest


if __name__ == "__main__":
    prepare()
