import OBR, { type Metadata } from "@owlbear-rodeo/sdk";
import { getPluginId } from "./pluginId";

export const SETTINGS_KEY = getPluginId("settings");

export type Settings = {
  /** Hides the Adversaries list from players. Token bubbles are unaffected. */
  hideAdversaries: boolean;
  /** Combat round. Counts from 1; advancing it counts conditions down. */
  round: number;
};

export const FIRST_ROUND = 1;

export const DEFAULT_SETTINGS: Settings = {
  hideAdversaries: false,
  round: FIRST_ROUND,
};

/**
 * Settings live on the scene, not on the player.
 *
 * The GM flips it once and every client agrees, including people who join
 * later — which a per-client setting could not do.
 */
export function parseSettings(metadata: Metadata): Settings {
  const raw = metadata[SETTINGS_KEY];
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_SETTINGS };

  const source = raw as Record<string, unknown>;
  const round = source["round"];

  return {
    hideAdversaries: source["hideAdversaries"] === true,
    round:
      typeof round === "number" && Number.isFinite(round)
        ? Math.max(FIRST_ROUND, Math.trunc(round))
        : FIRST_ROUND,
  };
}

/**
 * Merges one field into the stored settings.
 *
 * `OBR.scene.setMetadata` merges at the top level only, so writing our key
 * replaces the whole object — the current settings have to be read back in.
 */
async function patchSettings(patch: Partial<Settings>): Promise<void> {
  const current = parseSettings(await OBR.scene.getMetadata());
  await OBR.scene.setMetadata({ [SETTINGS_KEY]: { ...current, ...patch } });
}

export async function setHideAdversaries(hidden: boolean): Promise<void> {
  await patchSettings({ hideAdversaries: hidden });
}

export async function setRound(round: number): Promise<void> {
  await patchSettings({ round: Math.max(FIRST_ROUND, Math.trunc(round)) });
}
