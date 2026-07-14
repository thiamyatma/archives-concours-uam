import { describe, expect, it } from "vitest";
import { aggregateManifest, type DepartementManifestEntry } from "./manifest";

const entry = (code: string, annees: number[]): DepartementManifestEntry => ({
  code,
  nom: code.toUpperCase(),
  description: "",
  annees,
});

describe("aggregateManifest", () => {
  it("counts departements and sums sessions across all of them", () => {
    const result = aggregateManifest([
      entry("dsti", [2025, 2024]),
      entry("dgae", [2025, 2024]),
      entry("du2adt", [2025]),
    ]);
    expect(result.totalDepartements).toBe(3);
    expect(result.totalSessions).toBe(5);
  });

  it("counts a shared session once per department (real URLs, not distinct files)", () => {
    const result = aggregateManifest([
      entry("dsti", [2025]),
      entry("dgae", [2025]),
      entry("dstaan", [2025]),
    ]);
    expect(result.totalSessions).toBe(3);
  });

  it("computes latestAnnee as the max literal year across all departements", () => {
    const result = aggregateManifest([
      entry("dsti", [2022, 2021]),
      entry("dgo", [2025, 2019]),
    ]);
    expect(result.latestAnnee).toBe(2025);
  });

  it("returns latestAnnee null when no departement has any année", () => {
    const result = aggregateManifest([entry("dsti", []), entry("dgo", [])]);
    expect(result.latestAnnee).toBeNull();
    expect(result.totalSessions).toBe(0);
  });
});
