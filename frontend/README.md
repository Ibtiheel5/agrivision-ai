# Assistant AgriVision en derja (chat écrit + voix) : CPU / 8 Go

```
Micro → /voice-chat → STT (faster-whisper int8) → LLM (derja) → TTS (ar-TN) → texte + audio
Texte → /chat ──────────────────────────────────→ LLM (derja) → texte (arabizi) ou arabe + /tts si « réponses vocales »
Bouton « 9rali » → page Assistant avec le diagnostic → explication lue à voix haute
```

## Ce que fait l'app

- Nouvelle page **Assistant** (`/assistant`) dans la barre du bas : conversation libre, en écrivant en derja ou en parlant.
- Interrupteur **« Jaweb bel sawt »** : si activé, les réponses écrites sont aussi lues à voix haute.
- Dans le **détail d'un diagnostic**, le bouton « 9rali el natija w chnowa na3mel » ouvre l'assistant, qui explique
  le diagnostic tout seul, à voix haute.
- Chaque réponse en lettres arabes a un bouton ▶ pour la réécouter.

## 1. Backend

1. Copier `backend/app/providers.py` → `backend/app/` et `backend/app/routers/chat.py` → `backend/app/routers/`
   (ne pas écraser tes `__init__.py`).
2. Dans `main.py` : `from .routers import advice, risk_map, weather, chat` puis `app.include_router(chat.router)`.
3. `pip install -r backend/requirements-voice.txt`
4. **Convertir le modèle STT une seule fois** (internet requis, ~1 min, tient dans 8 Go) :
   ```bash
   pip install ctranslate2 transformers torch
   python scripts/convert_stt_model.py
   ```
5. `export ANTHROPIC_API_KEY=...` puis lancer l'API.

Endpoints : `POST /chat`, `POST /voice-chat`, `POST /tts`.

| Variable | Défaut | Rôle |
|---|---|---|
| `STT_MODEL` | `models/whisper-small-tn-ct2` | Dossier CTranslate2, ou `small` / `base` / `tiny` |
| `STT_COMPUTE` | `int8` | Quantification CPU |
| `LLM_PROVIDER` | `anthropic` | ou `openai` (Ollama / vLLM local) |
| `LLM_MODEL` | `claude-sonnet-5-5` | local : p. ex. `linagora/Labess-7b-chat` |
| `TTS_VOICE` | `ar-TN-ReemNeural` | ou `ar-TN-HediNeural` |

### Choix du STT sur 8 Go de RAM

| Option | RAM | Vitesse CPU | Qualité derja |
|---|---|---|---|
| **Whisper-small tunisien** (`Arbi-Houssem/TunLangModel_test1.17`, défaut) | ~0,5 Go | rapide | moyenne (WER auto-déclaré ~45 %, expérimental) |
| Whisper `small` / `base` standard | 0,3 à 0,5 Go | rapide | faible sur le derja |
| **FarukSTT** (large-v3, WER ~32 %) en int8 | ~2 à 3 Go | lente | la meilleure disponible |

Pour FarukSTT : convertir sur Kaggle/Colab
(`python scripts/convert_stt_model.py medyas/FarukSTT models/faruk-ct2 --low-mem`), puis `STT_MODEL=models/faruk-ct2`.

## 2. Frontend (ton app utilise react-router : `App.jsx`, `BottomNav.jsx`)

Copier dans `frontend/src/` (mêmes chemins) :

| Fichier | Statut |
|---|---|
| `lib/assistant.js` | nouveau : appels `/chat`, `/voice-chat`, `/tts` |
| `components/AssistantChat.jsx`, `assistant.css` | nouveau : le chatbot |
| `components/AssistantChat.test.jsx` | nouveau : 2 tests vitest |
| `pages/Assistant.jsx` | nouveau : la page |
| `App.jsx` | modifié : route `/assistant` |
| `components/BottomNav.jsx` | modifié : onglet Assistant |
| `components/DiseaseDetail.jsx` | modifié : bouton « 9rali » |

Autres :
- `android/app/src/main/AndroidManifest.xml` : ajoute `RECORD_AUDIO` et `MODIFY_AUDIO_SETTINGS`.
- **iOS** : dans `ios/App/App/Info.plist`, après `NSCameraUsageDescription`, ajouter :
  ```xml
  <key>NSMicrophoneUsageDescription</key>
  <string>AgriVision testa3mel el micro bech tsa2el el mousa3ed bel sawt.</string>
  ```
- `.env` : `VITE_API_URL=/api` (proxy Vite) pour le test navigateur / tunnel ; l'adresse HTTPS de l'API pour l'APK.
- `vite.config.js` : `allowedHosts: true` pour accepter les adresses de tunnel.

L'ancienne page `AdvicePage.jsx` n'est pas dans ton routeur : ne pas l'utiliser pour le chatbot.

## 3. Tests

- Backend : `pytest tests/` (13 tests, modèles simulés).
- Frontend : `npx vitest run` (2 tests du composant, avec mocks).
- `test_voice.html` : page autonome pour tester le micro contre l'API.

## Conversations, analyse dans le chat, mémoire des analyses

- **Conversations enregistrées** : `services/conversations.js` garde les 20 dernières conversations sur
  l'appareil (clé `agrivision.chats.v1`), comme l'historique des analyses. L'audio n'est jamais persisté :
  trop lourd pour localStorage, et le bouton ▶ le regénère à la demande.
