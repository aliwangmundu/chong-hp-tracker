import OBR, { type Metadata } from "@owlbear-rodeo/sdk";
import type { Die, Segment } from "./dice";
import { getPluginId } from "./pluginId";

export const ROLL_LOG_KEY = getPluginId("rolls");

/** How many rolls the shared log keeps. Oldest fall off the end. */
export const ROLL_LOG_LIMIT = 20;

export type RollLogEntry = {
  id: string;
  /** Player who rolled. */
  who: string;
  /** Token the roll was made from. */
  token: string;
  /** Whatever the player typed in the note box. */
  note: string;
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
      note: typeof entry["note"] === "string" ? entry["note"] : "",
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
