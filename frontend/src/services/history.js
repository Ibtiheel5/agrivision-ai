// Historique des analyses. Façade au-dessus du stockage durable : même API qu'avant,
// mais plus de plafond à 20 et plus de perte silencieuse quand le quota est atteint.
import { all, clear, put, remove } from "./store";

export const loadHistory = () => all("analyses");

export function addHistory(entry) {
  const item = { id: String(entry.date ?? Date.now()), ...entry };
  put("analyses", item); // écriture en arrière-plan, le cache est déjà à jour
  return item;
}

export const removeHistory = (id) => remove("analyses", id);
export const clearHistory = () => clear("analyses");
export const getAnalysis = (id) => all("analyses").find((a) => a.id === id) ?? null;

/** Miniature JPEG (data URL) pour l'affichage des listes. */
export async function thumbnail(file, side = 160, quality = 0.6) {
  const bmp = await createImageBitmap(file);
  const r = Math.min(1, side / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * r);
  c.height = Math.round(bmp.height * r);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}
