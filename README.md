# AgriVision AI Lite

Détection de maladies foliaires (plusieurs cultures) en temps réel : YOLO + ONNX Runtime, FastAPI, React, MLOps complet.

## Démarrage rapide
```bash
docker compose up --build
```
- Frontend : http://localhost:3000
- API (Swagger) : http://localhost:8000/docs
- MLflow : http://localhost:5000

## Données et modèles (DVC)
```bash
dvc pull            # récupère data/ et models/
dvc repro           # prepare -> train -> evaluate -> export
```
Placer le dataset annoté (format YOLO) dans `data/raw/images` et `data/raw/labels`, puis `dvc add data/raw`.

## Tests et qualité
```bash
pip install -r backend/requirements.txt pytest flake8 black
flake8 backend src && black --check backend src && pytest backend/tests
```

## Équipe
- Personne A : données, modèle, MLflow, ONNX
- Personne B : API, frontend, Docker, CI/CD
