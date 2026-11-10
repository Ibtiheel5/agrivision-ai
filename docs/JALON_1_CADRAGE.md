# AgriVision Tunisia — Jalon 1

## Référence académique

Ce cadrage suit le document `Guide_Projet_Deep_Learning_Avance_MLops.pdf` fourni par l'étudiant. Le guide autorise explicitement l'axe 3, « Détection d'Objets & Segmentation en Temps Réel (YOLO, Faster R-CNN, Mask R-CNN) ». Le projet conserve donc YOLO comme cœur scientifique et technique. Le sujet reste à faire valider par l'enseignant conformément au calendrier du guide.

## Sujet retenu

**Détection des maladies foliaires par YOLO, avec inférence ONNX et interface temps réel adaptée aux agriculteurs tunisiens.**

- Axe principal : Axe 3 — détection d'objets en temps réel.
- Cas d'usage : localiser une ou plusieurs zones foliaires et proposer les classes maladies/saines apprises par le modèle.
- Modèle actuel : YOLO11s, artefact ONNX, classes et seuils définis dans `models/` et `params.yaml`.
- Comparaison académique proposée : YOLOv8n comme baseline légère et YOLO11s comme modèle avancé, évalués sur les mêmes splits et avec les mêmes conditions. Les résultats existants ne remplacent pas cette comparaison contrôlée.
- Explicabilité : priorité aux boîtes et scores superposés exigés pour l'axe 3. Grad-CAM n'est pas un critère spécifique de l'axe 3 du guide; une méthode compatible avec le détecteur pourra être ajoutée si elle est techniquement justifiée.
- Langue de l'application : tunisien parlé en caractères latins, conformément au besoin produit AgriVision Tunisia.

## Architecture cible

```text
Navigateur / application mobile Capacitor
        │ HTTP multipart / JSON
Frontend React (Vite)
        │
FastAPI + Pydantic ── ONNX Runtime (CPU, GPU si disponible)
        │                         │
        │                    modèle YOLO versionné par DVC
        ├── MLflow Tracking / Model Registry
        └── Prometheus (métriques opérationnelles)

Pipeline d'expérimentation :
Données versionnées DVC → préparation → entraînement YOLO → évaluation → export ONNX
Infrastructure locale : Docker Compose
Qualité : GitHub Actions (lint, tests, builds)
```

Le frontend React et le wrapper FastAPI/ONNX existants sont conservés. PostgreSQL n'est pas nécessaire au périmètre central de détection; l'historique actuel est local côté client et la carte utilise SQLite. Une migration de base de données ne sera ajoutée que si le besoin de persistance serveur est confirmé.

## État initial constaté

- Le dépôt contient React/Vite, une intégration Capacitor, FastAPI, un wrapper ONNX, météo/carte/conseils, Docker Compose, MLflow, DVC, Prometheus et des workflows GitHub Actions.
- Le modèle du dépôt est un détecteur YOLO; la configuration et les métriques décrivent 29 classes PlantDoc avec des données PlantSeg ajoutées à l'entraînement.
- Les dossiers `data/raw` et `data/processed` ne contiennent actuellement que des fichiers `.gitkeep` dans l'arborescence inspectée. Le jeu de données requis pour reproduire l'entraînement n'est donc pas disponible dans le dépôt.
- Au début de l'inspection, `dvc.yaml` ne contenait qu'une porte d'évaluation. Le pipeline a depuis été étendu à la préparation, deux entraînements, sélection/export ONNX, benchmark et gate; il n'a pas encore été exécuté car les données sont absentes. `dvc.lock` doit être régénéré au premier run complet.
- Le frontend comprend déjà upload, galerie, webcam, affichage des boîtes, météo, carte et historique, mais ses textes sont majoritairement en français.
- Les métriques locales décrivent un modèle existant. Elles ne prouvent ni la reproductibilité de l'entraînement dans ce dépôt ni une comparaison YOLOv8n/YOLO11s exécutée avec les mêmes données.

## Données et rigueur scientifique

PlantDoc et PlantSeg sont les sources indiquées par la configuration actuelle. Avant de relancer ou publier un entraînement, le dépôt doit documenter la version exacte, la provenance, les annotations, la licence et le nombre d'images réellement téléchargées. `params.yaml` mentionne une restriction CC BY-NC-ND 4.0 pour PlantSeg; l'autorisation de réutilisation et de redistribution des données transformées doit être confirmée à partir de la source officielle. Les résultats doivent distinguer validation et test, dédupliquer avant le split et conserver le test hors sélection du modèle.

La préparation accepte cette disposition, qui garde PlantSeg dans le train :

```text
data/raw/
├── plantdoc/
│   ├── images/  # images annotées
│   └── labels/  # fichiers YOLO .txt de même nom de base
└── plantseg/    # facultatif; traité train-only
    ├── images/
    └── labels/
```

Les annotations PlantSeg doivent déjà être converties en boîtes YOLO et les identifiants de classes doivent suivre l'ordre de `params.yaml`. La préparation rejette un répertoire plat mélangé lorsque PlantSeg est configuré : elle ne peut pas deviner la provenance d'une image et risquer une fuite vers validation/test.

Les classes actuelles ne couvrent pas explicitement les cultures tunisiennes prioritaires telles que l'olivier, le palmier dattier et les céréales. Le produit doit annoncer uniquement les classes apprises et validées; les recommandations agronomiques locales nécessitent des sources et une revue compétente.

## Matrice de traçabilité

