import axios from "axios";

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api", timeout: 30000 });

/** Réduit l'image (max 1280 px) pour économiser la data mobile avant l'envoi. */
export async function compressImage(file, maxSide = 1280, quality = 0.88) {
  if (!file.type.startsWith("image/")) return file;
  const bmp = await createImageBitmap(file);
  const r = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  if (r === 1 && file.size < 800_000) return file;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * r);
  c.height = Math.round(bmp.height * r);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", quality));
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

/** Envoie l'image à /predict ; renvoie { data, clientLatencyMs }. */
export async function predict(file, { conf, visualize = false } = {}) {
  const form = new FormData();
  form.append("file", file);
  const t0 = performance.now();
  const { data } = await http.post(visualize ? "/predict/visualize" : "/predict", form, {
    params: conf ? { conf } : undefined,
  });
  return { data, clientLatencyMs: Math.round(performance.now() - t0) };
}

export const getHealth = () => http.get("/health").then((r) => r.data);
export const getMetadata = () => http.get("/model/metadata").then((r) => r.data);

export function errorMessage(err) {
  if (err.response) return `${err.response.status} — ${err.response.data?.detail ?? "erreur serveur"}`;
  if (err.code === "ECONNABORTED") return "Délai dépassé";
  return "Serveur injoignable";
}
