import { describe, expect, it } from "vitest";
import { groupByCategory, moveToken } from "./sorting";
import type { Category, TrackedToken } from "./types";

const token = (
  id: string,
  category: Category,
  index: number,
  name = id,
): TrackedToken => ({
  id,
  name,
  imageUrl: "",
  visible: true,
  stats: { hp: 10, ac: 12, category, index },
});

describe("groupByCategory", () => {
  it("splits tokens into the two categories", () => {
    const groups = groupByCategory([
      token("a", "PLAYER", 0),
      token("b", "ADVERSARY", 0),
    ]);
    expect(groups.PLAYER.map((t) => t.id)).toEqual(["a"]);
    expect(groups.ADVERSARY.map((t) => t.id)).toEqual(["b"]);
  });

  it("orders by stored index", () => {
    const groups = groupByCategory([
      token("c", "PLAYER", 2),
      token("a", "PLAYER", 0),
      token("b", "PLAYER", 1),
    ]);
    expect(groups.PLAYER.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("sends never-placed tokens to the end, alphabetically", () => {
    const groups = groupByCategory([
      token("zed", "ADVERSARY", -1),
      token("placed", "ADVERSARY", 0),
      token("acid", "ADVERSARY", -1),
    ]);
    expect(groups.ADVERSARY.map((t) => t.id)).toEqual([
      "placed",
      "acid",
      "zed",
    ]);
  });

  it("does not mutate the input array", () => {
    const tokens = [token("b", "PLAYER", 1), token("a", "PLAYER", 0)];
    groupByCategory(tokens);
    expect(tokens.map((t) => t.id)).toEqual(["b", "a"]);
  });
});

describe("moveToken", () => {
  const base = groupByCategory([
    token("p1", "PLAYER", 0),
    token("p2", "PLAYER", 1),
    token("p3", "PLAYER", 2),
    token("a1", "ADVERSARY", 0),
  ]);

  it("reorders within a category", () => {
    const { groups } = moveToken(base, "p3", "PLAYER", 0);
    expect(groups.PLAYER.map((t) => t.id)).toEqual(["p3", "p1", "p2"]);
  });

  it("moves across categories", () => {
    const { groups } = moveToken(base, "p1", "ADVERSARY", 0);
    expect(groups.PLAYER.map((t) => t.id)).toEqual(["p2", "p3"]);
    expect(groups.ADVERSARY.map((t) => t.id)).toEqual(["p1", "a1"]);
  });

  it("patches only the rows that actually changed", () => {
    const { patches } = moveToken(base, "p3", "PLAYER", 0);
    expect([...patches.keys()].sort()).toEqual(["p1", "p2", "p3"]);
    expect(patches.get("p3")).toEqual({ category: "PLAYER", index: 0 });
  });

  it("writes the new category onto a token that crossed over", () => {
    const { patches } = moveToken(base, "p1", "ADVERSARY", 1);
    expect(patches.get("p1")).toEqual({ category: "ADVERSARY", index: 1 });
    expect(patches.has("a1")).toBe(false);
  });

  it("clamps an out-of-range target index", () => {
    const { groups } = moveToken(base, "p1", "PLAYER", 99);
    expect(groups.PLAYER.map((t) => t.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("leaves the caller's groups untouched", () => {
    moveToken(base, "p1", "ADVERSARY", 0);
    expect(base.PLAYER.map((t) => t.id)).toEqual(["p1", "p2", "p3"]);
    expect(base.PLAYER[0]?.stats.index).toBe(0);
  });

  it("is a no-op for an unknown token", () => {
    const { groups, patches } = moveToken(base, "ghost", "PLAYER", 0);
    expect(groups).toBe(base);
    expect(patches.size).toBe(0);
  });
});
