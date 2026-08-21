export type Category = "PLAYER" | "ADVERSARY";

export const CATEGORIES: readonly Category[] = ["PLAYER", "ADVERSARY"] as const;

export const CATEGORY_LABEL: Record<Category, string> = {
  PLAYER: "Players",
  ADVERSARY: "Adversaries",
};

/** Everything this extension stores on a token. */
export type TokenStats = {
  hp: number;
  ac: number;
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

/** Which stat a given input edits. */
export type StatKey = "hp" | "ac";

export const UNPLACED_INDEX = -1;
