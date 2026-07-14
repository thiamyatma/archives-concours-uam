import { describe, expect, it } from "vitest";
import {
  clampPage,
  ELLIPSIS,
  getPageCount,
  getPageNumbers,
  getPageRange,
} from "@/lib/pagination";

describe("getPageCount", () => {
  it("rounds up to the nearest full page", () => {
    expect(getPageCount(41, 20)).toBe(3);
    expect(getPageCount(40, 20)).toBe(2);
  });

  it("always returns at least 1, even with zero results", () => {
    expect(getPageCount(0, 20)).toBe(1);
  });
});

describe("clampPage", () => {
  it("clamps negative, zero, or NaN pages to 1", () => {
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(-5, 10)).toBe(1);
    expect(clampPage(Number.NaN, 10)).toBe(1);
  });

  it("clamps a page beyond pageCount down to pageCount", () => {
    expect(clampPage(999, 10)).toBe(10);
  });

  it("leaves an in-range page untouched", () => {
    expect(clampPage(4, 10)).toBe(4);
  });
});

describe("getPageRange", () => {
  it("computes 0-indexed inclusive LIMIT/OFFSET bounds", () => {
    expect(getPageRange(1, 20)).toEqual({ from: 0, to: 19 });
    expect(getPageRange(2, 20)).toEqual({ from: 20, to: 39 });
    expect(getPageRange(3, 12)).toEqual({ from: 24, to: 35 });
  });

  it("treats a sub-1 page as page 1", () => {
    expect(getPageRange(0, 20)).toEqual({ from: 0, to: 19 });
  });
});

describe("getPageNumbers", () => {
  it("returns an empty array for zero total pages", () => {
    expect(getPageNumbers(1, 0)).toEqual([]);
  });

  it("returns every page when there are few enough to show without ellipsis", () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("shows a right ellipsis near the start", () => {
    expect(getPageNumbers(1, 20)).toEqual([1, 2, ELLIPSIS, 20]);
  });

  it("shows a left ellipsis near the end", () => {
    expect(getPageNumbers(20, 20)).toEqual([1, ELLIPSIS, 19, 20]);
  });

  it("shows both ellipses when the current page is in the middle", () => {
    expect(getPageNumbers(10, 20)).toEqual([1, ELLIPSIS, 9, 10, 11, ELLIPSIS, 20]);
  });

  it("widens the visible window with a larger siblingCount", () => {
    expect(getPageNumbers(10, 20, 2)).toEqual([
      1,
      ELLIPSIS,
      8,
      9,
      10,
      11,
      12,
      ELLIPSIS,
      20,
    ]);
  });

  it("clamps an out-of-range current page before computing the window", () => {
    expect(getPageNumbers(999, 20)).toEqual(getPageNumbers(20, 20));
  });
});
