import { describe, expect, it } from "vitest";
import { corrigerQcm } from "@/lib/qcm/scoring";
import type { QcmQuestion } from "@/lib/qcm/types";

function question(
  overrides: Partial<QcmQuestion> & Pick<QcmQuestion, "numero">
): QcmQuestion {
  return {
    question: `Question ${overrides.numero}`,
    propositions: { A: "a", B: "b", C: "c", D: "d" },
    bonne_reponse: "A",
    reponse_candidat: null,
    resultat: null,
    justification: "Justification.",
    concept: "Concept générique",
    difficulte: "Moyenne",
    ...overrides,
  };
}

describe("corrigerQcm", () => {
  it("marque chaque question Correct/Incorrect selon la réponse du candidat", () => {
    const questions = [
      question({ numero: 1, bonne_reponse: "A" }),
      question({ numero: 2, bonne_reponse: "B" }),
    ];
    const reponses = new Map<number, "A" | "B" | "C" | "D">([
      [1, "A"],
      [2, "C"],
    ]);

    const result = corrigerQcm("Mathématiques", questions, reponses);

    expect(result.questions[0].resultat).toBe("Correct");
    expect(result.questions[1].resultat).toBe("Incorrect");
  });

  it("laisse resultat à null pour une question sans réponse", () => {
    const questions = [question({ numero: 1, bonne_reponse: "A" })];
    const result = corrigerQcm("Mathématiques", questions, new Map());

    expect(result.questions[0].reponse_candidat).toBeNull();
    expect(result.questions[0].resultat).toBeNull();
  });

  it("calcule score, pourcentage et niveau", () => {
    const questions = [1, 2, 3, 4].map((n) =>
      question({ numero: n, bonne_reponse: "A" })
    );
    const reponses = new Map<number, "A" | "B" | "C" | "D">([
      [1, "A"],
      [2, "A"],
      [3, "A"],
      [4, "B"],
    ]);

    const result = corrigerQcm("Physique-Chimie", questions, reponses);

    expect(result.resume.score).toBe(3);
    expect(result.resume.pourcentage).toBe(75);
    expect(result.resume.niveau).toBe("Bon");
    expect(result.resume.commentaire).toContain("Physique-Chimie");
  });

  it.each([
    [100, "Excellent"],
    [90, "Excellent"],
    [85, "Très bon"],
    [80, "Très bon"],
    [75, "Bon"],
    [70, "Bon"],
    [60, "Moyen"],
    [50, "Moyen"],
    [49, "À renforcer"],
    [0, "À renforcer"],
  ])("pourcentage %i%% -> niveau %s", (pourcentage, niveauAttendu) => {
    const total = 100;
    const nombreCorrect = pourcentage;
    const questions = Array.from({ length: total }, (_, i) =>
      question({ numero: i + 1, bonne_reponse: "A" })
    );
    const reponses = new Map<number, "A" | "B" | "C" | "D">(
      questions.map((q, i) => [q.numero, i < nombreCorrect ? "A" : "B"])
    );

    const result = corrigerQcm("Test", questions, reponses);

    expect(result.resume.pourcentage).toBe(pourcentage);
    expect(result.resume.niveau).toBe(niveauAttendu);
  });

  it("priorise les chapitres à revoir par poids d'erreur (difficulté) puis ordre alphabétique", () => {
    const questions = [
      question({
        numero: 1,
        bonne_reponse: "A",
        concept: "Probabilités",
        difficulte: "Facile",
      }),
      question({
        numero: 2,
        bonne_reponse: "A",
        concept: "Dynamique",
        difficulte: "Difficile",
      }),
      question({
        numero: 3,
        bonne_reponse: "A",
        concept: "Chimie organique",
        difficulte: "Facile",
      }),
    ];
    // Toutes ratées (candidat répond B partout).
    const reponses = new Map<number, "A" | "B" | "C" | "D">([
      [1, "B"],
      [2, "B"],
      [3, "B"],
    ]);

    const result = corrigerQcm("Physique-Chimie", questions, reponses);

    expect(result.resume.chapitres_a_revoir).toEqual([
      "Dynamique",
      "Chimie organique",
      "Probabilités",
    ]);
  });

  it("ne liste aucun chapitre à revoir si tout est correct", () => {
    const questions = [question({ numero: 1, bonne_reponse: "A", concept: "Dynamique" })];
    const reponses = new Map<number, "A" | "B" | "C" | "D">([[1, "A"]]);

    const result = corrigerQcm("Physique", questions, reponses);

    expect(result.resume.chapitres_a_revoir).toEqual([]);
  });
});
