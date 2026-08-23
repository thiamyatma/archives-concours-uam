import { describe, expect, it } from "vitest";
import { publicCount } from "@/config/stats-snapshot";

describe("publicCount", () => {
  it("falls back to the snapshot when the live read failed", () => {
    expect(publicCount(null, 2315)).toBe(2315);
  });

  it("uses the live value when there is no snapshot", () => {
    expect(publicCount(42, null)).toBe(42);
  });

  it("prefers the live value once it exceeds the snapshot", () => {
    expect(publicCount(2400, 2315)).toBe(2400);
  });

  it("never lets a public counter go back down", () => {
    // Cas réel visé : le service revient et la base compte plus étroitement
    // que la source de l'instantané. Sans plancher, le total affiché aux
    // candidats chuterait sous un chiffre déjà publié.
    expect(publicCount(1200, 2315)).toBe(2315);
  });

  it("reports nothing when neither source is usable", () => {
    expect(publicCount(null, null)).toBeNull();
  });

  it("treats a real zero as a value, not as a missing read", () => {
    expect(publicCount(0, null)).toBe(0);
  });
});
