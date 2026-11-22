import { describe, expect, it } from "vitest";
import { errorMessage } from "./api";
import { STRINGS } from "../i18n";

describe("errorMessage", () => {
  it("formate une erreur HTTP", () => {
    const msg = errorMessage({ response: { status: 400, data: { detail: "image invalide" } } });
    expect(msg).toContain("400");
    expect(msg).toContain("image invalide");
  });
  it("gere le serveur injoignable", () => {
    expect(errorMessage({})).toBe("Serveur injoignable");
  });
});

describe("i18n", () => {
  it("fr et derja ont les memes cles", () => {
    expect(Object.keys(STRINGS.derja).sort()).toEqual(Object.keys(STRINGS.fr).sort());
  });
});
