import {
  CATEGORIES,
  type Category,
  type TokenStats,
  type TrackedToken,
  UNPLACED_INDEX,
} from "./types";

export type GroupedTokens = Record<Category, TrackedToken[]>;

function emptyGroups(): GroupedTokens {
  return { PLAYER: [], ADVERSARY: [] };
}

/**
 * Buckets tokens by category and puts each bucket in display order.
 *
 * Tokens that have never been dragged carry index -1 and sort to the end,
 * alphabetically. Ordering is resolved in memory rather than written back to
 * the scene, so simply opening the panel never mutates anyone's map.
 */
export function groupByCategory(tokens: TrackedToken[]): GroupedTokens {
  const groups = emptyGroups();
  for (const token of tokens) groups[token.stats.category].push(token);

  for (const category of CATEGORIES) {
    groups[category].sort((a, b) => {
      const ai =
        a.stats.index === UNPLACED_INDEX
          ? Number.POSITIVE_INFINITY
          : a.stats.index;
      const bi =
        b.stats.index === UNPLACED_INDEX
          ? Number.POSITIVE_INFINITY
          : b.stats.index;
      if (ai !== bi) return ai - bi;

      const byName = a.name.localeCompare(b.name);
      return byName !== 0 ? byName : a.id.localeCompare(b.id);
    });
  }

  return groups;
}

export type MoveResult = {
  groups: GroupedTokens;
  patches: Map<string, Partial<TokenStats>>;
};

/**
 * Moves one token to a position in a (possibly different) category.
 *
 * Returns the new grouping for optimistic rendering plus the minimal set of
 * metadata patches — only rows whose stored category or index actually changed
 * are written back.
 */
export function moveToken(
  groups: GroupedTokens,
  tokenId: string,
  toCategory: Category,
  toIndex: number,
): MoveResult {
  const fromCategory = CATEGORIES.find((category) =>
    groups[category].some((token) => token.id === tokenId),
  );
  if (fromCategory === undefined) {
    return { groups, patches: new Map() };
  }

  // Deep-copy the rows we are about to renumber; the caller's arrays and the
  // token objects inside them stay untouched.
  const copy = (tokens: TrackedToken[]) =>
    tokens.map((token) => ({ ...token, stats: { ...token.stats } }));
  const next: GroupedTokens = {
    PLAYER: copy(groups.PLAYER),
    ADVERSARY: copy(groups.ADVERSARY),
  };

  const fromIndex = next[fromCategory].findIndex(
    (token) => token.id === tokenId,
  );
  const [moved] = next[fromCategory].splice(fromIndex, 1);
  if (moved === undefined) return { groups, patches: new Map() };

  const target = next[toCategory];
  const clamped = Math.max(0, Math.min(toIndex, target.length));
  target.splice(clamped, 0, moved);

  // Renumber both touched categories and collect only the real changes.
  const patches = new Map<string, Partial<TokenStats>>();
  const touched: Category[] =
    fromCategory === toCategory ? [toCategory] : [fromCategory, toCategory];

  for (const category of touched) {
    next[category].forEach((token, index) => {
      const categoryChanged = token.stats.category !== category;
      const indexChanged = token.stats.index !== index;
      if (categoryChanged || indexChanged) {
        patches.set(token.id, { category, index });
      }
      token.stats.index = index;
      token.stats.category = category;
    });
  }

  return { groups: next, patches };
}

/** Flattens grouped tokens back into a single ordered list. */
export function flatten(groups: GroupedTokens): TrackedToken[] {
  return CATEGORIES.flatMap((category) => groups[category]);
}
