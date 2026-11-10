// Historique local (hors-ligne) : 20 dernières analyses, miniature comprise.
const KEY = "history";
export const loadHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
export function addHistory(entry) {
  try {
    localStorage.setItem(KEY, JSON.stringify([entry, ...loadHistory()].slice(0, 20)));
  } catch {
    /* quota dépassé : on ignore */
  }
}
export const clearHistory = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
export async function thumbnail(file, side = 160) {
  const bmp = await createImageBitmap(file);
  const r = side / Math.max(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * r);
  c.height = Math.round(bmp.height * r);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.6);
}
