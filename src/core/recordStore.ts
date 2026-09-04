import OBR from "@owlbear-rodeo/sdk";
import { CATEGORIES_KEY, type CategoryDef, parseCategories } from "./categories";
import { RECORDS_KEY, parseRecords } from "./records";
import { FIRST_ROUND, SETTINGS_KEY, parseSettings } from "./settings";
import type { TrackedRecord } from "./types";

export type TrackerState = {
  records: TrackedRecord[];
  categories: CategoryDef[];
  round: number;
};

export const EMPTY_STATE: TrackerState = {
  records: [],
  categories: [],
  round: FIRST_ROUND,
};

/**
 * The two record lists no single metadata source holds on its own.
 *
 * A player record reads from room metadata; everyone else reads from scene
 * metadata. Each source can hold junk left by the other half of a hand edit —
 * a player flag on something filed in the scene, say — so both lists are
 * filtered by `isPlayer` rather than trusted to only contain their own kind.
 */
export function combineRecords(
  roomMetadata: Record<string, unknown>,
  sceneMetadata: Record<string, unknown>,
): TrackedRecord[] {
  return [
    ...parseRecords(roomMetadata).filter((record) => record.isPlayer),
    ...parseRecords(sceneMetadata).filter((record) => !record.isPlayer),
  ];
}

/**
 * Players and the round live in *room* metadata — the party is there
 * whichever map you open. Everyone else, and the categories that file them,
 * live in *scene* metadata instead: a monster typed in mid-fight belongs to
 * that encounter, not to every map in the campaign. A token link already
 * worked this way — a scene item id is inert on another scene — this just
 * makes the roster around it match.
 *
 * `sceneMetadata` is `{}` when no scene is open, which reads the same as an
 * open scene that happens to hold nothing: no non-player records, no
 * categories.
 */
export function combineState(
  roomMetadata: Record<string, unknown>,
  sceneMetadata: Record<string, unknown>,
): TrackerState {
  return {
    records: combineRecords(roomMetadata, sceneMetadata),
    categories: parseCategories(sceneMetadata),
    round: parseSettings(roomMetadata).round,
  };
}

async function readState(sceneReady: boolean): Promise<TrackerState> {
  const [roomMetadata, sceneMetadata] = await Promise.all([
    OBR.room.getMetadata(),
    sceneReady
      ? OBR.scene.getMetadata()
      : Promise.resolve<Record<string, unknown>>({}),
  ]);
  return combineState(roomMetadata, sceneMetadata);
}

/**
 * Read-modify-write against the live metadata, split across the two stores it
 * touches.
 *
 * Each store gets its own read-modify-write built from the same mutated
 * state, so a write is never based on the copy the panel happens to be
 * holding — otherwise two people editing different records could overwrite
 * each other wholesale. Within a store, keys that change together still go in
 * one `setMetadata` call: advancing the round changes both the round and
 * every condition it counts down, and two writes there would mean two round
 * trips, each echoing back a snapshot the other had not landed in yet.
 *
 * When no scene is open there is nowhere to put a non-player record or a
 * category, so that half of the write is skipped entirely rather than
 * failing — the panel is expected not to have produced one, since it disables
 * the controls that would.
 */
export async function updateState(
  sceneReady: boolean,
  mutate: (state: TrackerState) => TrackerState,
): Promise<void> {
  const next = mutate(await readState(sceneReady));

  const players = next.records.filter((record) => record.isPlayer);
  const writes: Promise<void>[] = [
    OBR.room.setMetadata({
      [RECORDS_KEY]: players,
      [SETTINGS_KEY]: { round: next.round },
    }),
  ];

  if (sceneReady) {
    const others = next.records.filter((record) => !record.isPlayer);
    writes.push(
      OBR.scene.setMetadata({
        [RECORDS_KEY]: others,
        [CATEGORIES_KEY]: next.categories,
      }),
    );
  }

  await Promise.all(writes);
}
