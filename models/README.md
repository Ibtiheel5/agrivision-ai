---
library_name: onnx
tags: [agriculture, fruit, vegetable, quality, yolo11, timm]
---
# AgriVision-Fruit (pipeline en 2 étapes)
- Détecteur de fruits / légumes : YOLO11 (1 classe « fruit ») — test mAP50 0.970
- Classifieur « produit__état » (fresh / rotten / diseased) : `convnextv2_tiny.fcmae_ft_in22k_in1k` — test top-1 0.990, F1 macro 0.987 ; par source : {'cls': {'n': 2151, 'top1': 0.9897721989772199}}
- Bout en bout : non évalué (pas de test de détection avec classes)
- Tes photos : non fournies
- 28 classes (ordre dans `classes.txt`), usage : `agrivision_fruit_pipeline.AgriVisionFruitPipeline`
- Limites : sources surtout en studio / fond uniforme → valider sur des photos réelles ; ne remplace pas une analyse de sécurité alimentaire.
