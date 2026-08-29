import { describe, expect, it } from "vitest";
import { parseAdjustment } from "./adjust";

describe("parseAdjustment", () => {
  it("reads a negative amount", () => {
    expect(parseAdjustment("-5")).toBe(-5);
  });

  it("reads a positive amount", () => {
    expect(parseAdjustment("+8")).toBe(8);
  });

  it("tolerates a space after the sign", () => {
    expect(parseAdjustment("- 5")).toBe(-5);
  });

  it("ignores surrounding whitespace", () => {
    expect(parseAdjustment("  +8 ")).toBe(8);
  });

  it("refuses an unsigned number", () => {
    // 15 could mean fifteen damage or fifteen healing; guessing is how a
    // character loses a fight to a stray click.
    expect(parseAdjustment("15")).toBe(null);
  });

  it("refuses an ordinary armour class", () => {
    expect(parseAdjustment("18")).toBe(null);
  });

  it("refuses letters", () => {
    expect(parseAdjustment("M")).toBe(null);
  });

  it("refuses an empty field", () => {
    expect(parseAdjustment("")).toBe(null);
    expect(parseAdjustment("   ")).toBe(null);
  });

  it("refuses a bare sign", () => {
    expect(parseAdjustment("+")).toBe(null);
  });
});
