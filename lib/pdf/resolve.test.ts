import { describe, expect, it } from "vitest";
import { buildDownloadFileName, candidatePdfPaths } from "./resolve";

describe("candidatePdfPaths", () => {
  it("returns own-dir then shared-group dir for a department in a shared group", () => {
    expect(
      candidatePdfPaths({ code: "dsti", contentGroup: "dsti-dgae-dstaan" }, 2025)
    ).toEqual(["dsti/2025.pdf", "dsti-dgae-dstaan/2025.pdf"]);
  });

  it("returns a single entry when the department has no distinct shared group", () => {
    expect(candidatePdfPaths({ code: "du2adt", contentGroup: "du2adt" }, 2024)).toEqual([
      "du2adt/2024.pdf",
    ]);
  });
});

describe("buildDownloadFileName", () => {
  it("uppercases the department code and appends the year", () => {
    expect(buildDownloadFileName("dsti", 2025)).toBe("DSTI_2025.pdf");
  });

  it("handles an already-uppercase code", () => {
    expect(buildDownloadFileName("DGO", 2024)).toBe("DGO_2024.pdf");
  });
});
