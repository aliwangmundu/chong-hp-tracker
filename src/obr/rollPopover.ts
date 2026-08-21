import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "@/core/pluginId";
import { parseRollLog } from "@/core/rolls";

/**
 * Puts the newest roll on screen, over the map, for everyone in the room.
 *
 * A popover anchored to a screen position — rather than to an element — is the
 * one surface Owlbear gives an extension outside its own panel. `hidePaper`
 * drops Owlbear's frame so the card inside is all you see.
 *
 * This runs in the background script, which every client loads, so nobody has
 * to have the tracker panel open to see a result.
 */

const POPOVER_ID = getPluginId("roll-popover");
const POPOVER_WIDTH = 420;
const POPOVER_HEIGHT = 84;
const TOP_MARGIN = 12;

/** How long a result stays up. */
const VISIBLE_MS = 6000;

let hideTimer: number | undefined;
let lastShown: string | null = null;
let primed = false;

async function show(): Promise<void> {
  const width = await OBR.viewport.getWidth();

  // Re-opening the same id does not reposition or re-mount, and a result that
  // arrives while one is up must replace it rather than be swallowed.
  await OBR.popover.close(POPOVER_ID);
  await OBR.popover.open({
    id: POPOVER_ID,
    url: `${import.meta.env.BASE_URL}roll.html`,
    width: POPOVER_WIDTH,
    height: POPOVER_HEIGHT,
    anchorReference: "POSITION",
    anchorPosition: { left: Math.round(width / 2), top: TOP_MARGIN },
    anchorOrigin: { horizontal: "CENTER", vertical: "TOP" },
    transformOrigin: { horizontal: "CENTER", vertical: "TOP" },
    hidePaper: true,
    disableClickAway: true,
  });

  if (hideTimer !== undefined) window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    void OBR.popover.close(POPOVER_ID);
  }, VISIBLE_MS);
}

export function resetRollPopover(): void {
  primed = false;
  lastShown = null;
  if (hideTimer !== undefined) window.clearTimeout(hideTimer);
  void OBR.popover.close(POPOVER_ID);
}

export function watchRolls(): () => void {
  const check = (metadata: Record<string, unknown>) => {
    const log = parseRollLog(metadata);
    const newest = log[log.length - 1]?.id ?? null;
    if (newest === null || newest === lastShown) return;

    lastShown = newest;
    // The first read is whatever was already in the scene; only announce rolls
    // made from now on, or every client pops up the last roll on load.
    if (!primed) {
      primed = true;
      return;
    }
    void show();
  };

  void OBR.scene.getMetadata().then(check);
  return OBR.scene.onMetadataChange(check);
}
