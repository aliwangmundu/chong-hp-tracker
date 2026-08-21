import OBR, { type Image, type Item, isImage } from "@owlbear-rodeo/sdk";
import { normalizeAc } from "./ac";
import { getPluginId } from "./pluginId";
import {
  type Category,
  type Condition,
  type NumericStatKey,
  type Resource,
  type RollEntry,
  type TokenStats,
  type TrackedStats,
  type TrackedToken,
  UNPLACED_INDEX,
} from "./types";

export const METADATA_KEY = getPluginId("metadata");

/**
 * Where a token lands when it has never been touched.
 *
 * Adversaries, because a party is set up once and monsters get dropped in all
 * session long. Flip this single constant to change it.
 */
export const DEFAULT_CATEGORY: Category = "ADVERSARY";

const DEFAULT_STATS: TokenStats = {
  hp: 0,
  extraHp: 0,
  maxHp: 0,
  ac: "",
  conditions: [],
  resources: [],
  rolls: [],
  category: DEFAULT_CATEGORY,
  index: UNPLACED_INDEX,
};

/** Names are free text; a cap keeps one pasted essay from wrecking the card. */
export const ENTRY_NAME_MAX_LENGTH = 24;

/** Dice expressions and roll notes. Long enough for anything sensible. */
export const ROLL_TEXT_MAX_LENGTH = 64;


/** Tokens this extension tracks: images the players actually push around. */
export function isTrackableItem(item: Item): item is Image {
  return (
    (item.layer === "CHARACTER" || item.layer === "MOUNT") && isImage(item)
  );
}

function readInt(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  // Tolerate numeric strings: older scenes and hand-edited metadata have them.
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function readText(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value === "string") return normalizeAc(value);
  // AC used to be numeric; keep those scenes working.
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return "";
}

/**
 * Reads a list of named entries, dropping anything malformed.
 *
 * Another extension, a hand-edited scene, or an older version of this one can
 * leave junk under our key; skipping bad entries keeps one of them from taking
 * the whole token's stats down with it.
 */
function readEntries<T extends { id: string; name: string }>(
  source: Record<string, unknown>,
  key: string,
  build: (entry: Record<string, unknown>, id: string, name: string) => T,
): T[] {
  const raw = source[key];
  if (!Array.isArray(raw)) return [];

  const entries: T[] = [];
  for (const value of raw) {
    if (typeof value !== "object" || value === null) continue;
    const entry = value as Record<string, unknown>;
    const id = typeof entry["id"] === "string" ? entry["id"] : undefined;
    if (id === undefined) continue;
    const name =
      typeof entry["name"] === "string"
        ? entry["name"].slice(0, ENTRY_NAME_MAX_LENGTH)
        : "";
    entries.push(build(entry, id, name));
  }
  return entries;
}

function readConditions(source: Record<string, unknown>): Condition[] {
  return readEntries(source, "conditions", (entry, id, name) => ({
    id,
    name,
    duration: readInt(entry, "duration"),
  }));
}

function readResources(source: Record<string, unknown>): Resource[] {
  return readEntries(source, "resources", (entry, id, name) => ({
    id,
    name,
    value: readInt(entry, "value"),
  }));
}

function readRolls(source: Record<string, unknown>): RollEntry[] {
  const raw = source["rolls"];
  if (!Array.isArray(raw)) return [];

  const rolls: RollEntry[] = [];
  for (const value of raw) {
    if (typeof value !== "object" || value === null) continue;
    const entry = value as Record<string, unknown>;
    if (typeof entry["id"] !== "string") continue;
    rolls.push({
      id: entry["id"],
      label:
        typeof entry["label"] === "string"
          ? entry["label"].slice(0, ENTRY_NAME_MAX_LENGTH)
          : "",
      expression:
        typeof entry["expression"] === "string"
          ? entry["expression"].slice(0, ROLL_TEXT_MAX_LENGTH)
          : "",
    });
  }
  return rolls;
}

function readCategory(source: Record<string, unknown>): Category {
  return source["category"] === "PLAYER" ? "PLAYER" : DEFAULT_CATEGORY;
}

/**
 * Reads stats off an item, falling back to defaults for anything missing.
 *
 * A token that has never been edited parses cleanly to defaults, which is what
 * lets every token on the map appear in the list without us writing metadata to
 * the scene first.
 */
export function parseStats(item: Item): TokenStats {
  const raw = item.metadata[METADATA_KEY];
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_STATS };

  const source = raw as Record<string, unknown>;
  const index = "index" in source ? readInt(source, "index") : UNPLACED_INDEX;

  return {
    hp: readInt(source, "hp"),
    extraHp: readInt(source, "extraHp"),
    maxHp: readInt(source, "maxHp"),
    ac: readText(source, "ac"),
    conditions: readConditions(source),
    resources: readResources(source),
    rolls: readRolls(source),
    category: readCategory(source),
    index,
  };
}


/**
 * Which stats have ever been set on this token.
 *
 * Presence of the key, not a non-zero value: a monster you have knocked to 0 HP
 * should still show a 0 bubble, and a token you have never touched should stay
 * clean.
 */
export function getTrackedStats(item: Item): TrackedStats {
  const raw = item.metadata[METADATA_KEY];
  if (typeof raw !== "object" || raw === null) return { hp: false, ac: false };

  const source = raw as Record<string, unknown>;
  return {
    // HP shows once set, even at 0 — a dead monster is still being tracked.
    hp: "hp" in source,
    // AC is free text, so an empty string is the same as never having set it.
    ac: readText(source, "ac") !== "",
  };
}

export function toTrackedToken(item: Image): TrackedToken {
  return {
    id: item.id,
    name: item.text?.plainText || item.name,
    imageUrl: item.image.url,
    visible: item.visible,
    stats: parseStats(item),
  };
}

export function parseTokens(items: Item[]): TrackedToken[] {
  return items.filter(isTrackableItem).map(toTrackedToken);
}

/** Merges a partial stat update into one item's metadata. */
export async function writeStats(
  itemId: string,
  patch: Partial<TokenStats>,
): Promise<void> {
  await writeStatsBatch(new Map([[itemId, patch]]));
}

/**
 * Merges stat updates for many items in a single scene write.
 *
 * Drag-and-drop reshuffles every index in two categories at once; doing that as
 * one batch keeps it to a single undo step and one network round trip.
 */
export async function writeStatsBatch(
  patches: Map<string, Partial<TokenStats>>,
): Promise<void> {
  if (patches.size === 0) return;

  await OBR.scene.items.updateItems([...patches.keys()], (items) => {
    for (const item of items) {
      const patch = patches.get(item.id);
      if (patch === undefined) continue;

      const existing = item.metadata[METADATA_KEY];
      item.metadata[METADATA_KEY] = {
        ...(typeof existing === "object" && existing !== null ? existing : {}),
        ...patch,
      };
    }
  });
}

/**
 * Type-safe single-stat update.
 *
 * A computed key (`{ [key]: value }`) widens to an index signature and loses
 * the link to TokenStats, so the switch keeps the compiler in the loop.
 */
export function statPatch(
  key: NumericStatKey,
  value: number,
): Partial<TokenStats> {
  switch (key) {
    case "hp":
      return { hp: value };
    case "extraHp":
      return { extraHp: value };
    case "maxHp":
      return { maxHp: value };
  }
}

/** Returns a copy of `stats` with one numeric field replaced. */
export function withStat(
  stats: TokenStats,
  key: NumericStatKey,
  value: number,
): TokenStats {
  return { ...stats, ...statPatch(key, value) };
}
