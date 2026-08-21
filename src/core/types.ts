export type Category = "PLAYER" | "ADVERSARY";

export const CATEGORIES: readonly Category[] = ["PLAYER", "ADVERSARY"] as const;

/**
 * The stored key stays "PLAYER" while the label reads "Allies" — renaming the
 * key would orphan the category on every token already saved in a scene.
 */
export const CATEGORY_LABEL: Record<Category, string> = {
  PLAYER: "Allies",
  ADVERSARY: "Adversaries",
};

/** Everything this extension stores on a token. */
export type TokenStats = {
  hp: number;
  /** Added to HP for the bubble on the token. Temporary hit points. */
  extraHp: number;
  /** Recorded but never drawn on the map. */
  maxHp: number;
  /** Free text so "M", "?" or "18" are all valid. */
  ac: string;
  category: Category;
  /** Sort position within the token's category. -1 means "not placed yet". */
  index: number;
};

/** Which stats are actually being tracked, so bubbles only show when asked for. */
export type TrackedStats = {
  hp: boolean;
  ac: boolean;
};

/** A token as the UI sees it: scene identity plus its stats. */
export type TrackedToken = {
  id: string;
  name: string;
  imageUrl: string;
  visible: boolean;
  stats: TokenStats;
};

export type NumericStatKey = "hp" | "extraHp" | "maxHp";
export type StatKey = NumericStatKey | "ac";

export const UNPLACED_INDEX = -1;
