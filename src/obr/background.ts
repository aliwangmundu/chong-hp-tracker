import OBR, { type Image, type Item, type Metadata } from "@owlbear-rodeo/sdk";
import { getPluginId } from "@/core/pluginId";
import { parseRecords } from "@/core/records";
import { isAssignableItem } from "@/core/tokens";
import type { TrackedRecord } from "@/core/types";
import {
  attachmentIds,
  attachmentSignature,
  buildAttachments,
  isOurAttachment,
} from "./attachments";

/**
 * Draws the HP, AC and condition bubbles on linked tokens.
 *
 * Two inputs now, not one: the records live in scene metadata and the tokens
 * live in the scene, so a redraw is triggered by either changing. A record with
 * no token, or one pointing at a token that has been deleted, simply draws
 * nothing.
 *
 * Attachments are *local* items: every client renders its own from the shared
 * records. That keeps them out of the saved scene, out of undo history, and
 * stops a pile of extra items per token from being replicated to everyone.
 */

/** Signature of what we last drew, per token id. Our whole diffing state. */
const drawn = new Map<string, string>();

let sceneDpi = 150;
let running = false;
let records: TrackedRecord[] = [];
let tokens: Image[] = [];

async function clearLocalAttachments(): Promise<void> {
  const stale = await OBR.scene.local.getItems(isOurAttachment);
  if (stale.length > 0) {
    await OBR.scene.local.deleteItems(stale.map((item) => item.id));
  }
  drawn.clear();
}

async function sync(): Promise<void> {
  const byId = new Map(tokens.map((token) => [token.id, token]));

  const toAdd: Item[] = [];
  const toDelete: string[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    if (record.tokenId === null) continue;
    const token = byId.get(record.tokenId);
    if (token === undefined) continue;

    seen.add(token.id);

    const signature = attachmentSignature(token, record, sceneDpi);
    if (drawn.get(token.id) === signature) continue;

    // Rebuild rather than patch: the set can change shape entirely (a bubble
    // appears or goes away), and ids are deterministic so this is exact.
    toDelete.push(...attachmentIds(token.id));
    toAdd.push(...buildAttachments(token, record, sceneDpi));
    drawn.set(token.id, signature);
  }

  // Tokens that were unlinked, deleted, or whose record is gone.
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
  await clearLocalAttachments();
  await sync();
}

async function start(): Promise<void> {
  if (running) return;
  running = true;

  sceneDpi = await OBR.scene.grid.getDpi();
  [records, tokens] = await Promise.all([
    OBR.scene.getMetadata().then(parseRecords),
    OBR.scene.items.getItems<Image>(isAssignableItem),
  ]);
  await refresh();

  OBR.scene.items.onChange((items) => {
    tokens = items.filter(isAssignableItem);
    void sync();
  });

  OBR.scene.onMetadataChange((metadata: Metadata) => {
    records = parseRecords(metadata);
    void sync();
  });

  OBR.scene.grid.onChange((grid) => {
    if (grid.dpi === sceneDpi) return;
    sceneDpi = grid.dpi;
    void refresh();
  });
}

OBR.onReady(async () => {
  OBR.scene.onReadyChange((ready) => {
    if (ready) {
      void start();
    } else {
      running = false;
      drawn.clear();
      records = [];
      tokens = [];
    }
  });

  if (await OBR.scene.isReady()) void start();
});

// Keeps bundlers from tree-shaking a module whose only job is side effects.
export const BACKGROUND_ID = getPluginId("background");
