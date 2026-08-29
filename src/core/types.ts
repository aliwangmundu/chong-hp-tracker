/** A named effect with a countdown the round tracker drives. */
export type Condition = {
  id: string;
  name: string;
  duration: number;
};

/**
 * One line in the tracker.
 *
 * The record is the thing that exists — it is created by hand, carries all the
 * stats, and lives in scene metadata. A token is an optional attachment: link
 * one and the bubbles get somewhere to draw, or leave it unlinked and the
 * record is still perfectly usable as a line in the list.
 */
export type TrackedRecord = {
  id: string;
  name: string;
  /** Scene item this record draws on, or null when nothing is linked. */
  tokenId: string | null;
  hp: number;
  /** Added to HP for the bubble on the token. Temporary hit points. */
  extraHp: number;
  /** Recorded but never drawn on the map. Caps the HP field. */
  maxHp: number;
  /** Free text so "M", "?" and "18" are all valid. */
  ac: string;
  /** Free text. Whatever you need to remember about this one. */
  note: string;
  conditions: Condition[];
  /** Category this record is filed under, or null for the ungrouped list. */
  categoryId: string | null;
};

/** A scene token that a record can be linked to. */
export type AssignableToken = {
  id: string;
  name: string;
  imageUrl: string;
};

export type NumericStatKey = "hp" | "extraHp" | "maxHp";
