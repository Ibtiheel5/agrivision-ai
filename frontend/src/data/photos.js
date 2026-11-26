/**
 * Photos réelles des cultures et des maladies.
 *
 * Convention de fichiers, dans `frontend/public/` :
 *   images/crops/<culture>.jpg      ex. images/crops/tomate.jpg
 *   images/diseases/<id-fiche>.jpg  ex. images/diseases/tomate-mildiou.jpg
 *
 * Remplis-les avec `scripts/extract_crop_photos.py`, qui pioche dans ton dataset PlantDoc/PlantSeg :
 * les photos correspondent alors exactement aux classes que le modèle reconnaît.
 * Tant qu'un fichier manque, la vignette dessinée prend le relais : rien ne casse.
 */
import { CROPS } from "./diseases";

// Photos déjà présentes dans le projet, utilisées en attendant celles du dataset.
const FALLBACKS = ["/examples/exemple1.jpg", "/examples/exemple2.jpg", "/examples/exemple3.jpg", "/images/leaf-closeup.jpg"];

const hash = (text) => [...String(text)].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 9973, 7);

/** Photo de couverture d'une culture. */
export const cropPhoto = (crop) => `/images/crops/${crop}.jpg`;

/** Photo d'une fiche maladie. */
export const diseasePhoto = (id) => `/images/diseases/${id}.jpg`;

/** Image de repli, stable pour une même clé (pas de changement à chaque rendu). */
export const fallbackPhoto = (key) => FALLBACKS[hash(key) % FALLBACKS.length];

export const CROP_KEYS = Object.keys(CROPS);
