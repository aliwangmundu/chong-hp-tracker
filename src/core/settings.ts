import OBR, { type Metadata } from "@owlbear-rodeo/sdk";
import { getPluginId } from "./pluginId";

export const SETTINGS_KEY = getPluginId("settings");

export type Settings = {
  /** Hides the Adversaries list from players. Token bubbles are unaffected. */
  hideAdversaries: boolean;
};

export const DEFAULT_SETTINGS: Settings = { hideAdversaries: false };

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
  return { hideAdversaries: source["hideAdversaries"] === true };
}

export async function setHideAdversaries(hidden: boolean): Promise<void> {
  await OBR.scene.setMetadata({ [SETTINGS_KEY]: { hideAdversaries: hidden } });
}
