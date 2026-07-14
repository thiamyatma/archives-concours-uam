import { describe, expect, it } from "vitest";
import { repairLatexEscapes } from "./repair-latex";

const TAB = String.fromCharCode(9); // \t   -> consumed from \times
const FORM_FEED = String.fromCharCode(12); // \f -> consumed from \frac
const VERTICAL_TAB = String.fromCharCode(11); // \v -> consumed from \vec
const BELL = String.fromCharCode(7); // \a   -> consumed from \approx / \alpha
const BACKSPACE = String.fromCharCode(8); // \b -> consumed from \begin

describe("repairLatexEscapes", () => {
  it("repairs a TAB back into \\t (real case: \\times)", () => {
    const input = `$m = 6,64 ${TAB}imes 10^{-27}$`;
    expect(repairLatexEscapes(input)).toBe("$m = 6,64 \\times 10^{-27}$");
  });

  it("repairs a FORM FEED back into \\f (real case: \\frac)", () => {
    const input = `$${FORM_FEED}rac{d^2q}{dt^2} + 0,004q = 0$`;
    expect(repairLatexEscapes(input)).toBe("$\\frac{d^2q}{dt^2} + 0,004q = 0$");
  });

  it("repairs a VERTICAL TAB back into \\v (real case: \\vec)", () => {
    const input = `$${VERTICAL_TAB}ec{V_0}$`;
    expect(repairLatexEscapes(input)).toBe("$\\vec{V_0}$");
  });

  it("repairs a BELL back into \\a (real case: \\approx)", () => {
    const input = `$\\tan(5^\\circ) ${BELL}pprox 0,1$`;
    expect(repairLatexEscapes(input)).toBe("$\\tan(5^\\circ) \\approx 0,1$");
  });

  it("repairs a BACKSPACE back into \\b (real case: \\begin)", () => {
    const input = `$A = ${BACKSPACE}egin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$`;
    expect(repairLatexEscapes(input)).toBe(
      "$A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$"
    );
  });

  it("repairs multiple math spans on the same line independently", () => {
    const input = `1. $q = ${TAB}imes 2$ et $r = ${FORM_FEED}rac{1}{2}$`;
    expect(repairLatexEscapes(input)).toBe("1. $q = \\times 2$ et $r = \\frac{1}{2}$");
  });

  it("supports $$...$$ display-math spans", () => {
    const input = `$$E = ${FORM_FEED}rac{1}{2}mv^2$$`;
    expect(repairLatexEscapes(input)).toBe("$$E = \\frac{1}{2}mv^2$$");
  });

  it("never touches a control character outside a math span", () => {
    // A stray TAB used as real indentation (not inside $...$) must survive untouched.
    const input = `line one\n${TAB}indented continuation`;
    expect(repairLatexEscapes(input)).toBe(input);
  });

  it("leaves already-correct LaTeX (no control characters) unchanged", () => {
    const input = "$R = \\frac{hc}{E_0}$";
    expect(repairLatexEscapes(input)).toBe(input);
  });
});
