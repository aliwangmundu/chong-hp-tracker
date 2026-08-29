import { newEntryId } from "./entries";
import { getPluginId } from "./pluginId";

export const CATEGORIES_KEY = getPluginId("categories");

export const CATEGORY_NAME_MAX_LENGTH = 24;

/**
 * A group of records that can be hidden from players as a unit.
 *
 * Anyone can make one. Hiding is a property of the category rather than of each
 * record, so a GM drops a monster into "Wave 2" and it is hidden by the act of
 * filing it — no second step to forget.
 */
export type CategoryDef = {
  id: string;
  name: string;
  /** Players do not see this category or anything in it. The GM always does. */
  hidden: boolean;
};

/**
 * New categories start hidden.
 *
 * The reason to make one mid-session is usually to stage something the party
 * should not see yet, and a category that reveals itself the moment it is
 * created cannot be un-revealed.
 */
export function newCategory(name = ""): CategoryDef {
  return {
    id: newEntryId(),
    name: name.slice(0, CATEGORY_NAME_MAX_LENGTH),
    hidden: true,
  };
}

export function parseCategories(
  metadata: Record<string, unknown>,
): CategoryDef[] {
  const raw = metadata[CATEGORIES_KEY];
  if (!Array.isArray(raw)) return [];

  const categories: CategoryDef[] = [];
  for (const value of raw) {
    if (typeof value !== "object" || value === null) continue;
    const source = value as Record<string, unknown>;
    if (typeof source["id"] !== "string") continue;

    categories.push({
      id: source["id"],
      name:
        typeof source["name"] === "string"
          ? source["name"].slice(0, CATEGORY_NAME_MAX_LENGTH)
          : "",
      // Anything unreadable is treated as hidden: revealing by accident is the
      // failure that matters here.
      hidden: source["hidden"] !== false,
    });
  }
  return categories;
}

export function withCategory(
  categories: CategoryDef[],
  id: string,
  patch: Partial<CategoryDef>,
): CategoryDef[] {
  return categories.map((category) =>
    category.id === id ? { ...category, ...patch } : category,
  );
}

export function withoutCategory(
  categories: CategoryDef[],
  id: string,
): CategoryDef[] {
  return categories.filter((category) => category.id !== id);
}

export function moveCategory(
  categories: CategoryDef[],
  from: number,
  to: number,
): CategoryDef[] {
  if (from === to || from < 0 || from >= categories.length) return categories;
  const next = [...categories];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return categories;
  next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
  return next;
}
