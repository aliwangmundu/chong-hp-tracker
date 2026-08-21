import OBR, { type Metadata } from "@owlbear-rodeo/sdk";
import { getPluginId } from "./pluginId";
import type { PortableStats } from "./types";

export const PERSISTENCE_KEY = getPluginId("persisted");

export type PersistedStore = Record<string, PortableStats>;

/**
 * Identity for a token that outlives the scene it is standing in.
 *
 * Item ids are minted per scene, so they cannot be the key. Image URL plus
 * name is what a person means by "the same character": the art pins down which
 * token it is, and the name separates two goblins built from one image. Rename
 * a character and it starts a fresh history, which is the behaviour you want
 * when a name change usually means it became a different creature.
 */
export function persistenceKey(name: string, imageUrl: string): string {
  return `${imageUrl}::${name.trim().toLowerCase()}`;
}

function readInt(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : 0;
}

export function parseStore(metadata: Metadata): PersistedStore {
  const raw = metadata[PERSISTENCE_KEY];
  if (typeof raw !== "object" || raw === null) return {};

  const store: PersistedStore = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "object" || value === null) continue;
    const source = value as Record<string, unknown>;
    store[key] = {
      hp: readInt(source, "hp"),
      extraHp: readInt(source, "extraHp"),
      maxHp: readInt(source, "maxHp"),
      ac: typeof source["ac"] === "string" ? source["ac"] : "",
    };
  }
  return store;
}

/**
 * The store lives in *room* metadata, not scene metadata.
 *
 * That is the whole mechanism: room metadata is scoped to the room and outlives
 * any individual scene, so stats written here survive switching maps.
 */
export async function readStore(): Promise<PersistedStore> {
  return parseStore(await OBR.room.getMetadata());
}

export async function writeStore(store: PersistedStore): Promise<void> {
  await OBR.room.setMetadata({ [PERSISTENCE_KEY]: store });
}

export function samePortableStats(
  a: PortableStats,
  b: PortableStats,
): boolean {
  return (
    a.hp === b.hp &&
    a.extraHp === b.extraHp &&
    a.maxHp === b.maxHp &&
    a.ac === b.ac
  );
}
