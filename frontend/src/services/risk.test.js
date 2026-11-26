import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RAISONS, messageRaison, reportDetection, testerPosition } from "./risk";

const CLE = "agrivision.settings.v1";

function partage(actif) {
  localStorage.setItem(CLE, JSON.stringify({ place: "tunis", shareLocation: actif }));
}

function geoloc(resultat) {
  globalThis.navigator.geolocation = {
    getCurrentPosition: (ok, ko) => (resultat instanceof Error || resultat?.code ? ko(resultat) : ok(resultat)),
  };
}

beforeEach(() => {
  localStorage.clear();
  globalThis.window.isSecureContext = true;
  globalThis.fetch = vi.fn(async () => ({ ok: true }));
});
afterEach(() => { delete globalThis.navigator.geolocation; });

describe("reportDetection ne devine plus, il dit pourquoi", () => {
  it("s'arrête net si le partage est désactivé, sans demander le GPS", async () => {
    partage(false);
    const demande = vi.fn();
    globalThis.navigator.geolocation = { getCurrentPosition: demande };
    const r = await reportDetection("Tomato leaf late blight");
    expect(r).toEqual({ ok: false, raison: RAISONS.partageDesactive });
    expect(demande).not.toHaveBeenCalled(); // c'est le cas le plus fréquent et le plus déroutant
  });

  it("signale un refus de permission", async () => {
    partage(true);
    geoloc({ code: 1 });
    expect((await reportDetection("x")).raison).toBe(RAISONS.refusee);
  });

  it("signale un délai dépassé", async () => {
    partage(true);
    geoloc({ code: 3 });
    expect((await reportDetection("x")).raison).toBe(RAISONS.delaiDepasse);
  });

  it("signale une page non sécurisée avant même de demander le GPS", async () => {
    partage(true);
    globalThis.window.isSecureContext = false;
    const demande = vi.fn();
    globalThis.navigator.geolocation = { getCurrentPosition: demande };
    expect((await reportDetection("x")).raison).toBe(RAISONS.nonSecurise);
    expect(demande).not.toHaveBeenCalled();
  });

  it("signale un refus du serveur", async () => {
    partage(true);
    geoloc({ coords: { latitude: 36.8, longitude: 10.1 } });
    globalThis.fetch = vi.fn(async () => ({ ok: false }));
    expect((await reportDetection("x")).raison).toBe(RAISONS.serveur);
  });

  it("réussit quand tout est en place", async () => {
    partage(true);
    geoloc({ coords: { latitude: 36.8, longitude: 10.1 } });
    expect(await reportDetection("x")).toEqual({ ok: true, raison: RAISONS.ok });
  });

  it("n'envoie rien sans étiquette", async () => {
    partage(true);
    expect((await reportDetection("")).raison).toBe(RAISONS.pasDeLabel);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("testerPosition", () => {
  it("rend les trois étapes même en cas d'échec", async () => {
    partage(false);
    globalThis.window.isSecureContext = false;
    const r = await testerPosition();
    expect(r.ok).toBe(false);
    expect(r.etapes.map((e) => e.cle)).toEqual(["https", "api", "partage"]);
    expect(r.etapes.find((e) => e.cle === "https").ok).toBe(false);
    expect(r.etapes.find((e) => e.cle === "partage").ok).toBe(false);
  });

  it("rend la précision quand la position arrive", async () => {
    partage(true);
    geoloc({ coords: { latitude: 36.8, longitude: 10.1, accuracy: 23.7 } });
    const r = await testerPosition();
    expect(r.ok).toBe(true);
    expect(r.precisionM).toBe(24);
  });

  it("survit à l'absence de l'API Permissions (vieux Safari)", async () => {
    partage(true);
    geoloc({ coords: { latitude: 36.8, longitude: 10.1, accuracy: 10 } });
    const avant = globalThis.navigator.permissions;
    delete globalThis.navigator.permissions;
    const r = await testerPosition();
    expect(r.ok).toBe(true);
    expect(r.permission).toBeNull();
    if (avant) globalThis.navigator.permissions = avant;
  });
});

describe("messages", () => {
  it("existent dans les deux langues pour chaque raison", () => {
    Object.values(RAISONS).forEach((r) => {
      expect(messageRaison(r, "fr")).not.toBe(r);
      expect(messageRaison(r, "derja")).not.toBe(r);
    });
  });

  it("le message de partage désactivé nomme les réglages", () => {
    expect(messageRaison(RAISONS.partageDesactive, "fr")).toMatch(/Réglages/i);
  });
});
