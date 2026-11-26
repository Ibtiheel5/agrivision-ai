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

/** Endpoint selon le mode : « leaf » (feuilles, modèle YOLO) ou « fruit » (fruits / légumes, détecteur + classifieur). */
const endpoint = (mode, visualize) => {
  const base = mode === "fruit" ? "/predict/fruit" : "/predict";
  return visualize ? `${base}/visualize` : base;
};

/** Envoie l'image à l'API ; renvoie { data, clientLatencyMs }. `conf` indéfini = seuil par défaut du modèle. */
export async function predict(file, { conf, visualize = false, mode = "leaf" } = {}) {
  // Garde-fou : sans ce contrôle, un appelant qui transmet autre chose qu'un fichier
  // obtient un 422 du serveur, très loin de l'endroit où l'erreur a réellement été commise.
  if (!(file instanceof Blob)) {
    throw new Error(`predict() attend un File ou un Blob, reçu : ${file === null ? "null" : typeof file}`);
  }
  const form = new FormData();
  form.append("file", file);
  const t0 = performance.now();
  const { data } = await http.post(endpoint(mode, visualize), form, {
    params: conf ? { conf } : undefined,
  });
  return { data, clientLatencyMs: Math.round(performance.now() - t0) };
}

export const getHealth = () => http.get("/health").then((r) => r.data);
export const getMetadata = () => http.get("/model/metadata").then((r) => r.data);

export function errorMessage(err) {
  const detail = err.response?.data?.detail;
  // FastAPI renvoie les erreurs de validation (422) sous forme de tableau d'objets :
  // les interpoler directement donnait « [object Object] » au lieu du champ fautif.
  if (Array.isArray(detail)) {
    const champs = detail
      .map((e) => `${(e.loc ?? []).slice(1).join(".") || "requête"} : ${e.msg}`)
      .join(" · ");
    return `${err.response.status} — ${champs}`;
  }
  if (err.response) return `${err.response.status} — ${detail ?? "erreur serveur"}`;
  if (err.code === "ECONNABORTED") return "Délai dépassé";
  if (err.message) return err.message;
  return "Serveur injoignable";
}