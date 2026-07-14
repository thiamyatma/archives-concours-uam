import { describe, expect, it } from "vitest";
import { getClientIp } from "./client-ip";

describe("getClientIp", () => {
  it("uses the last x-forwarded-for entry (the one appended by the trusted edge)", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(headers)).toBe("5.6.7.8");
  });

  it("cannot be spoofed by a client-supplied single-value x-forwarded-for alone", () => {
    const headers = new Headers({ "x-forwarded-for": "9.9.9.9" });
    expect(getClientIp(headers)).toBe("9.9.9.9");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers = new Headers({ "x-real-ip": "10.0.0.1" });
    expect(getClientIp(headers)).toBe("10.0.0.1");
  });

  it("returns unknown when no IP header is present", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
