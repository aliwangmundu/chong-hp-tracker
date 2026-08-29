import OBR from "@owlbear-rodeo/sdk";
import { CATEGORIES_KEY, type CategoryDef, parseCategories } from "./categories";
import { RECORDS_KEY, parseRecords } from "./records";
import type { TrackedRecord } from "./types";

export type TrackerState = {
  records: TrackedRecord[];
  categories: CategoryDef[];
};

export const EMPTY_STATE: TrackerState = { records: [], categories: [] };

export function parseState(metadata: Record<string, unknown>): TrackerState {
  return {
    records: parseRecords(metadata),
    categories: parseCategories(metadata),
  };
}

export function isEmptyState(state: TrackerState): boolean {
  return state.records.length === 0 && state.categories.length === 0;
}

/**
 * Records live in *room* metadata, not scene metadata.
 *
 * That is the whole of the cross-scene persistence: room metadata is scoped to
 * the room and outlives any individual scene, so the same list is there
 * whichever map you open. It works because a record is identified by its own
 * id — there is no matching a character back up to a token by name or image,
 * which is what made this fragile when stats lived on the tokens themselves.
 */
export async function readState(): Promise<TrackerState> {
  return parseState(await OBR.room.getMetadata());
}

/**
 * Read-modify-write against the live room metadata, both keys at once.
 *
 * Records and categories are separate keys but not independent — deleting a
 * category has to unfile its records in the same breath, or a refresh landing
 * between two writes would leave rows pointing at something that no longer
 * exists. `setMetadata` takes both keys in one call, so that is one write.
 *
 * Reading first is what keeps two people editing different records from
 * overwriting each other wholesale; it narrows the race to a single call rather
 * than removing it.
 */
export async function updateState(
  mutate: (state: TrackerState) => TrackerState,
): Promise<void> {
  const next = mutate(await readState());
  await OBR.room.setMetadata({
    [RECORDS_KEY]: next.records,
    [CATEGORIES_KEY]: next.categories,
  });
}

/**
 * One-time lift of a scene's records into the room.
 *
 * Earlier versions kept everything in scene metadata. Without this, upgrading
 * would silently empty a party someone had already set up. It only fires when
 * the room holds nothing at all, so it can never overwrite a real list, and
 * only the GM runs it so two clients cannot race to do the same import.
 */
export async function migrateSceneToRoom(isGm: boolean): Promise<boolean> {
  if (!isGm) return false;
  if (!isEmptyState(await readState())) return false;

  const fromScene = parseState(await OBR.scene.getMetadata());
  if (isEmptyState(fromScene)) return false;

  await OBR.room.setMetadata({
    [RECORDS_KEY]: fromScene.records,
    [CATEGORIES_KEY]: fromScene.categories,
  });
  return true;
}
