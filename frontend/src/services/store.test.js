import "fake-indexeddb/auto";
import { beforeEach, expect, test, vi } from "vitest";

let precedent = null;

const freshModules = async () => {
  precedent?.__reset?.(); // ferme la connexion de l'instance précédente
  vi.resetModules();
  const store = await import("./store");
  const history = await import("./history");
  const plants = await import("./plants");
  const chats = await import("./conversations");
  precedent = store;
  return { store, history, plants, chats };
};

beforeEach(async () => {
  localStorage.clear();
  precedent?.__reset?.();
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase("agrivision");
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
});

test("les analyses survivent à un redémarrage de l'app", async () => {
  let { store, history } = await freshModules();
  await store.initStore();
  history.addHistory({ date: 1000, top: "Mildiou", confidence: 0.8, thumb: "data:,x" });
  await new Promise((r) => setTimeout(r, 20));

  ({ store, history } = await freshModules()); // simule une réouverture
  await store.initStore();
  expect(history.loadHistory()).toHaveLength(1);
  expect(history.loadHistory()[0].top).toBe("Mildiou");
});

test("plus de plafond à 20 analyses", async () => {
  const { store, history } = await freshModules();
  await store.initStore();
  for (let i = 0; i < 60; i++) history.addHistory({ date: i, top: `m${i}`, confidence: 0.5 });
  expect(history.loadHistory()).toHaveLength(60);
  expect(history.loadHistory()[0].top).toBe("m59"); // le plus récent en tête
});

test("les anciennes données localStorage sont reprises puis la clé est libérée", async () => {
  localStorage.setItem("history", JSON.stringify([{ date: 500, top: "Ancien", confidence: 0.4 }]));
  localStorage.setItem("agrivision-plants", JSON.stringify([{ id: "p1", name: "Citronnier", createdAt: 400 }]));

  const { store, history, plants } = await freshModules();
  await store.initStore();

  expect(history.loadHistory()[0].top).toBe("Ancien");
  expect(plants.loadPlants()[0].name).toBe("Citronnier");
  expect(localStorage.getItem("history")).toBeNull();      // migrée, place libérée
  expect(localStorage.getItem("agrivision-plants")).toBeNull();
});

test("la migration ne se rejoue pas et n'écrase pas les nouvelles données", async () => {
  localStorage.setItem("history", JSON.stringify([{ date: 500, top: "Ancien", confidence: 0.4 }]));
  let { store } = await freshModules();
  await store.initStore();

  localStorage.setItem("history", JSON.stringify([{ date: 900, top: "Remis", confidence: 0.9 }]));
  let history;
  ({ store, history } = await freshModules());
  await store.initStore();
  expect(history.loadHistory().map((a) => a.top)).toEqual(["Ancien"]); // la 2e tentative est ignorée
});

test("plantes et conversations : écriture, lecture, suppression", async () => {
  const { store, plants, chats } = await freshModules();
  await store.initStore();

  const p = await plants.addPlant({ name: "  Tomate  ", notes: " serre ", image: null });
  expect(p.name).toBe("Tomate");
  expect(plants.loadPlants()).toHaveLength(1);
  await plants.updatePlant(p.id, { notes: "plein champ" });
  expect(plants.getPlant(p.id).notes).toBe("plein champ");
  await plants.deletePlant(p.id);
  expect(plants.loadPlants()).toHaveLength(0);

  chats.saveConversation({ id: "c1", messages: [{ role: "user", content: "salut", audioUrl: "data:audio/wav;base64,A" }] });
  await new Promise((r) => setTimeout(r, 20));
  expect(chats.getConversation("c1").messages[0].audioUrl).toBeUndefined(); // audio jamais persisté
  expect(chats.getConversation("c1").title).toBe("salut");
});

test("sans IndexedDB, l'application démarre quand même", async () => {
  const vrai = globalThis.indexedDB;
   
  globalThis.indexedDB = undefined;
  const { store, history } = await freshModules();
  expect(await store.initStore()).toBe(false);
  expect(() => history.addHistory({ date: 1, top: "x", confidence: 0.1 })).not.toThrow();
  expect(history.loadHistory()).toHaveLength(1); // en mémoire pour la session
  globalThis.indexedDB = vrai;
});
