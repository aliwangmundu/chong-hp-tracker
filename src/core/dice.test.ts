import { describe, expect, it } from "vitest";
import { formatTotal, rollExpression, segmentText } from "./dice";

/** Deterministic dice: always the highest face. */
const always = (value: number) => () => value;
const maxFace = (sides: number) => sides;
const minFace = () => 1;

const roll = (input: string, die: (sides: number) => number = always(3)) => {
  const result = rollExpression(input, die);
  if (!result.ok) throw new Error(`expected success, got "${result.error}"`);
  return result;
};

const fails = (input: string): string => {
  const result = rollExpression(input, always(3));
  if (result.ok) throw new Error(`expected failure for "${input}"`);
  return result.error;
};

describe("rolling", () => {
  it("rolls a single die and adds a modifier", () => {
    const result = roll("1d20 + 3", always(2));
    expect(result.total).toBe(5);
    expect(result.text).toBe("1d20 (2) + 3");
  });

  it("treats a bare d20 as one die", () => {
    expect(roll("d20", always(11)).total).toBe(11);
  });

  it("keeps every face of a multi-dice term", () => {
    const result = roll("3d6", always(4));
    expect(result.text).toBe("3d6 (4, 4, 4)");
    expect(result.total).toBe(12);
  });

  it("mixes dice, modifiers and precedence", () => {
    // 3 + 3 + 2 * 3 / 3 → 3 + 3 + 2
    const result = roll("1d20 + 1d4 + 2 * 3 / 3", always(3));
    expect(result.total).toBe(8);
  });

  it("honours brackets", () => {
    expect(roll("(1d4 + 1) * 2", always(3)).total).toBe(8);
  });

  it("handles subtraction and negatives", () => {
    expect(roll("1d6 - 2", always(5)).total).toBe(3);
    expect(roll("-1d6 + 10", always(4)).total).toBe(6);
  });

  it("is case insensitive about the d", () => {
    expect(roll("2D8", always(5)).total).toBe(10);
  });
});

describe("crit and fumble", () => {
  it("flags a die on its highest face", () => {
    const result = roll("1d20 + 5", maxFace);
    expect(result.crit).toBe(true);
    expect(result.fumble).toBe(false);
  });

  it("flags a die on 1", () => {
    const result = roll("1d20", minFace);
    expect(result.fumble).toBe(true);
  });

  it("can flag both across different dice", () => {
    let call = 0;
    const alternating = (sides: number) => (call++ === 0 ? sides : 1);
    const result = roll("1d20 + 1d6", alternating);
    expect(result.crit).toBe(true);
    expect(result.fumble).toBe(true);
  });

  it("does not call a d1 a fumble", () => {
    // Every d1 rolls a 1; treating that as a fumble would be noise.
    const result = roll("1d1", always(1));
    expect(result.fumble).toBe(false);
    expect(result.crit).toBe(true);
  });

  it("ignores plain modifiers when looking for crits", () => {
    expect(roll("1 + 1", always(3)).crit).toBe(false);
  });
});

describe("rejections", () => {
  it("refuses an empty expression", () => {
    expect(fails("")).toMatch(/nothing to roll/);
  });

  it("refuses a die with no size", () => {
    expect(fails("2d")).toMatch(/needs a size/);
  });

  it("refuses unbalanced brackets", () => {
    expect(fails("(1d6 + 2")).toMatch(/unbalanced/);
    expect(fails("1d6)")).toMatch(/unbalanced/);
  });

  it("refuses division by zero", () => {
    expect(fails("1d6 / 0")).toMatch(/divide by zero/);
  });

  it("refuses letters it cannot read", () => {
    expect(fails("1d20 + banana")).toMatch(/cannot roll|not something/);
  });

  it("refuses an unfinished expression", () => {
    expect(fails("1d20 +")).toMatch(/not finished/);
  });

  it("caps the dice per term", () => {
    expect(fails("500d6")).toMatch(/at most 100 dice at a time/);
  });

  it("caps the die size", () => {
    expect(fails("1d5000")).toMatch(/at most d1000/);
  });

  it("caps the dice across the whole roll", () => {
    expect(fails("60d6 + 60d6")).toMatch(/at most 100 dice per roll/);
  });
});

describe("formatting", () => {
  it("leaves whole totals alone", () => {
    expect(formatTotal(5)).toBe("5");
  });

  it("shows a fractional total rather than hiding it", () => {
    expect(formatTotal(7 / 3)).toBe("2.33");
  });

  it("renders a dice segment with its faces", () => {
    const result = roll("2d6", always(2));
    expect(segmentText(result.segments[0]!)).toBe("2d6 (2, 2)");
  });
});
