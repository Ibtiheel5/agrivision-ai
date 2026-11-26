// Noms d'affichage en français pour les 30 classes PlantDoc (feuilles) et pour les classes fruits / légumes.
// L'API renvoie toujours le libellé brut du dataset ; ce dictionnaire ne change pas les ids de classe.
// (À relire avec une source agronomique avant le rapport.)
const SAINE = "Saine";
const MAP = {
  "Apple Scab Leaf": ["Pomme", "Tavelure"],
  "Apple leaf": ["Pomme", SAINE],
  "Apple rust leaf": ["Pomme", "Rouille"],
  "Bell_pepper leaf spot": ["Poivron", "Taches foliaires"],
  "Bell_pepper leaf": ["Poivron", SAINE],
  "Blueberry leaf": ["Myrtille", SAINE],
  "Cherry leaf": ["Cerisier", SAINE],
  "Corn Gray leaf spot": ["Maïs", "Cercosporiose"],
  "Corn leaf blight": ["Maïs", "Helminthosporiose"],
  "Corn rust leaf": ["Maïs", "Rouille"],
  "Peach leaf": ["Pêcher", SAINE],
  "Potato leaf early blight": ["Pomme de terre", "Alternariose"],
  "Potato leaf late blight": ["Pomme de terre", "Mildiou"],
  "Potato leaf": ["Pomme de terre", SAINE],
  "Raspberry leaf": ["Framboisier", SAINE],
  "Soyabean leaf": ["Soja", SAINE],
  "Soybean leaf": ["Soja", SAINE],
  "Squash Powdery mildew leaf": ["Courge", "Oïdium"],
  "Strawberry leaf": ["Fraisier", SAINE],
  "Tomato Early blight leaf": ["Tomate", "Alternariose"],
  "Tomato Septoria leaf spot": ["Tomate", "Septoriose"],
  "Tomato leaf bacterial spot": ["Tomate", "Tache bactérienne"],
  "Tomato leaf late blight": ["Tomate", "Mildiou"],
  "Tomato leaf mosaic virus": ["Tomate", "Virus de la mosaïque"],
  "Tomato leaf yellow virus": ["Tomate", "Virus des feuilles jaunes"],
  "Tomato leaf": ["Tomate", SAINE],
  "Tomato mold leaf": ["Tomate", "Cladosporiose"],
  "Tomato two spotted spider mites leaf": ["Tomate", "Acariens tétranyques"],
  "grape leaf black rot": ["Vigne", "Pourriture noire"],
  "grape leaf": ["Vigne", SAINE],
};

// Fruits / légumes : le modèle renvoie « Produit__état » (ex. « Mango__rotten »).
const FRUIT = {
  Apple: "Pomme", Banana: "Banane", Orange: "Orange", Grape: "Raisin", Guava: "Goyave", Jujube: "Jujube",
  Pomegranate: "Grenade", Strawberry: "Fraise", Mango: "Mangue", Tomato: "Tomate", Potato: "Pomme de terre",
  Bell_pepper: "Poivron", Carrot: "Carotte", Cucumber: "Concombre", Lemon: "Citron", Watermelon: "Pastèque",
  Carambola: "Carambole", Peach: "Pêche", Plum: "Prune", Pear: "Poire", Spinach: "Épinards",
};
const FRUIT_STATE = { fresh: "Frais", rotten: "Pourri", diseased: "Malade" };

export function describe(raw) {
  if (typeof raw === "string" && raw.includes("__")) {
    const [p, s] = raw.split("__");
    const crop = FRUIT[p] ?? p.replace(/_/g, " ");
    const condition = FRUIT_STATE[s] ?? s;
    return { crop, condition, healthy: s === "fresh", short: `${crop} · ${condition}`, raw };
  }
  const m = MAP[raw];
  if (!m) return { crop: raw, condition: "", healthy: false, short: raw, raw };
  const [crop, condition] = m;
  return { crop, condition, healthy: condition === SAINE, short: `${crop} · ${condition}`, raw };
}
