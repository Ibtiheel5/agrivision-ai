import { thumbnail } from "./history";

const KEY = "agrivision-plants";

export function loadPlants() {
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved) return [];
    const plants = JSON.parse(saved);
    return Array.isArray(plants) ? plants : [];
  } catch {
    return [];
  }
}

function savePlants(plants) {
  localStorage.setItem(KEY, JSON.stringify(plants));
}

export async function addPlant({ name, notes, image }) {
  const plant = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    notes: notes.trim(),
    image: image ? await thumbnail(image, 480) : null,
    createdAt: Date.now(),
  };
  savePlants([plant, ...loadPlants()]);
  return plant;
}

export function deletePlant(id) {
  savePlants(loadPlants().filter((plant) => plant.id !== id));
}

export function getPlant(id) {
  return loadPlants().find((plant) => plant.id === id) || null;
}
