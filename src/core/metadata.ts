import OBR, { type Image, type Item, isImage } from "@owlbear-rodeo/sdk";
import { normalizeAc } from "./ac";
import { getPluginId } from "./pluginId";
import {
  type Category,
  type NumericStatKey,
  type PortableStats,
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
  category: DEFAULT_CATEGORY,
  index: UNPLACED_INDEX,
};


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
    category: readCategory(source),
    index,
  };
}

/** The subset that follows an ally from scene to scene. */
export function portableStats(stats: TokenStats): PortableStats {
  return {
    hp: stats.hp,
    extraHp: stats.extraHp,
    maxHp: stats.maxHp,
    ac: stats.ac,
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
