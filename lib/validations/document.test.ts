import { describe, expect, it } from "vitest";
import { adminRejectSchema, libraryFiltersSchema } from "@/lib/validations/document";

describe("libraryFiltersSchema", () => {
  it("defaults page to 1 and coerces string query params to numbers", () => {
    const result = libraryFiltersSchema.parse({ annee: "2024", page: "3" });

    expect(result.annee).toBe(2024);
    expect(result.page).toBe(3);
  });

  it("defaults page to 1 when absent", () => {
    const result = libraryFiltersSchema.parse({});
    expect(result.page).toBe(1);
  });

  it("rejects an invalid matiere value", () => {
    const result = libraryFiltersSchema.safeParse({ matiere: "chimie" });
    expect(result.success).toBe(false);
  });
});

describe("adminRejectSchema", () => {
  it("requires a rejection reason of at least 5 characters", () => {
    const tooShort = adminRejectSchema.safeParse({
      documentId: "00000000-0000-0000-0000-000000000000",
      reason: "no",
    });
    expect(tooShort.success).toBe(false);

    const valid = adminRejectSchema.safeParse({
      documentId: "00000000-0000-0000-0000-000000000000",
      reason: "Document illisible",
    });
    expect(valid.success).toBe(true);
  });
});
