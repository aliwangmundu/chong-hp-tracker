import type { Metadata } from "@owlbear-rodeo/sdk";
import { getPluginId } from "./pluginId";

export const SETTINGS_KEY = getPluginId("settings");

export type Settings = {
  /** Combat round. Counts from 1; advancing it counts conditions down. */
  round: number;
};

export const FIRST_ROUND = 1;

export const DEFAULT_SETTINGS: Settings = { round: FIRST_ROUND };

/**
 * Settings live in room metadata, beside the records.
 *
 * The round drives the conditions on those records, so it travels with them —
 * across scenes, and in the same write. `recordStore` owns the writing; this
 * module only knows how to read the value back out.
 */
export function parseSettings(metadata: Metadata): Settings {
  const raw = metadata[SETTINGS_KEY];
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_SETTINGS };

  const source = raw as Record<string, unknown>;
  const round = source["round"];

  return {
    round:
      typeof round === "number" && Number.isFinite(round)
        ? Math.max(FIRST_ROUND, Math.trunc(round))
        : FIRST_ROUND,
  };
}
