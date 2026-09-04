import { describe, expect, it } from "vitest";
import {
  RECORDS_KEY,
  moveRecord,
  moveRecordInto,
  newRecord,
  parseRecords,
  releaseToken,
  withRecord,
  withoutRecord,
} from "./records";
import type { TrackedRecord } from "./types";

const make = (id: string, tokenId: string | null = null): TrackedRecord => ({
  ...newRecord(id),
  id,
  tokenId,
});

const records = [make("a"), make("b"), make("c")];

describe("moveRecord", () => {
  it("moves a record later in the list", () => {
    expect(moveRecord(records, 0, 2).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("moves a record earlier in the list", () => {
    expect(moveRecord(records, 2, 0).map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("is a no-op when the position does not change", () => {
    expect(moveRecord(records, 1, 1)).toBe(records);
  });

  it("clamps a target past the end", () => {
    expect(moveRecord(records, 0, 99).map((r) => r.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("leaves the original array alone", () => {
    moveRecord(records, 0, 2);
    expect(records.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});

describe("moveRecordInto", () => {
  const filed = [
    { ...make("a"), categoryId: null },
    { ...make("b"), categoryId: "cat" },
    { ...make("c"), categoryId: null },
  ];

  it("files a record into a category and appends it", () => {
    const next = moveRecordInto(filed, "a", "cat", null);
    expect(next.map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(next.find((r) => r.id === "a")?.categoryId).toBe("cat");
  });

  it("inserts in front of the row it was dropped on", () => {
    const next = moveRecordInto(filed, "c", "cat", "b");
    expect(next.map((r) => r.id)).toEqual(["a", "c", "b"]);
    expect(next.find((r) => r.id === "c")?.categoryId).toBe("cat");
  });

  it("appends to the end when the category is empty", () => {
    const next = moveRecordInto(filed, "a", "other", null);
    expect(next.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("unfiles a record back to the ungrouped list", () => {
    const next = moveRecordInto(filed, "b", null, null);
    expect(next.find((r) => r.id === "b")?.categoryId).toBe(null);
  });

  it("is a no-op for an unknown record", () => {
    expect(moveRecordInto(filed, "zzz", "cat", null)).toBe(filed);
  });

  it("leaves the original array alone", () => {
    moveRecordInto(filed, "a", "cat", null);
    expect(filed.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});

describe("withRecord", () => {
  it("patches only the matching record", () => {
    const next = withRecord(records, "b", { hp: 12 });
    expect(next[1]?.hp).toBe(12);
    expect(next[0]?.hp).toBe(0);
  });

  it("is a no-op for an unknown id", () => {
    expect(withRecord(records, "zzz", { hp: 5 })).toEqual(records);
  });
});

describe("withoutRecord", () => {
  it("removes the matching record", () => {
    expect(withoutRecord(records, "b").map((r) => r.id)).toEqual(["a", "c"]);
  });
});

describe("releaseToken", () => {
  it("unlinks every record holding that token", () => {
    const linked = [make("a", "tok"), make("b", "tok"), make("c", "other")];
    const next = releaseToken(linked, "tok");
    expect(next.map((r) => r.tokenId)).toEqual([null, null, "other"]);
  });

  it("leaves records alone when nothing holds the token", () => {
    expect(releaseToken(records, "tok").map((r) => r.tokenId)).toEqual([
      null,
      null,
      null,
    ]);
  });
});

describe("extra hp", () => {
  it("is its own value, independent of hp", () => {
    const parsed = parseRecords({
      [RECORDS_KEY]: [{ id: "a", hp: 5, extraHp: 4 }],
    });
    expect(parsed[0]?.hp).toBe(5);
    expect(parsed[0]?.extraHp).toBe(4);
  });

  it("floors at 0 but has no max of its own", () => {
    const parsed = parseRecords({
      [RECORDS_KEY]: [{ id: "a", hp: 8, extraHp: -3, maxHp: 10 }],
    });
    expect(parsed[0]?.extraHp).toBe(0);
  });
});

describe("the player tick", () => {
  it("starts with the GM", () => {
    expect(newRecord("Goblin").isPlayer).toBe(false);
  });

  it("survives a round trip through metadata", () => {
    const parsed = parseRecords({
      [RECORDS_KEY]: [{ id: "a", isPlayer: true }],
    });
    expect(parsed[0]?.isPlayer).toBe(true);
  });

  it("leaves a record written before the tick existed with the GM", () => {
    const parsed = parseRecords({ [RECORDS_KEY]: [{ id: "a" }] });
    expect(parsed[0]?.isPlayer).toBe(false);
  });

  it("refuses anything that is not exactly true", () => {
    // A stray "true" or 1 from a hand-edited room should not push a monster in
    // front of the table.
    const parsed = parseRecords({
      [RECORDS_KEY]: [
        { id: "a", isPlayer: "true" },
        { id: "b", isPlayer: 1 },
        { id: "c", isPlayer: null },
      ],
    });
    expect(parsed.map((r) => r.isPlayer)).toEqual([false, false, false]);
  });
});
