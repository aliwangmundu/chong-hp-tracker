/** Armour class is free text, so it needs a length limit rather than a range. */
export const AC_MAX_LENGTH = 3;

/**
 * Not every table writes a number here — "M" for a monster's melee AC, "?" for
 * something the party has not worked out yet — so AC is text, trimmed and
 * capped at a length the bubble on the token can actually render.
 */
export function normalizeAc(value: string): string {
  return value.trim().slice(0, AC_MAX_LENGTH);
}
