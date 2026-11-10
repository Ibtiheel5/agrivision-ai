export const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request(path, options) {
  const r = await fetch(`${API}${path}`, options);
  if (!r.ok) {
    let detail = "";
    try { detail = (await r.json()).detail ?? ""; } catch { /* corps non JSON */ }
    throw new Error(`${r.status} ${detail}`.trim());
  }
  return r.json();
}

export const getJSON = (path) => request(path);
export const postJSON = (path, body) =>
  request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// ADAPTE ICI si la réponse de ton /predict/top3 a une autre forme.
export function normalizePrediction(data) {
  const raw = Array.isArray(data.detections)
    ? data.detections
    : data.top3 ?? data.predictions ?? data.results ?? (Array.isArray(data) ? data : []);
  const detections = raw.map((item) => {
    let confidence = Number(item.confidence ?? item.score ?? item.conf ?? item.probability ?? 0);
    if (confidence > 1) confidence /= 100;
    return {
      ...item,
      label: String(item.label ?? item.class_name ?? item.name ?? item.class ?? "?"),
      confidence,
      box: item.box
        ? {
            x1: Number(item.box.x1),
            y1: Number(item.box.y1),
            x2: Number(item.box.x2),
            y2: Number(item.box.y2),
          }
        : null,
    };
  });
  const primary = [...detections].sort((a, b) => b.confidence - a.confidence)[0] ?? null;
  const alternatives = primary?.alternatives ?? [];
  const top3 = alternatives.length
    ? alternatives.map((item) => ({
        label: String(item.label),
        confidence: Number(item.score),
      }))
    : primary
      ? [{ label: primary.label, confidence: primary.confidence }]
      : [];
  return {
    top3,
    primary,
    detections,
    status: data.status ?? primary?.status ?? "aucune_detection",
    imageWidth: data.image_width ?? null,
    imageHeight: data.image_height ?? null,
    latencyMs: data.latency_ms ?? data.latency ?? null,
    modelVersion: data.model_version ?? data.version ?? null,
  };
}

export async function predict(file, { lat, lon, share } = {}) {
  const fd = new FormData();
  fd.append("file", file, file.name ?? "capture.jpg");
  if (share && lat != null && lon != null) {
    fd.append("lat", lat);
    fd.append("lon", lon);
    fd.append("share_location", "true");
  }
  return normalizePrediction(await request("/predict/top3", { method: "POST", body: fd }));
}
