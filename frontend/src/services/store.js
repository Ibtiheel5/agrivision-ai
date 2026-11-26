/**
 * Stockage durable de l'application : IndexedDB, avec un cache mémoire pour que les écrans
 * puissent lire de façon synchrone (comme avant) pendant que les écritures partent en arrière-plan.
 *
 * Pourquoi IndexedDB plutôt que localStorage :
 *  - localStorage plafonne vers 5 Mo et échoue en silence : les photos faisaient perdre des données ;
 *  - l'historique était limité à 20 analyses ;
 *  - IndexedDB accepte des centaines de Mo et stocke les images sans les convertir en texte.
 *
 * Les données déjà présentes dans localStorage sont reprises automatiquement au premier démarrage.
 */

const DB_NAME = "agrivision";
const DB_VERSION = 1;
export const STORES = { analyses: "analyses", plants: "plants", chats: "chats" };

const LIMITS = { analyses: 500, plants: 200, chats: 50 };

// Anciennes clés localStorage, reprises une seule fois.
const LEGACY = { analyses: "history", plants: "agrivision-plants", chats: "agrivision.chats.v1" };
const MIGRATED_FLAG = "agrivision.migrated.v1";

let db = null;
const cache = { analyses: [], plants: [], chats: [] };
let ready = false;

const sortKey = { analyses: "date", plants: "createdAt", chats: "updatedAt" };
const sorted = (store, items) => [...items].sort((a, b) => (b[sortKey[store]] ?? 0) - (a[sortKey[store]] ?? 0));

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB indisponible"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    // Une autre fenêtre garde une ancienne version ouverte : on ne reste pas bloqué sans rien dire.
    request.onblocked = () => reject(new Error("base verrouillée par un autre onglet"));
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const name of Object.values(STORES)) {
        if (!database.objectStoreNames.contains(name)) database.createObjectStore(name, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const tx = (store, mode, run) =>
  new Promise((resolve, reject) => {
    if (!db) return reject(new Error("base non initialisée"));
    const transaction = db.transaction(store, mode);
    const result = run(transaction.objectStore(store));
    transaction.oncomplete = () => resolve(result?.result ?? result);
    transaction.onerror = () => reject(transaction.error);
  });

const readAll = (store) =>
  new Promise((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });

/** Reprend les données de localStorage puis libère la place. */
async function migrateLegacy() {
  if (localStorage.getItem(MIGRATED_FLAG)) return;
  for (const [store, key] of Object.entries(LEGACY)) {
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem(key)) ?? [];
    } catch {
      items = [];
    }
    if (!Array.isArray(items) || items.length === 0) continue;
    for (const item of items) {
      const withId = { ...item, id: item.id ?? String(item.date ?? item.createdAt ?? Date.now() + Math.random()) };
      await tx(store, "readwrite", (s) => s.put(withId));
    }
    try {
      localStorage.removeItem(key); // les données vivent désormais dans IndexedDB
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.setItem(MIGRATED_FLAG, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** À appeler une fois au démarrage, avant le rendu. Ne lève jamais : l'app doit démarrer. */
export async function initStore() {
  if (ready) return true;
  try {
    db = await open();
    await migrateLegacy();
    for (const store of Object.values(STORES)) cache[store] = sorted(store, await readAll(store));
    ready = true;
    return true;
  } catch (error) {
    console.warn("Stockage durable indisponible, les données ne seront pas conservées :", error?.message);
    ready = false;
    return false;
  }
}

export const isReady = () => ready;

/** Lecture synchrone depuis le cache (déjà trié du plus récent au plus ancien). */
export const all = (store) => cache[store];

export const get = (store, id) => cache[store].find((item) => item.id === id) ?? null;

/** Ajoute ou remplace un élément. L'écriture disque est asynchrone, le cache est à jour aussitôt. */
export async function put(store, item) {
  const entry = { ...item, id: item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  cache[store] = sorted(store, [entry, ...cache[store].filter((x) => x.id !== entry.id)]);

  const surplus = cache[store].slice(LIMITS[store]);
  cache[store] = cache[store].slice(0, LIMITS[store]);

  if (ready) {
    try {
      await tx(store, "readwrite", (s) => s.put(entry));
      for (const old of surplus) await tx(store, "readwrite", (s) => s.delete(old.id));
    } catch (error) {
      console.warn("Écriture impossible :", error?.message);
    }
  }
  return entry;
}

export async function remove(store, id) {
  cache[store] = cache[store].filter((item) => item.id !== id);
  if (ready) {
    try {
      await tx(store, "readwrite", (s) => s.delete(id));
    } catch (error) {
      console.warn("Suppression impossible :", error?.message);
    }
  }
}

export async function clear(store) {
  cache[store] = [];
  if (ready) {
    try {
      await tx(store, "readwrite", (s) => s.clear());
    } catch (error) {
      console.warn("Effacement impossible :", error?.message);
    }
  }
}

/** Ferme la connexion : utile avant de supprimer la base, et dans les tests. */
export function closeStore() {
  try {
    db?.close();
  } catch {
    /* déjà fermée */
  }
  db = null;
  ready = false;
}

/** Pour les tests : ferme la base et vide le cache. */
export function __reset() {
  closeStore();
  for (const store of Object.values(STORES)) cache[store] = [];
}
