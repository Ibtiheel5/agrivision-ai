const KEY = "history";

function normalize(entry) {
  return {
    date: entry.date ?? Date.now(),
    thumb: entry.thumb ?? null,
    image: entry.image ?? null,
    top: entry.top ?? null,
    confidence: entry.confidence ?? null,
    detections: Array.isArray(entry.detections) ? entry.detections.slice(0, 5) : [],
    plantId: entry.plantId ?? null,
    plantName: entry.plantName ?? null,
    notes: entry.notes ?? "",
    feedback: entry.feedback ?? null,
  };
}

export const loadHistory = () => {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(items) ? items.map(normalize) : [];
  } catch {
    return [];
  }
};

export function addHistory(entry) {
  try {
    localStorage.setItem(KEY, JSON.stringify([normalize(entry), ...loadHistory()].slice(0, 30)));
  } catch {
    /* quota */
  }
}

export function updateHistory(date, patch) {
  try {
    const items = loadHistory().map((item) => (item.date === date ? { ...item, ...patch } : item));
    localStorage.setItem(KEY, JSON.stringify(items));
    return items;
  } catch {
    return loadHistory();
  }
}

export const clearHistory = () => {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
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
