import OBR from "@owlbear-rodeo/sdk";
import { CATEGORIES_KEY, type CategoryDef, parseCategories } from "./categories";
import { RECORDS_KEY, parseRecords } from "./records";
import type { TrackedRecord } from "./types";

export type TrackerState = {
  records: TrackedRecord[];
  categories: CategoryDef[];
};

export function parseState(metadata: Record<string, unknown>): TrackerState {
  return {
    records: parseRecords(metadata),
    categories: parseCategories(metadata),
  };
}

/**
 * Read-modify-write against the live scene metadata, both keys at once.
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
  const next = mutate(parseState(await OBR.scene.getMetadata()));
  await OBR.scene.setMetadata({
    [RECORDS_KEY]: next.records,
    [CATEGORIES_KEY]: next.categories,
  });
}
