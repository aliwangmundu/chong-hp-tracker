const SIGNED = /^([+-])\s*(\d+)$/;

/**
 * Reads a signed amount out of free text.
 *
 * Returns null for anything else — a plain `15`, a letter, an empty field — so
 * the caller can disable rather than guess. `15` could mean fifteen damage or
 * fifteen healing, and silently picking one is how a character loses a fight to
 * a stray click.
 */
export function parseAdjustment(value: string): number | null {
  const match = SIGNED.exec(value.trim());
  if (match?.[1] === undefined || match[2] === undefined) return null;

  const magnitude = Number.parseInt(match[2], 10);
  if (!Number.isFinite(magnitude)) return null;
  return match[1] === "-" ? -magnitude : magnitude;
}
