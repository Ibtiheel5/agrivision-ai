# AgriVision AI Lite — frontend (React + Vite + Tailwind)

## Lancer en local
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173  (le backend doit tourner sur http://localhost:8000)
```
Autre URL d'API : copier `.env.example` en `.env` et modifier `VITE_API_URL`.

## Application mobile (Android et iOS, sans store)

L'interface React est intégrée dans une application native avec Capacitor. Le serveur
FastAPI doit rester démarré et accessible depuis le téléphone. `localhost` sur
le téléphone désigne le téléphone lui-même : configurez `VITE_API_URL` dans `.env`
avec l'adresse HTTPS du backend avant de compiler.

L'application utilise les vrais écrans React et les routes de l'API : accueil, analyse
de photo, conseils, carte des risques, historique local et météo. L'analyse de photo
utilise les classes foliaires du modèle ; l'alerte sécheresse est estimée à partir des
données météo, et non détectée à partir de la photo.

### Android

1. Installer Android Studio Otter (2025.2.1) ou plus récent, le SDK Android 36 et
   un JDK 21.
2. Depuis `frontend`, configurer `VITE_API_URL` dans `.env` avec l'adresse HTTPS
   du backend, puis exécuter `npm install` et `npm run mobile:sync`.
3. Ouvrir le projet avec `npm run mobile:android`, puis créer un APK dans Android
   Studio (`Build > Build APK(s)`). Transférer l'APK sur le téléphone et l'installer.

### iPhone

Le projet iOS est inclus. La compilation nécessite un Mac avec Xcode 26 ou plus
récent et CocoaPods. Depuis `frontend`, exécuter `npm install` puis
`npm run mobile:sync`, ouvrir avec `npm run mobile:ios` et signer l'application
avec un profil de développement Apple pour l'installer directement sur un iPhone,
sans App Store.

Les scripts `mobile:sync`, `mobile:android` et `mobile:ios` facilitent la synchronisation
et l'ouverture des projets natifs.

### Tester l'application

Pour vérifier rapidement l'interface sans installer d'outils mobiles :

```bash
# Terminal 1 : démarrer l'API depuis le dossier backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 : depuis le dossier frontend
npm run dev
```

Ouvrir `http://localhost:5173`. Vérifier l'état de l'API sur
`http://localhost:8000/health`, puis tester l'analyse avec une image.

Pour tester la vraie application, installer Android Studio, un JDK 21 et le SDK
Android 36, puis démarrer un émulateur. Dans `frontend/.env`, définir
`VITE_API_URL` sur une adresse HTTPS de l'API accessible par l'émulateur
(`localhost` dans l'application désigne le téléphone). Après `npm run mobile:sync`,
ouvrir le projet Android avec `npm run mobile:android` et lancer l'application
sur l'émulateur depuis Android Studio. La caméra peut être testée avec la caméra
virtuelle de l'émulateur ou un téléphone Android connecté.

L'API autorise par défaut les origines Capacitor Android (`https://localhost`)
et iOS (`capacitor://localhost`). Si `CORS_ORIGINS` est défini dans l'environnement
du backend, ajouter également ces deux origines à sa liste.

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
