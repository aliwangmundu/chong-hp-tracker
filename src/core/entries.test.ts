import { describe, expect, it } from "vitest";
import { stepDurations, withEntry, withoutEntry } from "./entries";
import type { Condition } from "./types";

const conditions: Condition[] = [
  { id: "a", name: "Poisoned", duration: 3 },
  { id: "b", name: "Prone", duration: 1 },
  { id: "c", name: "Blinded", duration: 0 },
];

describe("stepDurations", () => {
  it("counts every condition down by one", () => {
    expect(stepDurations(conditions, -1).map((c) => c.duration)).toEqual([
      2, 0, 0,
    ]);
  });

  it("floors at zero rather than going negative", () => {
    expect(stepDurations(conditions, -5).map((c) => c.duration)).toEqual([
      0, 0, 0,
    ]);
  });

  it("counts back up when the round is stepped backwards", () => {
    expect(stepDurations(conditions, 1).map((c) => c.duration)).toEqual([
      4, 2, 1,
    ]);
  });

  it("keeps expired conditions in the list", () => {
    expect(stepDurations(conditions, -1)).toHaveLength(3);
  });

  it("leaves the original list alone", () => {
    stepDurations(conditions, -1);
    expect(conditions[0]?.duration).toBe(3);
  });
});

describe("withEntry", () => {
  it("patches only the matching entry", () => {
    const next = withEntry(conditions, "b", { name: "Restrained" });
    expect(next[1]?.name).toBe("Restrained");
    expect(next[0]?.name).toBe("Poisoned");
  });

  it("is a no-op for an unknown id", () => {
    expect(withEntry(conditions, "zzz", { name: "x" })).toEqual(conditions);
  });
});

describe("withoutEntry", () => {
  it("removes the matching entry", () => {
    expect(withoutEntry(conditions, "a").map((c) => c.id)).toEqual(["b", "c"]);
  });
});
