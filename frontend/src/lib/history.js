// Historique côté appareil (localStorage) : aucune photo n'est envoyée ni stockée sur le serveur.
const KEY = "agrivision.history.v1";

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

export function listHistory() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; } catch { return []; }
}
function save(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* quota plein */ }
}
export function addHistory(entry) {
  save([entry, ...listHistory()].slice(0, 50));
  return entry;
}
export const getHistory = (id) => listHistory().find((e) => e.id === id);
export const removeHistory = (id) => save(listHistory().filter((e) => e.id !== id));
export const clearHistory = () => save([]);

export async function makeThumbnail(file, size = 160) {
  const bmp = await createImageBitmap(file);
  const scale = size / Math.max(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

const LABELS_FR = {
  "apple scab leaf": "Tavelure du pommier",
  "apple leaf": "Feuille de pommier saine",
  "apple rust leaf": "Rouille du pommier",
  "bell pepper leaf spot": "Tache foliaire du poivron",
  "bell pepper leaf": "Feuille de poivron saine",
  "blueberry leaf": "Feuille de myrtillier saine",
  "cherry leaf": "Feuille de cerisier saine",
  "corn gray leaf spot": "Tache grise du maïs",
  "corn leaf blight": "Brûlure foliaire du maïs",
  "corn rust leaf": "Rouille du maïs",
  "peach leaf": "Feuille de pêcher saine",
  "potato leaf early blight": "Alternariose de la pomme de terre",
  "potato leaf late blight": "Mildiou de la pomme de terre",
  "potato leaf": "Feuille de pomme de terre saine",
  "raspberry leaf": "Feuille de framboisier saine",
  "soybean leaf": "Feuille de soja saine",
  "squash powdery mildew leaf": "Oïdium de la courge",
  "strawberry leaf": "Feuille de fraisier saine",
  "tomato early blight leaf": "Alternariose de la tomate",
  "tomato septoria leaf spot": "Septoriose de la tomate",
  "tomato leaf bacterial spot": "Tache bactérienne de la tomate",
  "tomato leaf late blight": "Mildiou de la tomate",
  "tomato leaf mosaic virus": "Mosaïque de la tomate",
  "tomato leaf yellow virus": "Jaunisse de la tomate",
  "tomato leaf": "Feuille de tomate saine",
  "tomato mold leaf": "Moisissure de la tomate",
  "tomato two spotted spider mites leaf": "Acariens sur tomate",
  "grape leaf black rot": "Pourriture noire de la vigne",
  "grape leaf": "Feuille de vigne saine",
};

export const prettyLabel = (value) => {
  const label = String(value).replace(/_/g, " ").trim();
  return LABELS_FR[label.toLocaleLowerCase("en")] ?? label;
};
