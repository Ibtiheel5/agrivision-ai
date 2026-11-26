import { beforeEach, expect, test, vi } from "vitest";
import { DEFAULTS, loadSettings, saveSettings } from "./settings";

beforeEach(() => localStorage.clear());

test("valeurs par défaut quand rien n'est enregistré", () => {
  expect(loadSettings()).toEqual(DEFAULTS);
});

test("une modification est fusionnée avec les valeurs existantes", () => {
  saveSettings({ place: "sfax" });
  saveSettings({ voiceReplies: true });
  expect(loadSettings()).toEqual({ ...DEFAULTS, place: "sfax", voiceReplies: true });
});

test("un réglage inconnu dans le stockage ne casse rien", () => {
  localStorage.setItem("agrivision.settings.v1", "{pas du json");
  expect(loadSettings()).toEqual(DEFAULTS);
});

test("les autres écrans sont prévenus du changement", () => {
  const vu = vi.fn();
  window.addEventListener("agrivision:settings", vu);
  saveSettings({ threshold: 0.6 });
  expect(vu).toHaveBeenCalled();
  expect(vu.mock.calls[0][0].detail.threshold).toBe(0.6);
  window.removeEventListener("agrivision:settings", vu);
});
