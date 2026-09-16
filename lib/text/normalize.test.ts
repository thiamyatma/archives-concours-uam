import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "@/lib/text/normalize";

describe("normalizeSearchText", () => {
  it("ignore la casse et les accents", () => {
    expect(normalizeSearchText("SÉNÉGAl")).toBe("senegal");
  });

  it("réduit les espaces superflus", () => {
    expect(normalizeSearchText("  Sarah   Mawouli  Adelan ")).toBe(
      "sarah mawouli adelan"
    );
  });
});
