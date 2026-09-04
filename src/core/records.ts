import { normalizeAc } from "./ac";
import { ENTRY_NAME_MAX_LENGTH, newEntryId } from "./entries";
import { clampHp } from "./inlineMath";
import { getPluginId } from "./pluginId";
import type { Condition, NumericStatKey, TrackedRecord } from "./types";

export const RECORDS_KEY = getPluginId("records");

/** Record names are free text; a cap keeps one pasted essay out of the row. */
export const RECORD_NAME_MAX_LENGTH = 32;

/**
 * Notes are capped because the whole tracker shares Owlbear's 16kB of room
 * metadata. Long enough for a reminder, short enough that fifty records still
 * fit.
 */
export const NOTE_MAX_LENGTH = 400;

export function newRecord(name = ""): TrackedRecord {
  return {
    id: newEntryId(),
    name: name.slice(0, RECORD_NAME_MAX_LENGTH),
    tokenId: null,
    hp: 0,
    extraHp: 0,
    maxHp: 0,
    ac: "",
    note: "",
    conditions: [],
    categoryId: null,
    isPlayer: false,
  };
}

function readInt(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : 0;
}

function readText(source: Record<string, unknown>, key: string, cap: number) {
  const value = source[key];
  return typeof value === "string" ? value.slice(0, cap) : "";
}

/**
 * Reads a list of named entries, dropping anything malformed.
 *
 * Another extension, a hand-edited scene, or an older version of this one can
 * leave junk under our key; skipping the bad row keeps it from taking the whole
 * record down with it.
 */
function readEntries<T extends { id: string; name: string }>(
  raw: unknown,
  build: (entry: Record<string, unknown>, id: string, name: string) => T,
): T[] {
  if (!Array.isArray(raw)) return [];

  const entries: T[] = [];
  for (const value of raw) {
    if (typeof value !== "object" || value === null) continue;
    const entry = value as Record<string, unknown>;
    if (typeof entry["id"] !== "string") continue;
    entries.push(
      build(entry, entry["id"], readText(entry, "name", ENTRY_NAME_MAX_LENGTH)),
    );
  }
  return entries;
}

export function parseRecords(
  metadata: Record<string, unknown>,
): TrackedRecord[] {
  const raw = metadata[RECORDS_KEY];
  if (!Array.isArray(raw)) return [];

  const records: TrackedRecord[] = [];
  for (const value of raw) {
    if (typeof value !== "object" || value === null) continue;
    const source = value as Record<string, unknown>;
    if (typeof source["id"] !== "string") continue;

    const maxHp = readInt(source, "maxHp");
    // Extra HP is never a stored pool of its own — any amount found here (this
    // extension's own past writes, a hand-edited scene, an older version) is
    // folded straight into HP and the field itself always reads back 0.
    const hp = clampHp(readInt(source, "hp") + readInt(source, "extraHp"), maxHp);

    records.push({
      id: source["id"],
      name: readText(source, "name", RECORD_NAME_MAX_LENGTH),
      tokenId:
        typeof source["tokenId"] === "string" ? source["tokenId"] : null,
      hp,
      extraHp: 0,
      maxHp,
      ac: normalizeAc(
        typeof source["ac"] === "string" ? source["ac"] : "",
      ),
      note: readText(source, "note", NOTE_MAX_LENGTH),
      conditions: readEntries<Condition>(
        source["conditions"],
        (entry, id, name) => ({
          id,
          name,
          duration: readInt(entry, "duration"),
        }),
      ),
      categoryId:
        typeof source["categoryId"] === "string"
          ? source["categoryId"]
          : null,
      // Anything unreadable stays with the GM, which is the safe direction to
      // guess in: a record shown to nobody is a nuisance, one shown to the
      // whole table by accident is a spoiler.
      isPlayer: source["isPlayer"] === true,
    });
  }
  return records;
}

/**
 * Moves a record into a category, optionally in front of a specific row.
 *
 * The flat array is still the ordering; grouping for display just reads
 * `categoryId`. Dropping onto a row inserts at that row's position, dropping
 * onto a section appends after the last record already filed there.
 */
export function moveRecordInto(
  records: TrackedRecord[],
  id: string,
  categoryId: string | null,
  beforeId: string | null,
): TrackedRecord[] {
  const from = records.findIndex((record) => record.id === id);
  if (from === -1) return records;

  const next = [...records];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return records;
  const updated = { ...moved, categoryId };

  if (beforeId !== null) {
    const to = next.findIndex((record) => record.id === beforeId);
    if (to !== -1) {
      next.splice(to, 0, updated);
      return next;
    }
  }

  let insert = next.length;
  for (let index = next.length - 1; index >= 0; index -= 1) {
    if (next[index]?.categoryId === categoryId) {
      insert = index + 1;
      break;
    }
  }
  next.splice(insert, 0, updated);
  return next;
}

/** Moves a record to a new position, returning a new array. */
export function moveRecord(
  records: TrackedRecord[],
  from: number,
  to: number,
): TrackedRecord[] {
  if (from === to) return records;
  if (from < 0 || from >= records.length) return records;

  const next = [...records];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return records;
  next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
  return next;
}

/**
 * Type-safe single-stat patch.
 *
 * A computed key (`{ [key]: value }`) widens to an index signature and loses
 * the link to TrackedRecord, so the switch keeps the compiler in the loop.
 */
export function statPatch(
  key: NumericStatKey,
  value: number,
): Partial<TrackedRecord> {
  switch (key) {
    case "hp":
      return { hp: value };
    case "extraHp":
      return { extraHp: value };
    case "maxHp":
      return { maxHp: value };
  }
}

export function withRecord(
  records: TrackedRecord[],
  id: string,
  patch: Partial<TrackedRecord>,
): TrackedRecord[] {
  return records.map((record) =>
    record.id === id ? { ...record, ...patch } : record,
  );
}

export function withoutRecord(
  records: TrackedRecord[],
  id: string,
): TrackedRecord[] {
  return records.filter((record) => record.id !== id);
}

/**
 * Clears a token from every record that claims it.
 *
 * Two records pointing at one token would draw two sets of bubbles on top of
 * each other, so linking is exclusive: the newest link wins.
 */
export function releaseToken(
  records: TrackedRecord[],
  tokenId: string,
): TrackedRecord[] {
  return records.map((record) =>
    record.tokenId === tokenId ? { ...record, tokenId: null } : record,
  );
}
