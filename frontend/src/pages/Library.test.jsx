import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

vi.mock("../LangContext", () => ({ useLang: () => ({ lang: "fr", t: (k) => k }) }));
import Library from "./Library";

const afficher = () => render(<MemoryRouter><Library /></MemoryRouter>);

test("liste les 29 fiches et filtre par culture", () => {
  afficher();
  expect(screen.getByText("29 fiches")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Tomate" }));
  expect(screen.getByText("9 fiches")).toBeTruthy();
  expect(screen.getByText("Mildiou de la tomate")).toBeTruthy();
  expect(screen.queryByText("Black rot de la vigne")).toBeNull();
});

test("recherche par nom de maladie", () => {
  afficher();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "oïdium" } });
  expect(screen.getByText("Oïdium de la courge")).toBeTruthy();
  expect(screen.getByText("1 fiche")).toBeTruthy();
});

test("message clair quand rien ne correspond", () => {
  afficher();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzzz" } });
  expect(screen.getByText(/Aucune fiche/)).toBeTruthy();
});
