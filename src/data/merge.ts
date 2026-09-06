/**
 * Reconciling two copies of the collection — this device's and the private
 * repo's — into one. Pure and synchronous: no I/O, no clock reads, so it can
 * be tested without a network or a fake timer.
 *
 * `changed` on each result means "the merge produced something different from
 * what this device already had," which is what tells the caller whether a
 * `replaceEverything` write-back to IndexedDB is worth doing. Whether the
 * *remote* needs a push is a separate question the sync engine answers itself
 * by comparing the merged file's serialised text against what it fetched —
 * this module has no notion of "remote" versus "local," only "a" and "b".
 */

import type { Plant, PlantEvent, VocabItem } from './types'
import type { Snapshot } from './db'

export type MergeResult<T> = { merged: T[]; changed: boolean }

/** Keyed union with last-write-wins by `updatedAt` on conflict. Whichever
 *  side is missing a record just contributes it; whichever side has the
 *  newer `updatedAt` on a shared key wins outright, not field by field. */
function mergeByKeyLWW<T extends { updatedAt: string }>(
  a: readonly T[],
  keyOf: (item: T) => string,
  b: readonly T[],
): MergeResult<T> {
  const fromA = new Map<string, T>()
  for (const item of a) fromA.set(keyOf(item), item)

  const merged = new Map(fromA)
  for (const item of b) {
    const existing = merged.get(keyOf(item))
    if (!existing || item.updatedAt > existing.updatedAt) merged.set(keyOf(item), item)
  }

  const changed = [...merged].some(([key, item]) => fromA.get(key) !== item) || merged.size !== fromA.size
  return { merged: [...merged.values()], changed }
}

export function mergePlants(a: readonly Plant[], b: readonly Plant[]): MergeResult<Plant> {
  return mergeByKeyLWW(a, (plant) => plant.code, b)
}

export function mergeVocab(a: readonly VocabItem[], b: readonly VocabItem[]): MergeResult<VocabItem> {
  return mergeByKeyLWW(a, (item) => item.id, b)
}

/**
 * Events never change after creation except the `deleted` tombstone flag, so
 * the only possible disagreement between two copies of the same id is that
 * flag — resolved with a monotonic OR, never flipping a tombstone back off.
 *
 * Nothing removes an event outright any more — deleting one sets the flag and
 * the row stays — so a push can go out at any moment without a merge handing
 * back something a person has already taken away.
 */
export function mergeEvents(a: readonly PlantEvent[], b: readonly PlantEvent[]): MergeResult<PlantEvent> {
  const fromA = new Map<string, PlantEvent>()
  for (const event of a) fromA.set(event.id, event)

  const merged = new Map(fromA)
  for (const event of b) {
    const existing = merged.get(event.id)
    if (!existing) {
      merged.set(event.id, event)
    } else if (event.deleted && !existing.deleted) {
      merged.set(event.id, { ...existing, deleted: true } as PlantEvent)
    }
  }

  const changed =
    merged.size !== fromA.size ||
    [...merged].some(([id, event]) => fromA.get(id)?.deleted !== event.deleted)

  return { merged: [...merged.values()], changed }
}

export function mergeSnapshots(
  a: Snapshot,
  b: Snapshot,
): { snapshot: Snapshot; changed: boolean } {
  const plants = mergePlants(a.plants, b.plants)
  const events = mergeEvents(a.events, b.events)
  const vocab = mergeVocab(a.vocab, b.vocab)

  return {
    snapshot: { plants: plants.merged, events: events.merged, vocab: vocab.merged },
    changed: plants.changed || events.changed || vocab.changed,
  }
}
