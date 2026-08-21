import { describe, expect, it } from "vitest";
import { AC_MAX_LENGTH, normalizeAc } from "./ac";

describe("normalizeAc", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeAc("  18 ")).toBe("18");
  });

  it("keeps letters, which is the point of it being text", () => {
    expect(normalizeAc("M")).toBe("M");
    expect(normalizeAc("?")).toBe("?");
  });

  it("caps the length so the bubble never overflows", () => {
    expect(normalizeAc("123456")).toHaveLength(AC_MAX_LENGTH);
  });

  it("treats an empty entry as cleared", () => {
    expect(normalizeAc("   ")).toBe("");
  });
});
