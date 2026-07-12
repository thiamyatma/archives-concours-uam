import { describe, expect, it } from "vitest";
import { computeYearCompleteness } from "@/lib/completeness";

describe("computeYearCompleteness", () => {
  it("marks a year complete once all 4 matières x 2 types (8 files) are present", () => {
    const docs = [
      { annee: 2025, matiere: "mathematiques", type: "sujet" },
      { annee: 2025, matiere: "mathematiques", type: "corrige" },
      { annee: 2025, matiere: "physique_chimie", type: "sujet" },
      { annee: 2025, matiere: "physique_chimie", type: "corrige" },
      { annee: 2025, matiere: "anglais", type: "sujet" },
      { annee: 2025, matiere: "anglais", type: "corrige" },
      { annee: 2025, matiere: "logique", type: "sujet" },
      { annee: 2025, matiere: "logique", type: "corrige" },
    ] as const;

    const [result] = computeYearCompleteness([...docs]);

    expect(result.count).toBe(8);
    expect(result.total).toBe(8);
    expect(result.isComplete).toBe(true);
  });

  it("marks a year incomplete when some files are missing", () => {
    const docs = [
      { annee: 2024, matiere: "mathematiques", type: "sujet" },
      { annee: 2024, matiere: "anglais", type: "sujet" },
    ] as const;

    const [result] = computeYearCompleteness([...docs]);

    expect(result.count).toBe(2);
    expect(result.isComplete).toBe(false);
  });

  it("deduplicates the same matière+type submitted twice for a year", () => {
    const docs = [
      { annee: 2023, matiere: "mathematiques", type: "sujet" },
      { annee: 2023, matiere: "mathematiques", type: "sujet" },
    ] as const;

    const [result] = computeYearCompleteness([...docs]);

    expect(result.count).toBe(1);
  });

  it("sorts results by year, most recent first", () => {
    const docs = [
      { annee: 2021, matiere: "logique", type: "sujet" },
      { annee: 2025, matiere: "logique", type: "sujet" },
      { annee: 2023, matiere: "logique", type: "sujet" },
    ] as const;

    const years = computeYearCompleteness([...docs]).map((r) => r.annee);

    expect(years).toEqual([2025, 2023, 2021]);
  });
});
