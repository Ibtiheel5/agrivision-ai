# Changelog

## Unreleased — 2026-11-09

- Confirmed YOLO object detection as AgriVision's academic axis 3 scope against the instructor guide.
- Added Jalon 1 architecture, repository assessment, requirement traceability and milestone criteria in `docs/JALON_1_CADRAGE.md`.
- Reworked YOLO dataset preparation to validate image/label pairs, remove exact duplicates, split PlantDoc deterministically, and keep capped PlantSeg examples in training only.
- Added YOLOv8n baseline and YOLO11s advanced experiment configuration and MLflow-tracked training/evaluation/export scripts.
- Expanded DVC stages through preparation, training, validation-based selection, ONNX export, CPU benchmark and evaluation gate.
- Connected locally measured ONNX latency to the model metadata response and made Compose model selection configurable.
- Added dataset preparation tests and documented that model training has not run because the datasets are absent from this checkout.
- Added ESLint checks to frontend CI and switched its Docker build to `npm ci` for lockfile-based installs.
