import { describe, expect, it } from "vitest";
import { errorMessage } from "./api";
import { STRINGS } from "../i18n";

describe("errorMessage", () => {
  it("formate une erreur HTTP", () => {
    expect(errorMessage({ response: { status: 400, data: { detail: "image invalide" } } })).toBe("400 — image invalide");
  });
  it("gère le serveur injoignable", () => {
    expect(errorMessage({})).toBe("Serveur injoignable");
  });
});

describe("i18n", () => {
  it("fr et derja ont les mêmes clés", () => {
    expect(Object.keys(STRINGS.derja).sort()).toEqual(Object.keys(STRINGS.fr).sort());
  });
});
