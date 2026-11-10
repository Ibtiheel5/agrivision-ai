# Récupérer les fichiers depuis Kaggle / Hugging Face
1. Checkpoint `best.pt` du run B2 : dépôt privé `agrivision-ckpt` (Hugging Face).
2. Export ONNX (sur Kaggle ou en local, avec `ultralytics`) :
   ```python
   from ultralytics import YOLO
   YOLO("best.pt").export(format="onnx", imgsz=640, opset=17, simplify=True)
   ```
3. `classes.txt` : `print("\n".join(YOLO("best.pt").names.values()))` → une classe par ligne, dans l'ordre exact du modèle.
4. Placez `best.onnx`, `best.pt`, `classes.txt`, `model_metadata.json` et `metadata.json` dans `models/`, puis lancez `docker compose up --build`.
