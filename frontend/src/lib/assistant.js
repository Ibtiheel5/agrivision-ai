// Même base d'URL que services/api.js : VITE_API_URL, sinon le proxy Vite « /api ».
export const API = import.meta.env.VITE_API_URL || "/api";

async function request(path, options) {
  const r = await fetch(`${API}${path}`, options);
  if (!r.ok) {
    let detail = "";
    try { detail = (await r.json()).detail ?? ""; } catch { /* corps non JSON */ }
    throw new Error(detail || `Erreur ${r.status}`);
  }
  return r.json();
}

export const getJSON = (path) => request(path);

const postJSON = (path, body) =>
  request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Seuls les tours de parole partent au modèle : les bulles « analyse » sont transmises à part.
const toTurns = (messages) =>
  messages.filter((m) => m.role === "user" || m.role === "assistant").map(({ role, content }) => ({ role, content }));

/** Analyses passées (historique local) → format attendu par l'API. */
export const toAnalyses = (entries, max = 8) =>
  entries
    .filter((e) => e.top && e.confidence != null)
    .slice(0, max)
    .map((e) => ({
      label: String(e.top),
      confidence: Number(e.confidence),
      when: e.date ? new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : undefined,
    }));

/** Chat texte. `script` : "latin" (arabizi, comme l'i18n derja) ou "arabic". */
export async function sendChat(message, messages, diagnosis, script = "latin", analyses = []) {
  const { reply } = await postJSON("/chat", {
    message,
    history: toTurns(messages),
    diagnosis: diagnosis ?? null,
    recent_analyses: analyses,
    script,
  });
  return reply;
}

/** Chat vocal : envoie l'enregistrement, reçoit transcription + réponse + audio MP3. */
export async function sendVoice(blob, messages, diagnosis, analyses = []) {
  const fd = new FormData();
  fd.append("audio", blob, `voice.${blob.type.includes("mp4") ? "m4a" : "webm"}`);
  fd.append("history", JSON.stringify(toTurns(messages)));
  if (analyses.length) fd.append("recent_analyses", JSON.stringify(analyses));
  if (diagnosis) {
    fd.append("diagnosis_label", diagnosis.label);
    fd.append("diagnosis_confidence", String(diagnosis.confidence));
  }
  const data = await request("/voice-chat", { method: "POST", body: fd });
  return {
    transcript: data.transcript,
    reply: data.reply,
    audioUrl: `data:${data.audio_mime};base64,${data.audio_base64}`,
  };
}

/** « 9rali » : lit un texte en lettres arabes à voix haute. Renvoie une URL audio. */
export async function fetchTts(text) {
  const { audio_base64, audio_mime } = await postJSON("/tts", { text });
  return `data:${audio_mime};base64,${audio_base64}`;
}

export const hasArabic = (text) => /[؀-ۿ]/.test(text);

/** Format d'enregistrement supporté : webm/opus (Android, Chrome) ou mp4/aac (iOS Safari). */
export function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}
