import OBR from "@owlbear-rodeo/sdk";
import {
  ROLL_CONTROL_CHANNEL,
  ROLL_POPOVER_ID,
  type RollControlMessage,
  type RollCorner,
  parseRollLog,
  readCorner,
} from "@/core/rolls";

/**
 * Owns the dice card: when it opens, where it sits, and when it goes away.
 *
 * All of that lives in the background script, which every client loads. The
 * panel and the card itself only send requests down a local channel, so there
 * is exactly one auto-hide timer and one idea of where the card is.
 *
 * A popover anchored to a screen position rather than an element is the only
 * surface Owlbear gives an extension outside its own panel; `hidePaper` drops
 * Owlbear's frame so the card inside is all that shows.
 */

const WIDTH = 420;
const HEIGHT = 240;
const MARGIN = 16;

/** How long the card stays up on its own. Pinning suspends this. */
const VISIBLE_MS = 5000;

let isOpen = false;
let pinned = false;
let corner: RollCorner = "TOP_RIGHT";
let hideTimer: number | undefined;
let lastRollId: string | null = null;
let primed = false;

type Origin = {
  horizontal: "CENTER" | "LEFT" | "RIGHT";
  vertical: "BOTTOM" | "CENTER" | "TOP";
};

function originFor(value: RollCorner): Origin {
  return {
    horizontal: value.endsWith("RIGHT") ? "RIGHT" : "LEFT",
    vertical: value.startsWith("TOP") ? "TOP" : "BOTTOM",
  };
}

async function anchorFor(value: RollCorner) {
  const [width, height] = await Promise.all([
    OBR.viewport.getWidth(),
    OBR.viewport.getHeight(),
  ]);
  return {
    left: value.endsWith("RIGHT") ? Math.round(width) - MARGIN : MARGIN,
    top: value.startsWith("TOP") ? MARGIN : Math.round(height) - MARGIN,
  };
}

function clearTimer(): void {
  if (hideTimer !== undefined) window.clearTimeout(hideTimer);
  hideTimer = undefined;
}

function armTimer(): void {
  clearTimer();
  if (pinned) return;
  hideTimer = window.setTimeout(() => {
    void hide();
  }, VISIBLE_MS);
}

async function hide(): Promise<void> {
  clearTimer();
  isOpen = false;
  await OBR.popover.close(ROLL_POPOVER_ID);
}

async function open(): Promise<void> {
  const origin = originFor(corner);
  await OBR.popover.open({
    id: ROLL_POPOVER_ID,
    url: `${import.meta.env.BASE_URL}roll.html`,
    width: WIDTH,
    height: HEIGHT,
    anchorReference: "POSITION",
    anchorPosition: await anchorFor(corner),
    anchorOrigin: origin,
    transformOrigin: origin,
    hidePaper: true,
    disableClickAway: true,
  });
  isOpen = true;
  armTimer();
}

async function show(): Promise<void> {
  // Already up: restart the clock rather than tearing the card down and
  // rebuilding it, which would throw away the scroll position mid-read.
  if (isOpen) {
    armTimer();
    return;
  }
  await open();
}

async function move(next: RollCorner): Promise<void> {
  corner = next;
  if (!isOpen) return;
  // There is no reposition call in the popover API, so moving means closing
  // and reopening. One flicker per click is the cost of not having setPosition.
  await OBR.popover.close(ROLL_POPOVER_ID);
  await open();
}

export function resetRollPopover(): void {
  clearTimer();
  isOpen = false;
  pinned = false;
  primed = false;
  lastRollId = null;
}

export function initRollPopover(): void {
  corner = readCorner();

  OBR.broadcast.onMessage(ROLL_CONTROL_CHANNEL, (event) => {
    const message = event.data as RollControlMessage;
    switch (message?.kind) {
      case "show":
        void show();
        break;
      case "move":
        void move(message.corner);
        break;
      case "pin":
        pinned = message.pinned;
        if (pinned) clearTimer();
        else armTimer();
        break;
    }
  });
}

export function watchRolls(): () => void {
  const check = (metadata: Record<string, unknown>) => {
    const log = parseRollLog(metadata);
    const newest = log[log.length - 1]?.id ?? null;
    if (newest === null || newest === lastRollId) return;

    lastRollId = newest;
    // The first read is whatever the scene already held; without this every
    // client would pop the last roll open the moment it connected.
    if (!primed) {
      primed = true;
      return;
    }
    void show();
  };

  void OBR.scene.getMetadata().then(check);
  return OBR.scene.onMetadataChange(check);
}
