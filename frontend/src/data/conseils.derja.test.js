import { describe, expect, it } from "vitest";
import { conseilPour, resumeCourt } from "./conseils";
import { FICHES_DERJA, PRODUITS_DERJA } from "./conseils.derja";
import { DISEASES } from "./diseases";
import { PRODUITS } from "./fruits";

const EN_DERJA = { lang: "derja" };

describe("couverture de la traduction", () => {
  it("chaque fiche maladie a sa version derja", () => {
    const manquantes = DISEASES.map((d) => d.id).filter((id) => !FICHES_DERJA[id]);
    expect(manquantes).toEqual([]);
  });

  it("chaque produit a sa version derja", () => {
    const manquants = PRODUITS.map((p) => p.id).filter((id) => !PRODUITS_DERJA[id]);
    expect(manquants).toEqual([]);
  });

  it("aucune traduction vide", () => {
    Object.entries(FICHES_DERJA).forEach(([id, f]) => {
      expect(f.fr, id).toBeTruthy();
      expect(f.summary, id).toBeTruthy();
      expect(f.treatment.length, id).toBeGreaterThan(0);
      expect(f.prevention.length, id).toBeGreaterThan(0);
    });
    Object.entries(PRODUITS_DERJA).forEach(([id, p]) => {
      expect(p.conservation.length, id).toBeGreaterThan(0);
      expect(p.siAbime.length, id).toBeGreaterThan(0);
    });
  });
});

describe("rien ne reste en français quand la langue est derja", () => {
  const etiquettes = [
    ...PRODUITS.flatMap((p) => [`${p.model}__fresh`, `${p.model}__rotten`]),
    ...DISEASES.map((d) => d.model),
  ];
  // Mots qui ne doivent jamais apparaître : ils trahiraient un texte non traduit.
  const FRANCAIS = /\b(feuille|arrose|retire|jamais|toujours|produit|plante|fruit|légume|abîmé|frais|sain)\b/i;

  it.each(etiquettes)("%s", (label) => {
    const c = conseilPour(label, EN_DERJA);
    const texte = [c.titre, c.resume, ...c.conseils, ...c.prevention, c.note].join(" ");
    expect(texte).not.toMatch(FRANCAIS);
  });
});

describe("bascule de langue", () => {
  it("le même résultat change de langue", () => {
    const fr = conseilPour("Tomato leaf late blight");
    const dj = conseilPour("Tomato leaf late blight", EN_DERJA);
    expect(fr.titre).toBe("Mildiou de la tomate");
    expect(dj.titre).toBe("Mildiou mte3 el tmatem");
    expect(dj.resume).not.toBe(fr.resume);
    expect(dj.etat).toBe(fr.etat); // la logique ne change pas, seul le texte change
    expect(dj.urgence).toBe(fr.urgence);
  });

  it("le fruit abîmé commence toujours par isoler, en derja aussi", () => {
    const dj = conseilPour("Tomato__rotten", EN_DERJA);
    expect(dj.titre).toBe("Tmatem — khayeb");
    expect(dj.conseils[0]).toMatch(/9affa/);
  });

  it("le repli générique parle derja", () => {
    const dj = conseilPour("Tomato___Target_Spot", EN_DERJA);
    expect(dj.generique).toBe(true);
    expect(dj.conseils.join(" ")).toMatch(/fani el filahi/);
  });

  it("le message de confiance faible est traduit", () => {
    const dj = conseilPour("Tomato__rotten", { confidence: 0.2, lang: "derja" });
    expect(resumeCourt(dj, "derja")).toMatch(/3awed sawwer/);
  });

  it("une langue inconnue retombe sur le français", () => {
    const c = conseilPour("Tomato leaf late blight", { lang: "es" });
    expect(c.titre).toBe("Mildiou de la tomate");
  });
});

describe("la règle des doses tient aussi en derja", () => {
  it("aucune dose chiffrée dans les conseils derja", () => {
    const interdits = /\b\d+\s*(ml|l|g|kg|cc)\s*(\/|par|pour)\s*(l|litre|hl|ha|m2)/i;
    const tous = DISEASES.map((d) => conseilPour(d.model, EN_DERJA));
    const fautifs = tous.filter((c) => interdits.test([...c.conseils, ...c.prevention].join(" ")));
    expect(fautifs.map((c) => c.id)).toEqual([]);
  });

  it("renvoie au fani el filahi quand un traitement est évoqué", () => {
    const c = conseilPour("Tomato leaf late blight", EN_DERJA);
    expect(`${c.conseils.join(" ")} ${c.note}`).toMatch(/fani el filahi|étiquette/i);
  });
});
