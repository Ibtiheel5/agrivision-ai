// Même palette que le backend (backend/app/inference.py) : une couleur stable par classe.
export const PALETTE = ["#e6194b", "#3cb44b", "#f58231", "#4363d8", "#911eb4", "#46a6a6", "#f032e6", "#9a6324", "#800000", "#808000", "#000075", "#ff7f50"];
export const colorFor = (id) => PALETTE[id % PALETTE.length];
