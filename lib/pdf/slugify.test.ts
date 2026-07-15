import { describe, expect, it } from "vitest";
import { buildDocumentStoragePath, slugifyFileName } from "./slugify";

describe("slugifyFileName", () => {
  it("strips accents, lowercases, and replaces separators with hyphens", () => {
    expect(slugifyFileName("Épreuve Générale 2025.pdf")).toBe("epreuve-generale-2025");
  });

  it("collapses repeated separators and trims leading/trailing hyphens", () => {
    expect(slugifyFileName("  Nom__Document -- Final  .pdf")).toBe("nom-document-final");
  });

  it("falls back to a default when nothing alphanumeric remains", () => {
    expect(slugifyFileName("???.pdf")).toBe("document");
  });
});

describe("buildDocumentStoragePath", () => {
  it("sorts department codes and joins them regardless of input order", () => {
    expect(
      buildDocumentStoragePath(["dstaan", "dsti", "dgae"], 2025, "Nom Document.pdf")
    ).toBe("dgae-dstaan-dsti/2025/nom-document.pdf");
  });

  it("handles a single department", () => {
    expect(buildDocumentStoragePath(["dgo"], 2024, "Concours.pdf")).toBe(
      "dgo/2024/concours.pdf"
    );
  });
});
