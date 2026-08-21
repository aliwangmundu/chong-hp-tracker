import OBR, { type Image, type Item } from "@owlbear-rodeo/sdk";
import { getPluginId } from "@/core/pluginId";
import { getTrackedStats, isTrackableItem, parseStats } from "@/core/metadata";
import {
  initRollPopover,
  resetRollPopover,
  watchRolls,
} from "./rollPopover";
import {
  attachmentIds,
  attachmentSignature,
  buildAttachments,
  isOurAttachment,
} from "./attachments";

/**
 * Draws the HP and AC bubbles on tokens.
 *
 * Attachments are *local* items: every client renders its own from the shared
 * token metadata. That keeps them out of the saved scene, out of undo history,
 * and stops four extra items per token from being replicated to everyone.
 */

/** Signature of what we last drew, per token. Our whole diffing state. */
const drawn = new Map<string, string>();

let sceneDpi = 150;
let running = false;

async function clearLocalAttachments(): Promise<void> {
  const stale = await OBR.scene.local.getItems(isOurAttachment);
  if (stale.length > 0) {
    await OBR.scene.local.deleteItems(stale.map((item) => item.id));
  }
  drawn.clear();
}

async function sync(items: Item[]): Promise<void> {
  const tokens = items.filter(isTrackableItem);

  const toAdd: Item[] = [];
  const toDelete: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    seen.add(token.id);

    const stats = parseStats(token);
    const tracked = getTrackedStats(token);
    const signature = attachmentSignature(token, stats, tracked, sceneDpi);
    if (drawn.get(token.id) === signature) continue;

    // Rebuild rather than patch: the set can change shape entirely (a bubble
    // appears or goes away), and ids are deterministic so this is exact.
    toDelete.push(...attachmentIds(token.id));
    toAdd.push(...buildAttachments(token, stats, tracked, sceneDpi));
    drawn.set(token.id, signature);
  }

  // Tokens that left the scene take their attachments with them.
  for (const id of [...drawn.keys()]) {
    if (seen.has(id)) continue;
    toDelete.push(...attachmentIds(id));
    drawn.delete(id);
  }

  if (toDelete.length === 0 && toAdd.length === 0) return;

  // Delete before add: ids are reused, and OBR rejects duplicates.
  if (toDelete.length > 0) await OBR.scene.local.deleteItems(toDelete);
  if (toAdd.length > 0) await OBR.scene.local.addItems(toAdd);
}

async function refresh(): Promise<void> {
  const items = await OBR.scene.items.getItems<Image>(isTrackableItem);
  drawn.clear();
  await clearLocalAttachments();
  await sync(items);
}

async function start(): Promise<void> {
  if (running) return;
  running = true;

  sceneDpi = await OBR.scene.grid.getDpi();
  await refresh();

  watchRolls();

  OBR.scene.items.onChange((items) => {
    void sync(items);
  });

  OBR.scene.grid.onChange((grid) => {
    if (grid.dpi === sceneDpi) return;
    sceneDpi = grid.dpi;
    void refresh();
  });
}

OBR.onReady(async () => {
  initRollPopover();

  OBR.scene.onReadyChange((ready) => {
    if (ready) {
      void start();
    } else {
      running = false;
      drawn.clear();
      resetRollPopover();
    }
  });

  if (await OBR.scene.isReady()) void start();
});

// Keeps bundlers from tree-shaking a module whose only job is side effects.
export const BACKGROUND_ID = getPluginId("background");
