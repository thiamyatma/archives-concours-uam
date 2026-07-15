import { describe, expect, it } from "vitest";
import { formatFileSize, formatNumber } from "@/lib/format";

const NARROW_NO_BREAK_SPACE = String.fromCharCode(0x202f);

describe("formatNumber", () => {
  it("formats using French thousands separator", () => {
    // Intl inserts a narrow no-break space (U+202F) as the French group separator.
    expect(formatNumber(1234)).toBe(`1${NARROW_NO_BREAK_SPACE}234`);
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(512)).toBe("512 o");
  });

  it("formats kilobytes and megabytes with one decimal, trimmed if whole", () => {
    expect(formatFileSize(1536)).toBe("1.5 Ko");
    expect(formatFileSize(9_437_184)).toBe("9 Mo");
  });

  it("treats zero/negative as 0 o", () => {
    expect(formatFileSize(0)).toBe("0 o");
  });
});
