import { describe, expect, it, vi } from "vitest";
import { parseQcmFilters } from "@/lib/qcm/analytics-schema";

describe("parseQcmFilters", () => {
  it("accepte la forme envoyée par le hook client (null explicites)", () => {
    // Régression : `annee: null` passait dans Number(null) === 0 et faisait
    // échouer TOUT le parse — chaque changement de filtre interactif
    // renvoyait alors des données non filtrées.
    const result = parseQcmFilters({
      departement: "dsti",
      annee: null,
      matiere: null,
      period: "week",
    });
    expect(result).toEqual({
      departement: "dsti",
      annee: null,
      matiere: null,
      period: "week",
    });
  });

  it("accepte la forme searchParams du premier rendu (undefined/chaînes)", () => {
    const result = parseQcmFilters({
      departement: "dgo",
      annee: "2024",
      period: "month",
    });
    expect(result).toEqual({
      departement: "dgo",
      annee: 2024,
      matiere: null,
      period: "month",
    });
  });

  it("normalise '' et 'all' en null", () => {
    const result = parseQcmFilters({
      departement: "all",
      annee: "",
      matiere: "all",
      period: "all",
    });
    expect(result).toEqual({
      departement: null,
      annee: null,
      matiere: null,
      period: "all",
    });
  });

  it("retombe sans filtre (avec log) sur une entrée réellement invalide", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = parseQcmFilters({ annee: 1800, period: "week" });
    expect(result).toEqual({
      departement: null,
      annee: null,
      matiere: null,
      period: "all",
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("gère une entrée absente", () => {
    expect(parseQcmFilters(undefined)).toEqual({
      departement: null,
      annee: null,
      matiere: null,
      period: "all",
    });
  });
});
