import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LangContext", () => ({ useLang: () => ({ lang: "fr", t: (k) => k }) }));

const entrees = new Map();
vi.mock("../services/history", () => ({
  getAnalysis: (id) => entrees.get(id) ?? null,
}));

import Analyse from "./Analyse";

function afficher(id) {
  return render(
    <MemoryRouter initialEntries={[`/analyse/${id}`]}>
      <Routes><Route path="/analyse/:analyseId" element={<Analyse />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => entrees.clear());

describe("page d'une analyse", () => {
  it("affiche le résultat puis les conseils de la fiche", async () => {
    entrees.set("a1", {
      id: "a1", top: "Tomato leaf late blight", confidence: 0.86,
      date: "2026-11-23T22:50:00.000Z",
    });
    afficher("a1");
    expect(await screen.findByText("86 %")).toBeTruthy();
    expect(screen.getByText(/À faire maintenant/i)).toBeTruthy();
    expect(screen.getByText(/Retire et sors de la parcelle/i)).toBeTruthy();
  });

  it("gère une étiquette du modèle 136 classes", async () => {
    entrees.set("a2", { id: "a2", top: "potato healthy", confidence: 0.85, date: "2026-11-23T22:50:00.000Z" });
    afficher("a2");
    // "potato healthy" (136 classes) doit retrouver la vraie fiche de "Potato leaf" (29 classes).
    expect(await screen.findByText("Feuille de pomme de terre saine")).toBeTruthy();
    expect(screen.getByText("Rien à faire")).toBeTruthy();
  });

  it("affiche les conseils d'un fruit abîmé", async () => {
    entrees.set("a3", { id: "a3", top: "Tomato__rotten", confidence: 0.9, date: "2026-11-23T22:50:00.000Z" });
    afficher("a3");
    expect(await screen.findByText("Tomate — abîmé")).toBeTruthy();
    expect(screen.getByText(/Sors-le du lot/i)).toBeTruthy();
  });

  it("liste les autres hypothèses quand elles existent", async () => {
    entrees.set("a4", {
      id: "a4", top: "Tomato leaf late blight", confidence: 0.6,
      top3: [{ label: "Tomato leaf late blight", confidence: 0.6 }, { label: "Tomato Early blight leaf", confidence: 0.25 }],
    });
    afficher("a4");
    expect(await screen.findByText(/Autres hypothèses/i)).toBeTruthy();
    expect(screen.getByText("25 %")).toBeTruthy();
  });

  it("explique calmement qu'une analyse supprimée est introuvable", async () => {
    afficher("inconnue");
    expect(await screen.findByText(/plus enregistrée sur cet appareil/i)).toBeTruthy();
  });
});
