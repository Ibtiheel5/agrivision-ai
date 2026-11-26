import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// La langue est pilotée par ce petit état : les tests basculent fr / derja à volonté.
const langue = vi.hoisted(() => ({ lang: "fr" }));
vi.mock("../LangContext", () => ({ useLang: () => ({ lang: langue.lang, t: (k) => k }) }));

import ConseilsBloc from "./ConseilsBloc";

afterEach(() => { langue.lang = "fr"; });

describe("ConseilsBloc", () => {
  it("affiche le titre, l'urgence et les actions pour un fruit abîmé", () => {
    render(<ConseilsBloc label="Tomato__rotten" confidence={0.92} />);
    expect(screen.getByText("Tomate — abîmé")).toBeTruthy();
    expect(screen.getByText("À traiter")).toBeTruthy();
    expect(screen.getByText(/À faire maintenant/i)).toBeTruthy();
    expect(screen.getByText(/Sors-le du lot/i)).toBeTruthy();
  });

  it("affiche la conservation pour un fruit frais, sans alerte", () => {
    render(<ConseilsBloc label="Apple__fresh" confidence={0.95} />);
    expect(screen.getByText("Pomme — frais")).toBeTruthy();
    expect(screen.getByText("Rien à faire")).toBeTruthy();
    expect(screen.getByText(/Pour que ça dure/i)).toBeTruthy();
  });

  it("affiche traitement et prévention pour une maladie de feuille", () => {
    render(<ConseilsBloc label="Tomato leaf late blight" confidence={0.8} />);
    expect(screen.getByText("Mildiou de la tomate")).toBeTruthy();
    expect(screen.getByText(/À faire maintenant/i)).toBeTruthy();
    expect(screen.getByText(/Pour éviter que ça revienne/i)).toBeTruthy();
  });

  it("remplace le résumé par une invitation à refaire la photo si la confiance est faible", () => {
    render(<ConseilsBloc label="Tomato__rotten" confidence={0.2} />);
    expect(screen.getByText(/refais une photo/i)).toBeTruthy();
  });

  it("porte l'avertissement adapté au modèle", () => {
    const { unmount } = render(<ConseilsBloc label="Tomato leaf late blight" />);
    expect(screen.getByText(/diagnostic agronomique/i)).toBeTruthy();
    unmount();
    render(<ConseilsBloc label="Orange__rotten" />);
    expect(screen.getByText(/ne le consomme pas/i)).toBeTruthy();
  });

  it("reste lisible pour une étiquette inconnue", () => {
    render(<ConseilsBloc label="Chose__bizarre" />);
    expect(screen.getByText(/Aucune fiche de conseils/i)).toBeTruthy();
  });

  it("ne plante pas sans étiquette", () => {
    render(<ConseilsBloc />);
    expect(screen.getByText(/Aucune fiche de conseils/i)).toBeTruthy();
  });
});

describe("ConseilsBloc en derja", () => {
  it("traduit le titre, l'urgence et les actions", () => {
    langue.lang = "derja";
    render(<ConseilsBloc label="Tomato__rotten" confidence={0.92} />);
    expect(screen.getByText("Tmatem — khayeb")).toBeTruthy();
    expect(screen.getByText("Lezem t3alej")).toBeTruthy();
    expect(screen.getByText("Ch'na3mel tawa")).toBeTruthy();
  });

  it("traduit aussi une fiche maladie", () => {
    langue.lang = "derja";
    render(<ConseilsBloc label="Tomato leaf late blight" confidence={0.8} />);
    expect(screen.getByText("Mildiou mte3 el tmatem")).toBeTruthy();
    expect(screen.getByText("Bech ma yarja3ch")).toBeTruthy();
  });

  it("traduit l'absence de fiche", () => {
    langue.lang = "derja";
    render(<ConseilsBloc label="xyz 123" />);
    expect(screen.getByText(/Mazel ma famech fiche/i)).toBeTruthy();
  });
});
