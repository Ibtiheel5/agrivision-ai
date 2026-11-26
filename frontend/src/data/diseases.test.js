import { expect, test } from "vitest";
import { CROPS, DISEASES, TYPES, findDisease, getDisease, labelFr } from "./diseases";

// Les 29 classes exactes de models/classes.txt
const CLASSES = [
  "Apple Scab Leaf", "Apple leaf", "Apple rust leaf", "Bell_pepper leaf spot", "Bell_pepper leaf",
  "Blueberry leaf", "Cherry leaf", "Corn Gray leaf spot", "Corn leaf blight", "Corn rust leaf",
  "Peach leaf", "Potato leaf early blight", "Potato leaf late blight", "Potato leaf", "Raspberry leaf",
  "Soybean leaf", "Squash Powdery mildew leaf", "Strawberry leaf", "Tomato Early blight leaf",
  "Tomato Septoria leaf spot", "Tomato leaf bacterial spot", "Tomato leaf late blight",
  "Tomato leaf mosaic virus", "Tomato leaf yellow virus", "Tomato leaf", "Tomato mold leaf",
  "Tomato two spotted spider mites leaf", "grape leaf black rot", "grape leaf",
];

test("chaque classe du modèle a sa fiche", () => {
  const sansFiche = CLASSES.filter((c) => !findDisease(c));
  expect(sansFiche).toEqual([]);
  expect(DISEASES).toHaveLength(29);
});

test("identifiants uniques et champs complets", () => {
  expect(new Set(DISEASES.map((d) => d.id)).size).toBe(DISEASES.length);
  for (const d of DISEASES) {
    expect(TYPES[d.type], `type inconnu pour ${d.id}`).toBeTruthy();
    expect(CROPS[d.crop], `culture inconnue pour ${d.id}`).toBeTruthy();
    expect(d.summary.length).toBeGreaterThan(10);
    expect(d.symptoms.length).toBeGreaterThan(0);
    expect(d.treatment.length).toBeGreaterThan(0);
    expect(d.prevention.length).toBeGreaterThan(0);
  }
});

test("la correspondance tolère underscores, casse et espaces", () => {
  expect(findDisease("tomato_leaf_late_blight").id).toBe("tomate-mildiou");
  expect(findDisease("  TOMATO   LEAF  LATE BLIGHT ").id).toBe("tomate-mildiou");
  expect(findDisease("inconnue")).toBeNull();
  expect(findDisease(null)).toBeNull();
});

test("labelFr donne le nom français, ou nettoie le libellé inconnu", () => {
  expect(labelFr("Tomato leaf yellow virus")).toBe("Jaunisse en cuillère de la tomate (TYLCV)");
  expect(labelFr("maladie_inconnue")).toBe("maladie inconnue");
});

test("getDisease par identifiant", () => {
  expect(getDisease("vigne-black-rot").fr).toBe("Black rot de la vigne");
  expect(getDisease("nexistepas")).toBeNull();
});

test("aucune dose de produit n'est donnée", () => {
  const texte = JSON.stringify(DISEASES).toLowerCase();
  expect(texte).not.toMatch(/\d+\s?(ml|g|l)\s?\/\s?(ha|hl|l)/);
  expect(texte).not.toMatch(/dose de/);
});
