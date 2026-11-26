import "fake-indexeddb/auto";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

vi.mock("../LangContext", () => ({ useLang: () => ({ lang: "fr", t: (k) => k }) }));
import { addHistory } from "../services/history";
import { __reset, initStore } from "../services/store";
import History from "./History";

beforeEach(async () => {
  __reset();
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase("agrivision");
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
  await initStore();
});

const afficher = () => render(<MemoryRouter><History /></MemoryRouter>);

test("état vide : invitation à scanner", () => {
  afficher();
  expect(screen.getByText("Aucune analyse pour l'instant")).toBeTruthy();
});

test("affiche les analyses avec le nom français et un lien vers la fiche", () => {
  addHistory({ date: Date.now(), top: "Tomato leaf late blight", confidence: 0.82, thumb: "data:,x" });
  afficher();
  expect(screen.getByText("Mildiou de la tomate")).toBeTruthy();
  expect(screen.getAllByText("82 %")).toHaveLength(2); // badge + moyenne (une seule analyse)
  // La ligne mène maintenant au détail de l'analyse (conseils), d'où l'on atteint la fiche.
  expect(screen.getByText("Voir la fiche").closest("a").getAttribute("href")).toMatch(/^\/analyse\//);
});

test("filtre « sans détection » et recherche", () => {
  addHistory({ date: 2, top: "Tomato leaf late blight", confidence: 0.8 });
  addHistory({ date: 1, top: null, confidence: null });
  afficher();

  fireEvent.click(screen.getByRole("button", { name: "Sans détection" }));
  expect(screen.getByText("Aucune détection")).toBeTruthy();
  expect(screen.queryByText("Mildiou de la tomate")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Toutes" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "mildiou" } });
  expect(screen.getByText("Mildiou de la tomate")).toBeTruthy();
  expect(screen.queryByText("Aucune détection")).toBeNull();
});

test("suppression d'une analyse", async () => {
  addHistory({ date: 5, top: "Corn rust leaf", confidence: 0.6 });
  afficher();
  fireEvent.click(screen.getByLabelText(/Supprimer/));
  await waitFor(() => expect(screen.getByText("Aucune analyse pour l'instant")).toBeTruthy());
});

test("la moyenne de confiance est calculée", () => {
  addHistory({ date: 1, top: "a", confidence: 0.4 });
  addHistory({ date: 2, top: "b", confidence: 0.6 });
  afficher();
  expect(screen.getByText("50 %")).toBeTruthy();
});
