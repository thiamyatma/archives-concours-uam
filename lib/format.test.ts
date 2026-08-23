import { describe, expect, it } from "vitest";
import { formatCount, formatFileSize, formatNumber } from "@/lib/format";

const NARROW_NO_BREAK_SPACE = String.fromCharCode(0x202f);

describe("formatNumber", () => {
  it("formats using French thousands separator", () => {
    // Intl inserts a narrow no-break space (U+202F) as the French group separator.
    expect(formatNumber(1234)).toBe(`1${NARROW_NO_BREAK_SPACE}234`);
  });
});

describe("formatCount", () => {
  it("renders null as a dash, never as zero", () => {
    // Distinction essentielle : une lecture Supabase impossible ne doit pas
    // s'afficher comme un compteur réellement vide.
    expect(formatCount(null)).toBe("—");
  });

  it("keeps a real zero distinct from an unavailable count", () => {
    expect(formatCount(0)).toBe("0");
  });

  it("formats numbers like formatNumber", () => {
    expect(formatCount(1234)).toBe(`1${NARROW_NO_BREAK_SPACE}234`);
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
