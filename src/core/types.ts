/** A named effect with a countdown the round tracker drives. */
export type Condition = {
  id: string;
  name: string;
  duration: number;
};

/** A named counter nothing touches but the person clicking it. */
export type Resource = {
  id: string;
  name: string;
  value: number;
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
  conditions: Condition[];
  resources: Resource[];
  /** GM-only: keeps this line off everyone else's panel. */
  hidden: boolean;
};

/** A scene token that a record can be linked to. */
export type AssignableToken = {
  id: string;
  name: string;
  imageUrl: string;
};

export type NumericStatKey = "hp" | "extraHp" | "maxHp";
