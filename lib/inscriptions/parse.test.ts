import { describe, expect, it } from "vitest";
import { parseInscriptionsInput } from "@/lib/inscriptions/parse";

describe("parseInscriptionsInput", () => {
  it("parse des lignes séparées par des virgules", () => {
    const result = parseInscriptionsInput(
      "DIOP Fatou Awa,fatou.diop@example.com\nSARR Moussa,moussa.sarr@example.com"
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { nom: "DIOP Fatou Awa", email: "fatou.diop@example.com" },
      { nom: "SARR Moussa", email: "moussa.sarr@example.com" },
    ]);
  });

  it("accepte le point-virgule et la tabulation comme séparateurs", () => {
    const result = parseInscriptionsInput(
      "DIOP Fatou;fatou@example.com\nSARR Moussa\tmoussa@example.com"
    );
    expect(result.rows).toHaveLength(2);
  });

  it("ignore une ligne d'en-tête en première position", () => {
    const result = parseInscriptionsInput("nom,email\nDIOP Fatou,fatou@example.com");
    expect(result.rows).toEqual([{ nom: "DIOP Fatou", email: "fatou@example.com" }]);
    expect(result.errors).toEqual([]);
  });

  it("ignore les lignes vides", () => {
    const result = parseInscriptionsInput(
      "DIOP Fatou,fatou@example.com\n\n   \nSARR Moussa,moussa@example.com"
    );
    expect(result.rows).toHaveLength(2);
  });

  it("signale une ligne sans email valide sans bloquer les autres", () => {
    const result = parseInscriptionsInput(
      "DIOP Fatou,pas-un-email\nSARR Moussa,moussa@example.com"
    );
    expect(result.rows).toEqual([{ nom: "SARR Moussa", email: "moussa@example.com" }]);
    expect(result.errors).toEqual(['Ligne 1 : email invalide ("pas-un-email").']);
  });

  it("signale une ligne sans nom", () => {
    const result = parseInscriptionsInput(",fatou@example.com");
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual(["Ligne 1 : nom manquant."]);
  });

  it("signale une ligne à une seule colonne", () => {
    const result = parseInscriptionsInput("DIOP Fatou");
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual(['Ligne 1 : format invalide (attendu "nom,email").']);
  });

  it("renvoie un résultat vide pour un texte vide", () => {
    const result = parseInscriptionsInput("");
    expect(result).toEqual({ rows: [], errors: [] });
  });
});
