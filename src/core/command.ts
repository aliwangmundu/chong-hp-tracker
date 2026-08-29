import { RECORD_NAME_MAX_LENGTH } from "./records";

/**
 * A one-line-per-record command language for bulk entry.
 *
 * Typing eight goblins into the panel is eight rounds of click, name, tab,
 * number. One line does the same thing:
 *
 *     Goblin x8 7/7 ac 15 #wave1
 *
 * Everything except the name is optional and order-independent, because the
 * whole point is to type it quickly without remembering a field order.
 */

export type RecordSpec = {
  name: string;
  hp: number;
  maxHp: number;
  ac: string;
  /** Category name to file under, matched case-insensitively. */
  group: string | null;
};

export type ParsedLine =
  | { ok: true; source: string; specs: RecordSpec[] }
  | { ok: false; source: string; error: string };

export const MAX_COUNT = 50;
/** A guard against a pasted wall of text becoming five hundred records. */
export const MAX_LINES = 40;

const AC_MAX = 3;
const HP_MAX = 9999;

const COUNT = /^[x*×](\d+)$/i;
const HP_AND_MAX = /^(\d+)\/(\d+)$/;
const NUMBER = /^\d+$/;
const AC_INLINE = /^ac[:=](.+)$/i;
const GROUP = /^#(.+)$/;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function parseLine(source: string): ParsedLine {
  const tokens = source.trim().split(/\s+/).filter(Boolean);

  const nameWords: string[] = [];
  let count = 1;
  let hp = 0;
  let maxHp = 0;
  let ac = "";
  let group: string | null = null;
  let sawModifier = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? "";

    const asCount = COUNT.exec(token);
    if (asCount?.[1] !== undefined) {
      count = clamp(Number.parseInt(asCount[1], 10), 1, MAX_COUNT);
      sawModifier = true;
      continue;
    }

    const asPair = HP_AND_MAX.exec(token);
    if (asPair?.[1] !== undefined && asPair[2] !== undefined) {
      hp = clamp(Number.parseInt(asPair[1], 10), 0, HP_MAX);
      maxHp = clamp(Number.parseInt(asPair[2], 10), 0, HP_MAX);
      sawModifier = true;
      continue;
    }

    if (NUMBER.test(token)) {
      // Bare number is current HP only. Setting max to match would look
      // helpful and then quietly stop a half-health character healing.
      hp = clamp(Number.parseInt(token, 10), 0, HP_MAX);
      sawModifier = true;
      continue;
    }

    const asAc = AC_INLINE.exec(token);
    if (asAc?.[1] !== undefined) {
      ac = asAc[1].slice(0, AC_MAX);
      sawModifier = true;
      continue;
    }

    // "ac 15" as two tokens, because that is how people type it.
    if (token.toLowerCase() === "ac") {
      const next = tokens[index + 1];
      if (next === undefined) return { ok: false, source, error: "ac needs a value" };
      ac = next.slice(0, AC_MAX);
      index += 1;
      sawModifier = true;
      continue;
    }

    const asGroup = GROUP.exec(token);
    if (asGroup?.[1] !== undefined) {
      group = asGroup[1];
      sawModifier = true;
      continue;
    }

    if (sawModifier) {
      return { ok: false, source, error: `unexpected "${token}"` };
    }
    nameWords.push(token);
  }

  const name = nameWords.join(" ").slice(0, RECORD_NAME_MAX_LENGTH);
  if (name === "") return { ok: false, source, error: "needs a name" };

  const specs: RecordSpec[] = [];
  for (let n = 1; n <= count; n += 1) {
    specs.push({
      // Numbered only when there is more than one, so a single goblin is not
      // called "Goblin 1".
      name:
        count === 1
          ? name
          : `${name} ${n}`.slice(0, RECORD_NAME_MAX_LENGTH),
      hp,
      maxHp,
      ac,
      group,
    });
  }

  return { ok: true, source, specs };
}

export function parseCommand(input: string): ParsedLine[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//"))
    .slice(0, MAX_LINES)
    .map(parseLine);
}

export function summarize(parsed: ParsedLine[]): {
  records: number;
  groups: string[];
  errors: { source: string; error: string }[];
} {
  const groups = new Set<string>();
  let records = 0;
  const errors: { source: string; error: string }[] = [];

  for (const line of parsed) {
    if (!line.ok) {
      errors.push({ source: line.source, error: line.error });
      continue;
    }
    records += line.specs.length;
    for (const spec of line.specs) {
      if (spec.group !== null) groups.add(spec.group);
    }
  }

  return { records, groups: [...groups], errors };
}

/** Shown as placeholder text; kept here so the syntax has one home. */
export const COMMAND_HELP = [
  "Goblin x8 7/7 ac 15 #wave1",
  "Aria 22 ac 16",
  "Boss 120/120",
].join("\n");
