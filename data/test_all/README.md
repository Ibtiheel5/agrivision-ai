# Images de test par classe

Mets au moins une photo par classe dans le dossier portant son nom exact, puis lance :

```bash
python scripts/test_all_classes.py --api http://localhost:8000 --images data/test_all
```

Le script génère `reports/all_classes_report.json` avec le top-1, la confiance, la précision par classe et la liste des classes sans image.

```text
Apple Scab Leaf
Apple leaf
Apple rust leaf
Bell_pepper leaf spot
Bell_pepper leaf
Blueberry leaf
Cherry leaf
Corn Gray leaf spot
Corn leaf blight
Corn rust leaf
Peach leaf
Potato leaf early blight
Potato leaf late blight
Potato leaf
Raspberry leaf
Soybean leaf
Squash Powdery mildew leaf
Strawberry leaf
Tomato Early blight leaf
Tomato Septoria leaf spot
Tomato leaf bacterial spot
Tomato leaf late blight
Tomato leaf mosaic virus
Tomato leaf yellow virus
Tomato leaf
Tomato mold leaf
Tomato two spotted spider mites leaf
grape leaf black rot
grape leaf
```