| Exigence du guide | Référence | Emplacement actuel | État | Validation attendue |
|---|---|---|---|---|
| Choisir un axe et un cas d'usage sur données publiques | §3, §4, Jalon 1 | `docs/JALON_1_CADRAGE.md` | Cadré : axe 3 / YOLO; validation enseignant à obtenir | Accord du sujet et du dataset |
| Détection YOLO, mAP et rendu des boîtes | Axe 3, §8 | `backend/app/inference.py`, `frontend/src/components/BoundingBoxCanvas.jsx` | Présent, évaluation contrôlée à compléter | Démo image et webcam; mesures mAP@[.5:.95] |
| Dataset documenté, nettoyé et versionné | §5, §6, Jalon 1 | `data/`, `src/data/dataset.py`, DVC | Partiel; données absentes localement et pipeline à fiabiliser | Manifeste, licences, doublons, splits reproductibles |
| Baseline et modèle avancé comparés | §8 barème | `src/models/train.py`, `src/models/evaluate.py`, `params.yaml` | Scripts et protocole configurés; aucune comparaison récente exécutée | Runs YOLOv8n/YOLO11s sur les mêmes splits et choix par mAP50-95 validation |
| DVC data/model versioning et pipeline reproductible | §1, §5, §6 | `.dvc/`, `dvc.yaml`, `dvc.lock`, `models/` | Pipeline préparé; exécution bloquée par l'absence des datasets | `dvc repro` complet et récupération d'une version |
| MLflow tracking et registry | §1, §5, barème | `docker-compose.yml`, `src/models/`, `scripts/register_model.py`, `mlflow/` | Tracking et enregistrement codés; runs/registres à produire | Comparaison visible, modèle ONNX enregistré après la gate |
| FastAPI typée, Swagger, erreurs et latence | §1, §5.1 | `backend/app/main.py`, `schemas.py`, `inference.py` | Présent en partie | Tests API, OpenAPI, 400/413/503, latence |
| React interactif, upload, galerie et webcam | §1, §2, §5, §8 barème | `frontend/src/` | Présent en partie | Parcours navigateur responsive connecté à l'API |
| Dockerfiles optimisés et Compose | §5.1 | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` | Présent, santé/dépendances à auditer | `docker compose up --build` reproductible |
| CI: lint, format, tests et build Docker | §5.1, barème | `.github/workflows/` | Partiel; lint frontend à vérifier | Workflows verts avec tests et builds |
| Monitoring / profilage | §1, rôles, option groupe de 4 | `backend/app/metrics.py`, `monitoring/prometheus.yml` | Présent en partie | Métriques API et benchmark de latence observables |
| README et rapport LaTeX/PDF | §8 barème, jalons | `README.md` | Partiel; rapport absent | Installation en une commande et rapport avec résultats réels |
| Soutenance technique sans slides | §9 | À préparer | À faire | Démo live, revue DVC/MLflow/CI et questions techniques |

## Jalons de réalisation

### Jalon 1 — cadrage et démarrage

- Faire approuver l'axe 3, YOLO et les données par l'enseignant.
- Compléter le manifeste et la note de licence des jeux de données réellement utilisés.
- Corriger le pipeline de préparation pour qu'il respecte les annotations YOLO et prévienne les fuites.
- Définir les splits, le protocole de comparaison et les métriques avant entraînement.
- Configurer le pipeline DVC et documenter l'accès au remote sans placer les données dans Git.

### Jalon 2 — données et expérimentation

- Préparer les données de façon déterministe et auditable.
- Entraîner YOLOv8n (baseline) et YOLO11s (avancé) avec les mêmes splits.
- Suivre hyperparamètres, métriques, temps et artefacts dans MLflow.
- Comparer précision, rappel, mAP50, mAP50-95 et résultats par classe; choisir sur validation seulement.
- Démarrer l'intégration API/frontend en parallèle, comme le recommande le guide.

### Jalon 3 — API et optimisation

- Exporter le modèle sélectionné vers ONNX.
- Vérifier la parité PyTorch/ONNX et mesurer taille/latence sur la machine cible.
- Finaliser les schémas, erreurs, tests et Swagger FastAPI.
- Construire et démarrer le conteneur backend.

### Jalon 4 — intégration et soutenance

- Finaliser l'interface React, le rendu des boîtes, upload, exemples et webcam.
- Relier l'interface au backend, afficher confiance et latence.
- Valider Docker Compose, CI, DVC, MLflow et documentation.
- Produire le rapport LaTeX à partir des résultats réellement obtenus et répéter la démo live.

## Critères d'acceptation du MVP

1. `docker compose up --build` lance frontend, API et MLflow sans configuration secrète incluse dans Git.
2. L'API fournit health, métadonnées, prédiction et visualisation documentées dans `/docs`; les entrées invalides et l'absence de modèle ont des réponses explicites.
3. Un utilisateur peut envoyer une image, visualiser boîtes/classes/scores et latence, puis essayer une capture webcam depuis le navigateur.
4. Le frontend affiche une interface lisible en tunisien latin et présente le résultat comme une aide indicative, pas comme un diagnostic certifié.
5. Le protocole DVC permet de préparer les mêmes splits à partir des mêmes entrées et d'identifier les versions de données/modèle.
6. YOLOv8n et YOLO11s sont comparés sur des splits communs, avec métriques de détection calculées et tracées dans MLflow; aucune métrique n'est annoncée avant exécution.
7. L'export ONNX passe une comparaison numérique définie et dispose d'un benchmark CPU reproductible; les gains ne sont annoncés que s'ils sont mesurés.
8. Les tests backend et le build frontend s'exécutent dans CI; le build Docker est vérifié séparément.
9. Le rapport documente limites de données, généralisation terrain tunisien, licences, erreurs et limites de confiance.
