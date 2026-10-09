# AgriVision AI Lite — frontend (React + Vite + Tailwind)

## Lancer en local
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173  (le backend doit tourner sur http://localhost:8000)
```
Autre URL d'API : copier `.env.example` en `.env` et modifier `VITE_API_URL`.

## Fonctionnalités
- **Image** : glisser-déposer ou sélection de fichier, boîtes colorées par classe avec étiquette et score,
  barres de confiance animées, latence client / serveur / modèle.
- **Webcam** : détection continue (une requête à la fois), FPS affiché. Nécessite `localhost` ou HTTPS.
- **Curseur de seuil** : filtre instantané côté client (l'API est interrogée dès 5 % de confiance).
- **Modèle** : version, métriques de validation et de test, benchmark CPU, classes, lien MLflow (`MLFLOW_URL` côté backend).
- **Galerie d'exemples** : copier des images dans `public/examples/` puis les lister dans `public/examples/index.json`,
  par exemple `["tomate1.jpg", "mais2.jpg"]`.

## Structure
```
src/
├── App.jsx                       onglets, seuil partagé, état de l'API
├── components/                   ImageDetector, WebcamDetector, BoundingBoxCanvas, ResultsPanel, ThresholdSlider, ModelPage
├── services/api.js               appels à l'API (predict, health, metadata)
└── lib/                          couleurs par classe, noms français des classes
```
