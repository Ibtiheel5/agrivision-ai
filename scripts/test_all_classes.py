"""Test batch des 29 classes via l'API /predict."""

import argparse
import json
import mimetypes
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def normalize(name: str) -> str:
    return " ".join(name.replace("_", " ").replace("-", " ").lower().split())


def load_classes(path: Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def predict(api: str, image: Path, conf: float) -> dict:
    boundary = uuid.uuid4().hex
    content_type = mimetypes.guess_type(image.name)[0] or "application/octet-stream"
    head = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{image.name}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8")
    body = head + image.read_bytes() + f"\r\n--{boundary}--\r\n".encode("utf-8")
    url = f"{api.rstrip('/')}/predict?{urlencode({'conf': conf})}"
    request = Request(url, data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser(description="Teste toutes les classes AgriVision avec un dossier d'images")
    ap.add_argument("--api", default="http://localhost:8000")
    ap.add_argument("--images", default="data/test_all")
    ap.add_argument("--conf", type=float, default=0.25)
    ap.add_argument("--out", default="reports/all_classes_report.json")
    args = ap.parse_args()

    root = Path(__file__).resolve().parents[1]
    classes = load_classes(root / "models" / "classes.txt")
    by_normalized = {normalize(name): name for name in classes}
    image_root = Path(args.images).resolve()
    images = (
        sorted(path for path in image_root.rglob("*") if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES)
        if image_root.exists()
        else []
    )

    stats = {name: {"images": 0, "correct": 0, "confidence_sum": 0.0, "predicted_as": {}} for name in classes}
    results = []
    errors = []

    for image in images:
        expected = by_normalized.get(normalize(image.parent.name))
        try:
            payload = predict(args.api, image, args.conf)
        except (HTTPError, URLError, TimeoutError) as exc:
            errors.append({"image": str(image), "error": str(exc)})
            continue
        detections = payload.get("detections", [])
        top = max(detections, key=lambda item: item["confidence"], default=None)
        top_label = top["label"] if top else None
        top_confidence = float(top["confidence"]) if top else 0.0
        correct = expected is not None and normalize(top_label or "") == normalize(expected)
        results.append(
            {
                "image": str(image),
                "expected": expected,
                "top1": top_label,
                "confidence": top_confidence,
                "correct": correct,
            }
        )
        if expected:
            row = stats[expected]
            row["images"] += 1
            row["correct"] += int(correct)
            row["confidence_sum"] += top_confidence
            key = top_label or "(aucune détection)"
            row["predicted_as"][key] = row["predicted_as"].get(key, 0) + 1

    class_rows = []
    for name in classes:
        row = stats[name]
        class_rows.append(
            {
                "class": name,
                "status": "OK" if row["images"] else "NO_IMAGE",
                "images": row["images"],
                "correct": row["correct"],
                "accuracy": round(row["correct"] / row["images"], 4) if row["images"] else None,
                "mean_top1_confidence": round(row["confidence_sum"] / row["images"], 4) if row["images"] else None,
                "predicted_as": dict(sorted(row["predicted_as"].items())),
            }
        )

    tested = sum(row["images"] for row in class_rows)
    correct = sum(row["correct"] for row in class_rows)
    report = {
        "api": args.api,
        "images_dir": str(image_root),
        "conf": args.conf,
        "total_images": len(images),
        "images_with_expected_class": tested,
        "overall_accuracy": round(correct / tested, 4) if tested else None,
        "missing_classes": [row["class"] for row in class_rows if row["status"] == "NO_IMAGE"],
        "errors": errors,
        "classes": class_rows,
        "results": results,
    }

    out = Path(args.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    for row in class_rows:
        accuracy = f"{row['accuracy']:.2%}" if row["accuracy"] is not None else "-"
        print(f"{row['status']:8} {row['class']:<36} {row['correct']}/{row['images']} {accuracy}")
    print(f"Images traitées : {len(images)} ; avec classe attendue : {tested} ; erreurs : {len(errors)}")
    print(f"Rapport : {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
