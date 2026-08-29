import OBR from "@owlbear-rodeo/sdk";
import { RECORDS_KEY, parseRecords } from "./records";
import type { TrackedRecord } from "./types";

/**
 * Read-modify-write against the live scene metadata.
 *
 * Every record lives in one array under one key, so a write has to be built
 * from whatever is in the scene *now* rather than from a copy the panel was
 * holding — otherwise two people editing different records would overwrite each
 * other wholesale. Re-reading first narrows that window to a single call.
 */
export async function updateRecords(
  mutate: (records: TrackedRecord[]) => TrackedRecord[],
): Promise<void> {
  const current = parseRecords(await OBR.scene.getMetadata());
  await OBR.scene.setMetadata({ [RECORDS_KEY]: mutate(current) });
}
