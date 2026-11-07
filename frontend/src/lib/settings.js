import { useState } from "react";

const KEY = "agrivision.settings.v1";
const DEFAULTS = { place: "Médenine", shareLocation: false };

function read() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return DEFAULTS; }
}

export function useSettings() {
  const [settings, setSettings] = useState(read);
  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  return [settings, update];
}
