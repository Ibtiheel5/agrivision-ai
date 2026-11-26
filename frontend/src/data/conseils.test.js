import { describe, expect, it } from "vitest";
import { conseilPour, resumeCourt, SEUIL_INCERTAIN } from "./conseils";
import { PRODUITS, lireEtiquetteFruit } from "./fruits";
import { DISEASES } from "./diseases";

const CLASSES_FRUIT = PRODUITS.flatMap((p) => [`${p.model}__fresh`, `${p.model}__rotten`]);

describe("couverture des deux modèles", () => {
  it("couvre les 28 classes du modèle fruits", () => {
    expect(CLASSES_FRUIT).toHaveLength(28);
    const manquantes = CLASSES_FRUIT.filter((c) => conseilPour(c) === null);
    expect(manquantes).toEqual([]);
  });

  it("couvre toutes les classes du modèle feuilles", () => {
    const manquantes = DISEASES.map((d) => d.model).filter((m) => conseilPour(m) === null);
    expect(manquantes).toEqual([]);
  });

  it("donne au moins un conseil concret pour chaque classe", () => {
    const sansConseil = [...CLASSES_FRUIT, ...DISEASES.map((d) => d.model)]
      .filter((c) => (conseilPour(c)?.conseils ?? []).length === 0);
    expect(sansConseil).toEqual([]);
  });
});

describe("fruit abîmé", () => {
  const c = conseilPour("Tomato__rotten");

  it("est marqué comme à traiter", () => {
    expect(c.etat).toBe("abime");
    expect(c.urgence).toBe("agir");
    expect(c.tone).toBe("danger");
  });

  it("commence par isoler le produit du lot", () => {
    expect(c.conseils[0]).toMatch(/lot/i);
  });

  it("explique la cause et rappelle la conservation en prévention", () => {
    expect(c.resume).toMatch(/pourriture|choc/i);
    expect(c.prevention.length).toBeGreaterThan(0);
  });
});

describe("fruit frais", () => {
  const c = conseilPour("Apple__fresh");

  it("ne déclenche aucune alerte", () => {
    expect(c.etat).toBe("sain");
    expect(c.urgence).toBe("aucune");
    expect(c.tone).toBe("ok");
  });

  it("donne des conseils de conservation", () => {
    expect(c.conseils.join(" ")).toMatch(/°C|frais/i);
  });
});

describe("feuille", () => {
  it("une maladie demande d'agir", () => {
    const c = conseilPour("Tomato leaf late blight");
    expect(c.source).toBe("feuille");
    expect(c.etat).toBe("malade");
    expect(c.conseils.length).toBeGreaterThan(0);
    expect(c.prevention.length).toBeGreaterThan(0);
  });

  it("une feuille saine ne demande rien", () => {
    const c = conseilPour("Tomato leaf");
    expect(c.etat).toBe("sain");
    expect(c.urgence).toBe("aucune");
  });
});

describe("sécurité du contenu", () => {
  const tous = [...CLASSES_FRUIT, ...DISEASES.map((d) => d.model)].map((c) => conseilPour(c));

  it("ne donne jamais de dose, de concentration ni de délai avant récolte", () => {
    const interdits = /\b\d+\s*(ml|l|g|kg|cc)\s*(\/|par|pour)\s*(l|litre|hl|ha|m2)|\b\d+\s*%\s*de\s*(produit|solution)|délai avant récolte de \d/i;
    const fautifs = tous.filter((c) => interdits.test([...c.conseils, ...c.prevention, c.resume].join(" ")));
    expect(fautifs.map((c) => c.id)).toEqual([]);
  });

  it("renvoie au technicien agricole dès qu'un traitement est évoqué", () => {
    const parlentTraitement = tous.filter((c) =>
      c.source === "feuille" && /fongicide|insecticide|traitement chimique/i.test(c.conseils.join(" ")));
    parlentTraitement.forEach((c) => {
      expect(`${c.conseils.join(" ")} ${c.note}`).toMatch(/technicien|étiquette/i);
    });
  });

  it("porte toujours un avertissement adapté au modèle", () => {
    tous.forEach((c) => {
      expect(c.note).toMatch(c.source === "fruit" ? /ne le consomme pas/i : /diagnostic agronomique/i);
    });
  });
});

describe("confiance faible", () => {
  it("invite à refaire la photo avant d'agir", () => {
    const c = conseilPour("Tomato__rotten", { confidence: SEUIL_INCERTAIN - 0.1 });
    expect(c.incertain).toBe(true);
    expect(resumeCourt(c)).toMatch(/refais une photo/i);
  });

  it("laisse le résumé normal si la confiance est bonne", () => {
    const c = conseilPour("Tomato__rotten", { confidence: 0.9 });
    expect(c.incertain).toBe(false);
    expect(resumeCourt(c)).toBe(c.resume);
  });
});

describe("étiquettes inconnues", () => {
  it.each(["", null, undefined, "Inconnu__fresh", "n'importe quoi", "xyz 123"])(
    "renvoie null pour %p", (label) => expect(conseilPour(label)).toBeNull(),
  );

  it("donne des conseils génériques si la culture est reconnue, même mal orthographiée", () => {
    const c = conseilPour("Tomato__moisi");
    expect(c.generique).toBe(true);
    expect(c.titre).toMatch(/Tomate/);
  });

  it("resumeCourt reste lisible sans fiche", () => {
    expect(resumeCourt(null)).toMatch(/aucune fiche/i);
  });

  it("lireEtiquetteFruit ignore les étiquettes du modèle feuilles", () => {
    expect(lireEtiquetteFruit("Tomato leaf late blight")).toBeNull();
  });
});

describe("étiquettes du modèle 136 classes (nommage PlantVillage)", () => {
  it.each([
    ["potato healthy", "Pomme de terre"],
    ["tomato healthy", "Tomate"],
    ["blueberry healthy", "Autres cultures"],
  ])("%s est reconnu comme sain", (label) => {
    const c = conseilPour(label);
    expect(c).not.toBeNull();
    expect(c.etat).toBe("sain");
    expect(c.urgence).toBe("aucune");
  });

  it.each([
    "Tomato___Late_blight",
    "Tomato___late_blight",
    "tomato late blight",
    "Tomato_Late_Blight_leaf",
  ])("%s retrouve la fiche du mildiou", (label) => {
    const c = conseilPour(label);
    expect(c.titre).toBe("Mildiou de la tomate");
    expect(c.generique).toBe(false);
  });

  it("retombe sur des conseils génériques utiles pour une classe inconnue", () => {
    const c = conseilPour("Tomato___Target_Spot");
    expect(c.generique).toBe(true);
    expect(c.titre).toMatch(/Tomate/);
    expect(c.etat).toBe("malade");
    expect(c.conseils.length).toBeGreaterThanOrEqual(3);
    expect(c.conseils.join(" ")).toMatch(/technicien/i);
  });

  it("nomme la culture même si elle n'a pas de fiche", () => {
    const c = conseilPour("Peach___Bacterial_spot");
    expect(c.titre).toMatch(/Autres cultures|Peach/i);
    expect(c.etat).toBe("malade");
  });

  it("les étiquettes 29 classes passent toujours en priorité, sans générique", () => {
    const c = conseilPour("Tomato leaf");
    expect(c.generique).toBe(false);
    expect(c.titre).toBe("Feuille de tomate saine");
  });
});
