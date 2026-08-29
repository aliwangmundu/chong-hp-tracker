import type { Condition, Resource } from "./types";

/** Anything the drawer keeps a list of. */
type Entry = { id: string };

/** Condition and resource names. Long enough to read at a glance. */
export const ENTRY_NAME_MAX_LENGTH = 24;

export function newEntryId(): string {
  // Present in every browser Owlbear runs in, and in Node for the tests.
  return crypto.randomUUID();
}

export function newCondition(): Condition {
  return { id: newEntryId(), name: "", duration: 1 };
}

export function newResource(): Resource {
  return { id: newEntryId(), name: "", value: 0 };
}

/** Returns a copy of the list with one entry's fields merged. */
export function withEntry<T extends Entry>(
  list: T[],
  id: string,
  patch: Partial<T>,
): T[] {
  return list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
}

export function withoutEntry<T extends Entry>(list: T[], id: string): T[] {
  return list.filter((entry) => entry.id !== id);
}

export const MAX_DURATION = 999;

/**
 * Shifts every duration by `delta`, floored at 0.
 *
 * Advancing the round passes -1, stepping back passes +1, so the two are
 * symmetric and a mis-click is undoable. Expired conditions are kept rather
 * than deleted: a round you stepped back over should still have its conditions,
 * and deciding when an effect is really gone is the GM's call, not a counter's.
 */
export function stepDurations(
  conditions: Condition[],
  delta: number,
): Condition[] {
  return conditions.map((condition) => ({
    ...condition,
    duration: Math.min(MAX_DURATION, Math.max(0, condition.duration + delta)),
  }));
}
