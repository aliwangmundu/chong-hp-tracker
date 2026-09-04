/** A named effect with a countdown the round tracker drives. */
export type Condition = {
  id: string;
  name: string;
  duration: number;
};

/**
 * One line in the tracker.
 *
 * The record is the thing that exists — it is created by hand and carries all
 * the stats. A token is an optional attachment: link one and the bar and
 * bubbles get somewhere to draw, or leave it unlinked and the record is still
 * perfectly usable as a line in the list.
 *
 * Where it lives depends on `isPlayer`: a player record is written to *room*
 * metadata, so the same party is there whichever map you open; every other
 * record is written to *scene* metadata, so it belongs to the encounter it was
 * made in and is gone when you switch maps — the same way its token link
 * already was.
 */
export type TrackedRecord = {
  id: string;
  name: string;
  /** Scene item this record draws on, or null when nothing is linked. */
  tokenId: string | null;
  hp: number;
  /**
   * A separate pool of bonus hit points — never folded into `hp`. It has its
   * own slot in the row and on the token, reading "8/8 + 8" once there is
   * any, so a temporary bonus never gets mistaken for real HP or lost in the
   * same number.
   */
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
  /**
   * Ticked to move this record to the player tab.
   *
   * Records start as the GM's: a monster typed in mid-fight should not land in
   * front of the table before anyone has looked at it. Ticking one hands it
   * over, and it leaves the DM tab in the same movement.
   */
  isPlayer: boolean;
};

/** A scene token that a record can be linked to. */
export type AssignableToken = {
  id: string;
  name: string;
  imageUrl: string;
};

export type NumericStatKey = "hp" | "extraHp" | "maxHp";
