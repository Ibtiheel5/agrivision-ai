# models/

Le backend utilise par défaut les fichiers du modèle AgriVision v4 placés directement dans ce dossier :

- `best.onnx` : export ONNX du modèle AgriVision v4
- `best.pt` : poids PyTorch originaux de l'entraînement
- `classes.txt` : les 29 classes, dans l'ordre exact du modèle
- `model_metadata.json` : métadonnées du run d'entraînement
- `metadata.json` : métadonnées normalisées lues par l'API

L'API charge le fichier ONNX avec ONNX Runtime. Pour changer de modèle, remplacez ces fichiers
en gardant la liste des classes alignée avec la sortie ONNX, puis redémarrez le backend.
Le chemin peut être remplacé avec la variable d'environnement `MODEL_DIR`.
