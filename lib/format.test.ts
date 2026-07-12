import { describe, expect, it } from "vitest";
import { formatFileSize, formatNumber } from "@/lib/format";

describe("formatFileSize", () => {
  it("returns 0 Ko for zero or negative values", () => {
    expect(formatFileSize(0)).toBe("0 Ko");
    expect(formatFileSize(-10)).toBe("0 Ko");
  });

  it("formats bytes into the closest unit", () => {
    expect(formatFileSize(500)).toBe("500 o");
    expect(formatFileSize(1024)).toBe("1.0 Ko");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 Mo");
  });
});

describe("formatNumber", () => {
  it("formats using French thousands separator", () => {
    // Intl inserts a narrow no-break space (U+202F) as the French group separator.
    expect(formatNumber(1234)).toBe("1 234");
  });
});
