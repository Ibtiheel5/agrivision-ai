# Scénario de soutenance (15–20 min, sans slides)
1. **Démo (5 min)** : `docker compose up --build` → http://localhost:8080 → upload, galerie, webcam, seuil de confiance, latences client/serveur, onglet *Modèle*.
2. **Revue MLOps (5 min)** : MLflow (runs E/B, courbes PR, Registry : alias staging/production), `dvc.yaml` + `dvc dag`, onglet Actions vert.
3. **Revue de code (5–10 min)** : `inference.py` (letterbox, décodage, NMS), `schemas.py`, `test_api.py`, `dataset.py` (anti-fuite).
Questions probables : pourquoi NMS par classe ? pourquoi ONNX FP32 plutôt que INT8 ? comment éviter la fuite PlantDoc/PlantSeg ? que fait la porte d'évaluation ?
