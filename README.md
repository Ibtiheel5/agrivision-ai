# AgriVision IA

Détection de maladies foliaires (YOLO11s, PlantDoc + PlantSeg) avec cycle MLOps complet :
DVC · MLflow · ONNX Runtime · FastAPI · React (PWA mobile) · Docker Compose · GitHub Actions.
Module *Deep Learning Avancé* — **Axe 3 : détection d'objets en temps réel** — TEK-UP.

## Démarrage en une commande

1. Le modèle AgriVision v4 (`best.onnx`, `best.pt`, `classes.txt` et métadonnées) est dans `models/`.
2. `docker compose up --build`

| Service | URL |
|---|---|
| Application (PWA) | http://localhost:8080 |
| API + Swagger | http://localhost:8000/docs |
| MLflow | http://localhost:5000 |

Sans modèle, l'API répond **503** (comportement voulu) et l'app affiche l'erreur.

## Utilisation sur téléphone (application mobile)

L'interface est une **PWA React mobile-first** (le guide impose React ou Angular) :
1. PC et téléphone sur le même Wi-Fi ; ouvrez `http://<IP-du-PC>:8080` dans Chrome Android.
2. Menu ⋮ → **Installer l'application** : icône sur l'écran d'accueil, plein écran, historique hors-ligne.
3. Bouton **Sawwer bel telifoun** : ouvre l'appareil photo arrière (marche en HTTP).
4. La webcam / détection continue exige **HTTPS** sur téléphone : `cloudflared tunnel --url http://localhost:8080`
   (ou `ngrok http 8080`) donne une URL HTTPS publique temporaire.
5. Option : APK Android via Capacitor (`npm i @capacitor/core @capacitor/cli @capacitor/android`,
   `npx cap init`, `npm run build`, `npx cap add android`, `npx cap sync`) — non testé ici.

## Développement local

```bash
# Backend
cd backend && python -m venv .venv && .venv\Scripts\activate   # Linux/Mac : source .venv/bin/activate
pip install -r requirements-dev.txt
MODEL_DIR=../models uvicorn app.main:app --reload  # PowerShell : $env:MODEL_DIR="../models"
python -m pytest -q
# Frontend (proxy /api -> :8000)
cd frontend && npm ci && npm run dev && npm run lint && npm test
```'"
## Pipeline ML (DVC)

```bash
pip install -r requirements-ml.txt
git init && dvc init
dvc add data/raw                       # PlantDoc + PlantSeg dans data/raw/plantdoc et data/raw/plantseg
dvc remote add -d storage <gdrive://... | s3://... | /chemin/local>
mlflow server --port 5000              # ou : docker compose up mlflow
dvc repro                              # prepare -> train -> evaluate -> export
python scripts/register_model.py --stage staging     # puis --stage production si la porte d'évaluation passe
dvc push && git add . && git commit
```

Pour importer dans MLflow les artefacts et métriques du modèle déjà entraîné sur Kaggle :

```powershell
docker compose up -d mlflow
.\.venv-ml\Scripts\python.exe scripts\import_model_mlflow.py
```

Cette importation crée un run d'artefacts; elle ne reconstitue pas les métriques par époque ni les courbes si elles ne sont pas fournies.

L'entraînement peut aussi se faire sur Kaggle ; il suffit de déposer `best.pt`, puis `dvc repro export`.

## Correspondance avec le guide de l'enseignant

| Exigence du guide | Où |
|---|---|
| FastAPI `/health`, `/model/metadata`, `/predict`, `/predict/visualize`, Swagger, Pydantic, 400 / 503 | `backend/app/` |
| Tests Pytest (endpoints, NMS, prétraitement, 400/503/413) | `backend/tests/`, `tests/` |
| Frontend : drag & drop, galerie, webcam, canvas de boîtes, barres de scores, latence client + serveur | `frontend/src/` |
| ONNX Runtime + parité + benchmark | `backend/app/inference.py`, `src/models/export_onnx.py` |
| DVC (`dvc.yaml`, `params.yaml`), anti-fuite de données | `dvc.yaml`, `src/data/dataset.py` |
| MLflow tracking + Registry (porte d'évaluation) | `src/models/train.py`, `scripts/register_model.py` |
| Docker multi-stage + Compose | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` |
| CI/CD | `.github/workflows/ci-tests.yml`, `docker-build.yml` |
| Rapport LaTeX | `docs/` (à rédiger avec vos résultats réels) |

## Limites

Aide à la décision, pas un diagnostic certifié. PlantDoc/PlantSeg ≠ conditions réelles de terrain
(prévoir quelques photos de champ hors dataset). Utilisez le jeu de test une seule fois, à la fin.
