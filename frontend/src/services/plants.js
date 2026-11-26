// Carnet de plantes. Façade au-dessus du stockage durable : les photos ne sont plus perdues
// quand le quota du navigateur est atteint, et le carnet n'est plus limité.
import { all, clear, get, put, remove } from "./store";
import { thumbnail } from "./history";

export const loadPlants = () => all("plants");
export const getPlant = (id) => get("plants", id);

export async function addPlant({ name, notes, image }) {
  return put("plants", {
    name: (name ?? "").trim(),
    notes: (notes ?? "").trim(),
    image: image ? await thumbnail(image, 640, 0.72) : null,
    createdAt: Date.now(),
  });
}

export async function updatePlant(id, patch) {
  const current = get("plants", id);
  if (!current) return null;
  return put("plants", { ...current, ...patch });
}

export const deletePlant = (id) => remove("plants", id);
export const clearPlants = () => clear("plants");
