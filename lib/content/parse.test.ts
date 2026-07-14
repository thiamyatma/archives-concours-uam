import { describe, expect, it } from "vitest";
import { parseConcoursMarkdown } from "./parse";

const SAMPLE = `# Concours d'Entrée - Édition 2025

## ECOLE SUPERIEURE POLYTECHNIQUE DE DIAMNIADIO

### UNIVERSITÉ AMADOU MAHTAR MBOW DE DAKAR

**Durée:** 3 heures

---

## ÉPREUVE DE PHYSIQUE - CHIMIE

1. Question de physique...
   A. Réponse A
   B. Réponse B

## ÉPREUVE DE MATHEMATIQUES

21. Question de maths...
    A. Réponse A

## ÉPREUVE D'ANGLAIS

Some passage text.

### QUESTIONS

41. Question d'anglais...

## ÉPREUVE DE LOGIQUE

61. Question de logique...
`;

describe("parseConcoursMarkdown", () => {
  it("extracts the title from the first H1", () => {
    expect(parseConcoursMarkdown(SAMPLE).title).toBe("Concours d'Entrée - Édition 2025");
  });

  it("extracts the en-tête as everything before the first ÉPREUVE heading", () => {
    const { enTete } = parseConcoursMarkdown(SAMPLE);
    expect(enTete).toContain("ECOLE SUPERIEURE POLYTECHNIQUE");
    expect(enTete).toContain("Durée");
    expect(enTete).not.toContain("ÉPREUVE DE PHYSIQUE");
  });

  it("splits into one section per ÉPREUVE heading, in document order", () => {
    const { sections } = parseConcoursMarkdown(SAMPLE);
    expect(sections.map((s) => s.title)).toEqual([
      "ÉPREUVE DE PHYSIQUE - CHIMIE",
      "ÉPREUVE DE MATHEMATIQUES",
      "ÉPREUVE D'ANGLAIS",
      "ÉPREUVE DE LOGIQUE",
    ]);
  });

  it("keeps a section's own content (including nested ### subheadings) without bleeding into the next section", () => {
    const { sections } = parseConcoursMarkdown(SAMPLE);
    const anglais = sections.find((s) => s.title === "ÉPREUVE D'ANGLAIS");
    expect(anglais?.markdown).toContain("### QUESTIONS");
    expect(anglais?.markdown).toContain("41. Question d'anglais");
    expect(anglais?.markdown).not.toContain("ÉPREUVE DE LOGIQUE");
  });

  it("the last section runs to the end of the document", () => {
    const { sections } = parseConcoursMarkdown(SAMPLE);
    const logique = sections.find((s) => s.title === "ÉPREUVE DE LOGIQUE");
    expect(logique?.markdown).toContain("61. Question de logique");
  });

  it("returns no sections and the whole text as en-tête when there is no ÉPREUVE heading", () => {
    const result = parseConcoursMarkdown("# Titre seul\n\nAucune épreuve ici.");
    expect(result.sections).toEqual([]);
    expect(result.enTete).toContain("Aucune épreuve ici.");
  });
});
