import { type Image, type Item, isImage } from "@owlbear-rodeo/sdk";
import type { AssignableToken } from "./types";

/** Tokens a record can be linked to: images the players actually push around. */
export function isAssignableItem(item: Item): item is Image {
  return (item.layer === "CHARACTER" || item.layer === "MOUNT") && isImage(item);
}

export function toAssignableToken(item: Image): AssignableToken {
  return {
    id: item.id,
    name: item.text?.plainText || item.name,
    imageUrl: item.image.url,
  };
}

/**
 * Index of the scene's tokens by id.
 *
 * A record holds only an id, so every lookup — the thumbnail, the name, whether
 * the token still exists at all — goes through this.
 */
export function indexTokens(items: Item[]): Map<string, AssignableToken> {
  const index = new Map<string, AssignableToken>();
  for (const item of items) {
    if (isAssignableItem(item)) index.set(item.id, toAssignableToken(item));
  }
  return index;
}
