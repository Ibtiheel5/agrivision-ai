# AgriVision Tunisia

Projet du module Deep Learning Avancé & MLOps : détection de maladies foliaires avec YOLO, API FastAPI et interface React.

Le sujet est cadré sur **l'Axe 3 du guide du professeur : détection d'objets en temps réel**. YOLO est conservé comme modèle central. Le Jalon 1, les écarts constatés et la matrice de conformité sont décrits dans [docs/JALON_1_CADRAGE.md](docs/JALON_1_CADRAGE.md).

## État du dépôt

Le dépôt contient déjà un frontend React/Vite, un backend FastAPI avec inférence ONNX, une application Capacitor, Docker Compose, DVC, MLflow, Prometheus et des workflows GitHub Actions. Le modèle courant est YOLO11s avec 29 classes issues du jeu de données documenté dans `params.yaml`.

Les données brutes ne sont pas présentes dans le dépôt : `data/raw` contient un fichier `.gitkeep`. Les métriques et artefacts existants ne doivent donc pas être présentés comme un entraînement reproductible depuis ce checkout. Le pipeline DVC YOLOv8n/YOLO11s est configuré mais n'a pas encore été exécuté; le `dvc.lock` actuel correspond à l'ancien stage de gate jusqu'à la première exécution avec les données.

## Démarrage local

```bash
docker compose up --build
```

- Frontend : http://localhost:3000
- API et Swagger : http://localhost:8000/docs
- Santé API : http://localhost:8000/health
- MLflow : http://localhost:5000
- Prometheus : http://localhost:9090

L'API charge les artefacts locaux sous `models/`. Récupérez-les avec DVC si nécessaire et configurez l'accès au remote dans l'environnement local; ne placez aucun secret dans Git.

## DVC et expérimentation

La préparation attend des images et annotations YOLO organisées comme dans [le cadrage Jalon 1](docs/JALON_1_CADRAGE.md). PlantDoc est séparé en train/validation/test de façon déterministe; les images PlantSeg, si elles sont présentes, sont ajoutées au train seulement et plafonnées par classe selon `params.yaml`.

```bash
pip install -r requirements-ml.txt
docker compose up -d mlflow
dvc pull
dvc status
dvc repro
```

Placez les données validées dans `data/raw/plantdoc/{images,labels}` et, facultativement, dans `data/raw/plantseg/{images,labels}`. PlantSeg est toujours train-only. Une fois le dataset préparé, ajoutez-le au remote DVC (`dvc add data/raw`, puis `dvc push`); les images et poids ne vont jamais dans Git. Le pipeline compare YOLOv8n et YOLO11s sur validation, évalue le test après sélection, exporte ONNX, mesure la latence et applique la porte de qualité. MLflow doit être accessible sur `http://127.0.0.1:5000` pendant l'entraînement.

Après production d'un modèle `models/release`, sélectionnez-le pour Docker Compose avec un `.env` à la racine contenant `AGRIVISION_MODEL_DIR=/models/release`, puis redémarrez les services. La valeur par défaut `/models` continue d'utiliser les artefacts historiques déjà présents.

Enregistrez une release ayant passé la gate avec `python scripts/register_model.py --tracking-uri http://127.0.0.1:5000`.

## Tests et qualité

```bash
pip install -r backend/requirements-dev.txt pyyaml
flake8 backend src --max-line-length 100
black --check backend src
cd backend
PYTHONPATH=.. python -m pytest -q
cd ..

cd frontend
npm ci
npm run lint
npm test
npm run build
```

Les résultats doivent être rapportés uniquement après exécution réelle des commandes. La CI GitHub Actions exécute les vérifications configurées pour le dépôt.

## Documentation

- [Cadrage Jalon 1, architecture, matrice et roadmap](docs/JALON_1_CADRAGE.md)

Les résultats scientifiques, benchmarks ONNX, rapport final LaTeX/PDF et preuve de soutenance seront ajoutés après réalisation et validation des jalons correspondants.