- **Analyse depuis le chat** : le bouton 📷 compresse la photo, appelle `/predict`, affiche une bulle
  résultat, écrit dans l'historique des analyses de l'app (`services/history.js`, donc visible dans
  l'onglet Historique) et devient le diagnostic actif. L'assistant enchaîne tout seul avec un conseil.
- **Mémoire des analyses** : chaque appel à `/chat` et `/voice-chat` transmet les 8 dernières analyses
  (`recent_analyses`). Le prompt précise à l'assistant qu'il peut s'y référer si la question les concerne,
  et qu'il ne doit pas les ramener de lui-même.

Fichiers : `services/conversations.js` (+ ses tests), `components/AssistantChat.jsx`, `pages/Assistant.jsx`,
`lib/assistant.js`, `components/assistant.css`.

## Réduire le temps de réponse

Chaque réponse de `/voice-chat` contient maintenant `timings_ms` (stt, llm, tts, total), et uvicorn
affiche la même ligne : mesure avant d'optimiser, pour savoir quelle étape coûte.

Réglages dans `backend/.env` (du plus rentable au moins rentable) :

| Réglage | Effet | Coût |
|---|---|---|
| `GEMINI_THINKING=low` (défaut) | limite le « raisonnement » interne de Gemini (sinon `high`) | réponses un peu moins réfléchies |
| `GEMINI_THINKING=minimal` | encore plus rapide, si le modèle l'accepte | idem |
| `LLM_MAX_TOKENS=512` (défaut) | réponses courtes : moins de génération et moins de synthèse vocale | — |
| `STT_MODEL=base` | reconnaissance ~2x plus rapide que `small` | moins précis |
| `STT_MODEL=tiny` | encore plus rapide | nettement moins précis |
| `LLM_MODEL=gemini-3.5-flash-lite` | modèle plus léger | réponses plus simples |
| `TTS_RATE=+10%` | la voix parle plus vite | — |

**Précharger le modèle vocal au démarrage** (sinon la première requête paie le chargement).
Dans `app/main.py`, à l'intérieur de `lifespan` :

```python
import threading
from .providers import warmup
...
async def lifespan(_: FastAPI):
    load_model()
    threading.Thread(target=warmup, daemon=True).start()  # charge le STT en arrière-plan
    yield
```

## Améliorer la reconnaissance du derja

Whisper n'est pas entraîné sur le derja : `small` se trompe souvent. Trois niveaux, du meilleur au plus économe :

| Réglage | Précision en derja | Vitesse | Coût |
|---|---|---|---|
| `STT_PROVIDER=gemini` | la meilleure | rapide (rien en local) | consomme ta clé Gemini |
| modèle tunisien converti (`scripts/convert_stt_model.py`) | moyenne | rapide | local, gratuit |
| `STT_MODEL=small` (générique) | faible | rapide | local, gratuit |

Transcription par Gemini, dans `backend/.env` :

```
STT_PROVIDER=gemini
# facultatif : STT_GEMINI_MODEL=gemini-3.5-transcribe  (bascule automatique si le modèle refuse)
```

L'audio du micro est converti en WAV avant l'envoi (Gemini n'accepte pas le webm).

Si tu restes en local, deux réglages aident :

```
STT_BEAM_SIZE=5   # plus juste, plus lent (1 = le plus rapide)
STT_PROMPT=...    # vocabulaire soufflé au modèle (déjà rempli avec des mots agricoles)
```

## Rendre la voix plus tunisienne

Deux choses distinctes : **les mots** écrits par le modèle, et **la prononciation** de la voix.

- Les mots : le prompt contient maintenant des exemples de vrai derja, que le modèle imite.
- La prononciation : la voix Microsoft `ar-TN` est entraînée sur de l'arabe standard. Même avec un texte
  parfait, elle prononce comme en فصحى.

Pour changer la prononciation, utilise la synthèse Gemini, pilotable par une consigne de style
(même clé que le chat), dans `backend/.env` :

```
TTS_PROVIDER=gemini
GEMINI_TTS_MODEL=gemini-3.8-flash-tts
GEMINI_TTS_VOICE=Kore
# facultatif : GEMINI_TTS_STYLE=... (consigne de style, en anglais)
```

Elle renvoie du WAV au lieu du MP3 ; le front s'adapte tout seul (`audio_mime`). Reviens à
`TTS_PROVIDER=edge` si c'est moins bon ou trop lent : compare les deux sur la même phrase.

Voix disponibles : Zephyr, Puck, Charon, Kore, Fenrir, Leda, Orus, Aoede, et d'autres.

## Limites connues

- Le TTS ar-TN lit des lettres arabes, jamais de l'arabizi. Avec « réponses vocales » activé, le chatbot répond donc en arabe.
- `edge-tts` est un service Microsoft non officiel : bon pour un prototype, à remplacer pour la production.
- Le mélange derja/français dégrade la reconnaissance ; les noms de maladies seront parfois mal transcrits.
- Rien n'a été exécuté de bout en bout avec de vrais modèles (Hugging Face bloqué dans mon environnement) :
  la première exécution sur ta machine est l'étape de validation.
