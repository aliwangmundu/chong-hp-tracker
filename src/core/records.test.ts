import { describe, expect, it } from "vitest";
import {
  moveRecord,
  newRecord,
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
