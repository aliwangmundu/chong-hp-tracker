import { describe, expect, it } from "vitest";
import {
  HP_LIMIT,
  clampExtraHp,
  clampMaxHp,
  clampHp,
  evaluateStatInput,
} from "./inlineMath";

const value = (input: string, current = 27): number => {
  const result = evaluateStatInput(input, current);
  if (!result.ok) throw new Error(`expected success, got "${result.error}"`);
  return result.value;
};

const fails = (input: string, current = 27): boolean =>
  !evaluateStatInput(input, current).ok;

describe("evaluateStatInput — absolute entry", () => {
  it("sets a bare number", () => {
    expect(value("40")).toBe(40);
  });

  it("ignores surrounding whitespace", () => {
    expect(value("  40  ")).toBe(40);
  });

  it("evaluates an expression that does not start with an operator", () => {
    expect(value("40 - 5")).toBe(35);
    expect(value("6*7")).toBe(42);
  });

  it("truncates fractional results toward zero", () => {
    expect(value("7/2")).toBe(3);
    expect(value("0 - 7/2")).toBe(-3);
  });
});

describe("evaluateStatInput — relative entry", () => {
  it("applies a leading minus to the current value", () => {
    expect(value("-25")).toBe(2);
  });

  it("applies a leading plus", () => {
    expect(value("+25")).toBe(52);
  });

  it("chains operators, which the original only half-supported", () => {
    expect(value("-25 + 8")).toBe(10);
    expect(value("-25+8-2")).toBe(8);
  });

  it("supports leading multiply and divide", () => {
    expect(value("*2")).toBe(54);
    expect(value("/3")).toBe(9);
  });

  it("works from a current value of zero", () => {
    expect(value("+12", 0)).toBe(12);
  });
});

describe("evaluateStatInput — precedence and grouping", () => {
  it("multiplies before adding", () => {
    expect(value("2 + 3 * 4")).toBe(14);
  });

  it("honours parentheses", () => {
    expect(value("(2 + 3) * 4")).toBe(20);
    expect(value("(12-4)/2")).toBe(4);
  });

  it("handles nested parentheses", () => {
    expect(value("((1+2)*(3+4))")).toBe(21);
  });

  it("handles a unary minus after an operator", () => {
    expect(value("10 - -5")).toBe(15);
    expect(value("10 * -2")).toBe(-20);
  });

  it("combines relative mode with grouping", () => {
    expect(value("-(10+5)")).toBe(12);
  });
});

describe("evaluateStatInput — rejections", () => {
  it("rejects an empty field", () => {
    expect(fails("")).toBe(true);
    expect(fails("   ")).toBe(true);
  });

  it("rejects letters and dice notation", () => {
    expect(fails("2d6")).toBe(true);
    expect(fails("abc")).toBe(true);
    expect(fails("-2d6+3")).toBe(true);
  });

  it("rejects unbalanced parentheses", () => {
    expect(fails("(2+3")).toBe(true);
    expect(fails("2+3)")).toBe(true);
  });

  it("rejects incomplete expressions", () => {
    expect(fails("5 +")).toBe(true);
    expect(fails("5 * * 2")).toBe(true);
  });

  it("rejects division by zero rather than writing Infinity", () => {
    expect(fails("10/0")).toBe(true);
    expect(fails("/0")).toBe(true);
  });

  it("reports an error instead of silently returning 0", () => {
    const result = evaluateStatInput("oops", 27);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});

describe("clamping", () => {
  it("floors HP at zero", () => {
    expect(clampHp(-14)).toBe(0);
    expect(clampHp(0)).toBe(0);
  });

  it("leaves ordinary HP alone", () => {
    expect(clampHp(27)).toBe(27);
  });

  it("caps HP at the upper limit", () => {
    expect(clampHp(99999)).toBe(HP_LIMIT);
  });

  it("clamps extra and maximum HP the same way", () => {
    expect(clampExtraHp(-5)).toBe(0);
    expect(clampExtraHp(12)).toBe(12);
    expect(clampMaxHp(99999)).toBe(HP_LIMIT);
  });
});
