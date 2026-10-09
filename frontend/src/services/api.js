export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

// On demande toujours les détections dès 5 % de confiance ; le curseur filtre ensuite côté client,
// ce qui le rend instantané sans nouvelle requête.
export const API_MIN_CONF = 0.05;

async function parse(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* corps non JSON */
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Envoie une image (File ou Blob) à /predict. Ajoute `client_ms` (aller-retour mesuré dans le navigateur). */
export async function predict(blob, { conf = API_MIN_CONF, iou = 0.45, signal } = {}) {
  const form = new FormData();
  form.append("file", blob, blob.name ?? "frame.jpg");
  const t0 = performance.now();
  const res = await fetch(`${API_URL}/predict?conf=${conf}&iou=${iou}`, { method: "POST", body: form, signal });
  const data = await parse(res);
  return { ...data, client_ms: performance.now() - t0 };
}

export const getHealth = () => fetch(`${API_URL}/health`).then(parse);
export const getMetadata = () => fetch(`${API_URL}/model/metadata`).then(parse);

/** Message lisible pour l'utilisateur à partir d'une erreur réseau/HTTP. */
export function explain(err) {
  if (err?.name === "AbortError") return null;
  if (err?.status === 503) return "Le modèle n'est pas chargé côté serveur (503).";
  if (err?.status === 400) return "Le serveur a refusé le fichier : ce n'est pas une image valide.";
  if (err?.status === 413) return "Image trop volumineuse pour le serveur.";
  if (err instanceof TypeError) return `API injoignable (${API_URL}). Le backend est-il démarré ?`;
  return err?.message ?? "Erreur inconnue";
}
