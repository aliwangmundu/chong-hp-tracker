import OBR from "@owlbear-rodeo/sdk";
import { ROLL_POPOVER_ID, parseRollLog } from "@/core/rolls";

/**
 * The floating dice card, over the map, for everyone in the room.
 *
 * A popover anchored to a screen *position* rather than an element is the one
 * surface Owlbear gives an extension outside its own panel, and `hidePaper`
 * drops Owlbear's frame so the card inside is all that shows.
 *
 * `watchRolls` runs in the background script, which every client loads, so a
 * result reaches people who never opened the tracker.
 */

const WIDTH = 340;
const HEIGHT = 300;
const TOP_MARGIN = 12;

let lastSeen: string | null = null;
let primed = false;

export async function openRollPanel(): Promise<void> {
  const width = await OBR.viewport.getWidth();
  await OBR.popover.open({
    id: ROLL_POPOVER_ID,
    url: `${import.meta.env.BASE_URL}roll.html`,
    width: WIDTH,
    height: HEIGHT,
    anchorReference: "POSITION",
    anchorPosition: { left: Math.round(width / 2), top: TOP_MARGIN },
    anchorOrigin: { horizontal: "CENTER", vertical: "TOP" },
    transformOrigin: { horizontal: "CENTER", vertical: "TOP" },
    hidePaper: true,
    disableClickAway: true,
  });
}

export function resetRollPopover(): void {
  primed = false;
  lastSeen = null;
}

export function watchRolls(): () => void {
  const check = (metadata: Record<string, unknown>) => {
    const log = parseRollLog(metadata);
    const newest = log[log.length - 1]?.id ?? null;
    if (newest === null || newest === lastSeen) return;

    lastSeen = newest;
    // The first read is whatever the scene already held; without this every
    // client would pop the last roll open the moment it connected.
    if (!primed) {
      primed = true;
      return;
    }
    void openRollPanel();
  };

  void OBR.scene.getMetadata().then(check);
  return OBR.scene.onMetadataChange(check);
}
