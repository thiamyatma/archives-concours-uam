import { describe, expect, it } from "vitest";
import { candidateContentPaths, mergeAndSortYears } from "./resolve";

describe("mergeAndSortYears", () => {
  it("dedupes years present in both own and shared lists", () => {
    expect(mergeAndSortYears([2024], [2025, 2024])).toEqual([2025, 2024]);
  });

  it("sorts descending", () => {
    expect(mergeAndSortYears([2020], [2025, 2022])).toEqual([2025, 2022, 2020]);
  });

  it("handles empty inputs", () => {
    expect(mergeAndSortYears([], [])).toEqual([]);
  });
});

describe("candidateContentPaths", () => {
  it("returns own-dir then shared-group dir for a department in a shared group", () => {
    expect(
      candidateContentPaths({ code: "dsti", contentGroup: "dsti-dgae-dstaan" })
    ).toEqual(["dsti", "dsti-dgae-dstaan"]);
  });

  it("returns a single entry (no duplicate) when the department has no distinct shared group", () => {
    expect(candidateContentPaths({ code: "du2adt", contentGroup: "du2adt" })).toEqual([
      "du2adt",
    ]);
  });
});
