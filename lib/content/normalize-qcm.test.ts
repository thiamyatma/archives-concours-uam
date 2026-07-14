import { describe, expect, it } from "vitest";
import { insertHardLineBreaksForListContinuations } from "./normalize-qcm";

describe("insertHardLineBreaksForListContinuations", () => {
  it("hard-breaks a question stem followed by indented A/B/C/D options", () => {
    const input = [
      "1. Quelle est la valeur ?",
      "   A. 1",
      "   B. 2",
      "   C. 3",
      "   D. 4",
    ].join("\n");
    const result = insertHardLineBreaksForListContinuations(input);
    expect(result).toBe(
      [
        "1. Quelle est la valeur ?  ",
        "   A. 1  ",
        "   B. 2  ",
        "   C. 3  ",
        "   D. 4",
      ].join("\n")
    );
  });

  it("hard-breaks a trailing '_Données: ...' note right after the last option", () => {
    const input = ["   C. 36 m/s", "   D. 6 m/s", "    _Données: g = 10 m/s²._"].join(
      "\n"
    );
    const result = insertHardLineBreaksForListContinuations(input);
    expect(result).toBe(
      ["   C. 36 m/s  ", "   D. 6 m/s  ", "    _Données: g = 10 m/s²._"].join("\n")
    );
  });

  it("does not touch a line already followed by a blank line", () => {
    const input = ["1. Stem", "", "   A. Option"].join("\n");
    expect(insertHardLineBreaksForListContinuations(input)).toBe(input);
  });

  it("does not touch a line already hard-broken", () => {
    const input = ["1. Stem  ", "   A. Option"].join("\n");
    expect(insertHardLineBreaksForListContinuations(input)).toBe(input);
  });

  it("leaves column-0 bullet lists (en-tête) untouched", () => {
    const input = [
      "**Départements :**",
      "",
      "- Sciences Agricoles",
      "- Génie des Procédés",
    ].join("\n");
    expect(insertHardLineBreaksForListContinuations(input)).toBe(input);
  });

  it("skips fenced code blocks", () => {
    const input = ["```", "line one", "    indented line", "```"].join("\n");
    expect(insertHardLineBreaksForListContinuations(input)).toBe(input);
  });

  it("does not add a break on the last line even if it would otherwise qualify", () => {
    const input = "   D. Dernière option";
    expect(insertHardLineBreaksForListContinuations(input)).toBe(input);
  });
});
