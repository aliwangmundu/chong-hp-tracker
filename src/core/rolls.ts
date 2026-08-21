import OBR, { type Metadata } from "@owlbear-rodeo/sdk";
import type { Die, Segment } from "./dice";
import { getPluginId } from "./pluginId";

export const ROLL_LOG_KEY = getPluginId("rolls");

/** Shared by the background script, the panel and the popover page itself. */
export const ROLL_POPOVER_ID = getPluginId("roll-popover");

/**
 * Local control channel for the dice card.
 *
 * Only the background script opens, closes and times the popover — the panel
 * and the card itself ask for changes through here. One owner means the
 * auto-hide timer cannot be racing a second one somewhere else.
 */
export const ROLL_CONTROL_CHANNEL = getPluginId("roll-control");

export type RollCorner =
  | "TOP_RIGHT"
  | "TOP_LEFT"
  | "BOTTOM_RIGHT"
  | "BOTTOM_LEFT";

export const CORNER_ORDER: readonly RollCorner[] = [
  "TOP_RIGHT",
  "BOTTOM_RIGHT",
  "BOTTOM_LEFT",
  "TOP_LEFT",
] as const;

export const CORNER_LABEL: Record<RollCorner, string> = {
  TOP_RIGHT: "top right",
  BOTTOM_RIGHT: "bottom right",
  BOTTOM_LEFT: "bottom left",
  TOP_LEFT: "top left",
};

export const DEFAULT_CORNER: RollCorner = "TOP_RIGHT";

/**
 * Where the card sits, per person rather than per room.
 *
 * The popover page and the background script are the same origin, so this one
 * key is visible to both — which is what lets the card move itself.
 */
const CORNER_STORAGE_KEY = "chong-hp-tracker/roll-corner";

export function readCorner(): RollCorner {
  try {
    const stored = window.localStorage.getItem(CORNER_STORAGE_KEY);
    return CORNER_ORDER.includes(stored as RollCorner)
      ? (stored as RollCorner)
      : DEFAULT_CORNER;
  } catch {
    // Private windows and blocked site data throw rather than return null.
    return DEFAULT_CORNER;
  }
}

export function writeCorner(corner: RollCorner): void {
  try {
    window.localStorage.setItem(CORNER_STORAGE_KEY, corner);
  } catch {
    // Not being able to remember the corner is not worth failing over.
  }
}

export type RollControlMessage =
  | { kind: "show" }
  | { kind: "move"; corner: RollCorner }
  | { kind: "pin"; pinned: boolean };

/** How many rolls the shared log keeps. Oldest fall off the end. */
export const ROLL_LOG_LIMIT = 20;

export type RollLogEntry = {
  id: string;
  /** Player who rolled. */
  who: string;
  /** Token the roll was made from. */
  token: string;
  /** The saved roll's label, if it had one. */
  label: string;
  segments: Segment[];
  total: number;
  crit: boolean;
  fumble: boolean;
};

function parseDice(raw: unknown): Die[] {
  if (!Array.isArray(raw)) return [];
  const dice: Die[] = [];
  for (const value of raw) {
    if (typeof value !== "object" || value === null) continue;
    const die = value as Record<string, unknown>;
    if (typeof die["value"] !== "number" || typeof die["sides"] !== "number") {
      continue;
    }
    dice.push({ value: die["value"], sides: die["sides"] });
  }
  return dice;
}

function parseSegments(raw: unknown): Segment[] {
  if (!Array.isArray(raw)) return [];
  const segments: Segment[] = [];
  for (const value of raw) {
    if (typeof value !== "object" || value === null) continue;
    const segment = value as Record<string, unknown>;
    if (segment["kind"] === "dice" && typeof segment["label"] === "string") {
      segments.push({
        kind: "dice",
        label: segment["label"],
        dice: parseDice(segment["dice"]),
      });
    } else if (typeof segment["text"] === "string") {
      segments.push({ kind: "plain", text: segment["text"] });
    }
  }
  return segments;
}

/**
 * The log lives in scene metadata, which is also how it reaches everyone.
 *
 * Every client already listens for scene metadata changes, so appending an
 * entry both stores it and broadcasts it — no separate message channel, and a
 * player who opens the panel late still sees the last twenty rolls.
 */
export function parseRollLog(metadata: Metadata): RollLogEntry[] {
  const raw = metadata[ROLL_LOG_KEY];
  if (!Array.isArray(raw)) return [];

  const entries: RollLogEntry[] = [];
  for (const value of raw) {
    if (typeof value !== "object" || value === null) continue;
    const entry = value as Record<string, unknown>;
    if (typeof entry["id"] !== "string") continue;
    if (typeof entry["total"] !== "number") continue;

    entries.push({
      id: entry["id"],
      who: typeof entry["who"] === "string" ? entry["who"] : "",
      token: typeof entry["token"] === "string" ? entry["token"] : "",
      label: typeof entry["label"] === "string" ? entry["label"] : "",
      segments: parseSegments(entry["segments"]),
      total: entry["total"],
      crit: entry["crit"] === true,
      fumble: entry["fumble"] === true,
    });
  }
  return entries;
}

export async function appendRoll(entry: RollLogEntry): Promise<void> {
  const current = parseRollLog(await OBR.scene.getMetadata());
  const next = [...current, entry].slice(-ROLL_LOG_LIMIT);
  await OBR.scene.setMetadata({ [ROLL_LOG_KEY]: next });
}

export async function clearRollLog(): Promise<void> {
  await OBR.scene.setMetadata({ [ROLL_LOG_KEY]: [] });
}
