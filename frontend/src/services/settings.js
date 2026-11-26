// Réglages de l'appareil (localStorage). Aucun compte, aucune synchronisation serveur.
import { useCallback, useEffect, useState } from "react";

const KEY = "agrivision.settings.v1";

export const DEFAULTS = {
  place: "tunis",        // gouvernorat pour la météo
  voiceReplies: false,   // réponses vocales de l'assistant par défaut
  shareLocation: false,  // alimenter la carte des risques
  threshold: 0.3,        // seuil de confiance de la détection
};

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) ?? {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota plein : le réglage reste valable pour cette session */
  }
  window.dispatchEvent(new CustomEvent("agrivision:settings", { detail: next }));
  return next;
}

/** Hook : [réglages, modifier]. Se met à jour si un autre écran change un réglage. */
export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);
  useEffect(() => {
    const onChange = (e) => setSettings(e.detail);
    window.addEventListener("agrivision:settings", onChange);
    return () => window.removeEventListener("agrivision:settings", onChange);
  }, []);
  const update = useCallback((patch) => setSettings(saveSettings(patch)), []);
  return [settings, update];
}
