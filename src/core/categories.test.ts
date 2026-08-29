import { describe, expect, it } from "vitest";
import {
  CATEGORIES_KEY,
  moveCategory,
  newCategory,
  parseCategories,
  withCategory,
  withoutCategory,
} from "./categories";

const categories = [
  { id: "a", name: "Party", hidden: false },
  { id: "b", name: "Wave 1", hidden: true },
  { id: "c", name: "Wave 2", hidden: true },
];

describe("newCategory", () => {
  it("starts hidden", () => {
    // A category made mid-session is usually something the party should not
    // see yet, and revealing by accident cannot be undone.
    expect(newCategory("Ambush").hidden).toBe(true);
  });

  it("keeps the name it was given", () => {
    expect(newCategory("Ambush").name).toBe("Ambush");
  });

  it("gives every category its own id", () => {
    expect(newCategory().id).not.toBe(newCategory().id);
  });
});

describe("parseCategories", () => {
  it("reads what was written", () => {
    const parsed = parseCategories({ [CATEGORIES_KEY]: categories });
    expect(parsed).toEqual(categories);
  });

  it("returns nothing for a missing key", () => {
    expect(parseCategories({})).toEqual([]);
  });

  it("skips entries with no id", () => {
    const parsed = parseCategories({
      [CATEGORIES_KEY]: [{ name: "Broken" }, categories[0]],
    });
    expect(parsed.map((c) => c.id)).toEqual(["a"]);
  });

  it("treats an unreadable hidden flag as hidden", () => {
    // Failing open would show players a category that was meant to be secret.
    const parsed = parseCategories({
      [CATEGORIES_KEY]: [{ id: "x", name: "x" }],
    });
    expect(parsed[0]?.hidden).toBe(true);
  });

  it("keeps an explicit false", () => {
    const parsed = parseCategories({
      [CATEGORIES_KEY]: [{ id: "x", name: "x", hidden: false }],
    });
    expect(parsed[0]?.hidden).toBe(false);
  });
});

describe("withCategory", () => {
  it("patches only the matching category", () => {
    const next = withCategory(categories, "b", { hidden: false });
    expect(next[1]?.hidden).toBe(false);
    expect(next[2]?.hidden).toBe(true);
  });
});

describe("withoutCategory", () => {
  it("removes the matching category", () => {
    expect(withoutCategory(categories, "b").map((c) => c.id)).toEqual([
      "a",
      "c",
    ]);
  });
});

describe("moveCategory", () => {
  it("reorders", () => {
    expect(moveCategory(categories, 0, 2).map((c) => c.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("leaves the original alone", () => {
    moveCategory(categories, 0, 2);
    expect(categories.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});
