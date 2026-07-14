import { describe, expect, it } from "vitest";
import { parseConsent, readConsent } from "./consent";

describe("parseConsent", () => {
  it("accepts the two valid consent values", () => {
    expect(parseConsent("granted")).toBe("granted");
    expect(parseConsent("denied")).toBe("denied");
  });

  it("maps a missing value to null (no choice yet)", () => {
    expect(parseConsent(null)).toBeNull();
  });

  it("maps any unexpected value to null", () => {
    expect(parseConsent("maybe")).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent("GRANTED")).toBeNull();
  });
});

describe("readConsent (server-side)", () => {
  it("returns null when window is undefined (SSR / node)", () => {
    // Le suite vitest tourne en environnement node : `window` n'existe pas,
    // ce qui vérifie la garde SSR de readConsent.
    expect(readConsent()).toBeNull();
  });
});
