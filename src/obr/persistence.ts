import OBR, { type Image } from "@owlbear-rodeo/sdk";
import { parseStats, portableStats, writeStatsBatch } from "@/core/metadata";
import {
  type PersistedStore,
  persistenceKey,
  readStore,
  samePortableStats,
  writeStore,
} from "@/core/persistence";
import type { PortableStats, TokenStats } from "@/core/types";

/**
 * Carries ally stats across scene changes.
 *
 * Two directions, and keeping them from fighting each other is the whole
 * problem:
 *
 *   restore — a token appearing in a scene for the first time adopts whatever
 *             the room remembers for that character
 *   save    — an ally whose stats change writes them back to the room
 *
 * A token is restored exactly once, when it is first seen in the current scene.
 * After that it only ever saves. Without that rule the restore would overwrite
 * the edit that triggered it and the two would ping-pong forever.
 *
 * Only the GM reconciles. Every client runs this file, and letting them all
 * write the same room key would mean the last writer wins at random.
 */

/** Every trackable token id seen in the current scene. */
const known = new Set<string>();

/** Ally token id → the portable stats we last reconciled for it. */
const reconciled = new Map<string, string>();

let store: PersistedStore = {};
let isGm = false;
let loaded = false;

const fingerprint = (stats: PortableStats): string =>
  `${stats.hp}|${stats.extraHp}|${stats.maxHp}|${stats.ac}`;

export function resetPersistence(): void {
  known.clear();
  reconciled.clear();
}

export async function initPersistence(): Promise<void> {
  isGm = (await OBR.player.getRole()) === "GM";
  OBR.player.onChange((player) => {
    isGm = player.role === "GM";
  });

  if (isGm) {
    store = await readStore();
    loaded = true;
  }

  // Another GM client — or a fresh install restoring a backup — can change the
  // store underneath us; keep the local copy honest.
  OBR.room.onMetadataChange(async () => {
    if (!isGm) return;
    store = await readStore();
  });
}

export async function reconcilePersistence(tokens: Image[]): Promise<void> {
  if (!isGm) return;
  if (!loaded) {
    store = await readStore();
    loaded = true;
  }

  const restores = new Map<string, Partial<TokenStats>>();
  const nextStore: PersistedStore = { ...store };
  let storeChanged = false;

  const present = new Set<string>();

  for (const token of tokens) {
    present.add(token.id);

    const stats = parseStats(token);
    const firstSighting = !known.has(token.id);
    known.add(token.id);

    if (stats.category !== "PLAYER") {
      // Adversaries never persist. Forget any reconciliation state so that
      // promoting one to an ally later counts as an edit, not a fresh arrival.
      reconciled.delete(token.id);
      continue;
    }

    const key = persistenceKey(
      token.text?.plainText || token.name,
      token.image.url,
    );
    const current = portableStats(stats);
    const remembered = nextStore[key];

    const newToScene = firstSighting && !reconciled.has(token.id);

    if (newToScene && remembered !== undefined) {
      if (!samePortableStats(remembered, current)) {
        restores.set(token.id, { ...remembered });
      }
      reconciled.set(token.id, fingerprint(remembered));
      continue;
    }

    if (reconciled.get(token.id) === fingerprint(current)) continue;

    nextStore[key] = current;
    storeChanged = true;
    reconciled.set(token.id, fingerprint(current));
  }

  // Tokens that left the scene keep their stored stats — that is the point —
  // but drop the per-scene bookkeeping so a return counts as a fresh arrival.
  for (const id of [...known]) {
    if (present.has(id)) continue;
    known.delete(id);
    reconciled.delete(id);
  }

  if (restores.size > 0) await writeStatsBatch(restores);
  if (storeChanged) {
    store = nextStore;
    await writeStore(nextStore);
  }
}
