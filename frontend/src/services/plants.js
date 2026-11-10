import { thumbnail } from "./history";

const KEY = "agrivision-plants";

export function loadPlants() {
  const saved = localStorage.getItem(KEY);
  if (!saved) return [];
  const plants = JSON.parse(saved);
  if (!Array.isArray(plants)) throw new Error("Le carnet de plantes est illisible.");
  return plants;
}

export async function addPlant({ name, notes, image }) {
  const plant = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    notes: notes.trim(),
    image: image ? await thumbnail(image, 480) : null,
    createdAt: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify([plant, ...loadPlants()]));
  return plant;
}

export function deletePlant(id) {
  localStorage.setItem(KEY, JSON.stringify(loadPlants().filter((plant) => plant.id !== id)));
}
