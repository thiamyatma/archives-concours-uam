import { describe, expect, it } from "vitest";
import { formatNumber } from "@/lib/format";

const NARROW_NO_BREAK_SPACE = String.fromCharCode(0x202f);

describe("formatNumber", () => {
  it("formats using French thousands separator", () => {
    // Intl inserts a narrow no-break space (U+202F) as the French group separator.
    expect(formatNumber(1234)).toBe(`1${NARROW_NO_BREAK_SPACE}234`);
  });
});
