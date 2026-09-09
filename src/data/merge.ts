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
 * Events never change after creation except two flags, and both of them only
 * ever go one way: `deleted`, and `photo` once a picture is taken for an entry.
 * So the only possible disagreement between two copies of the same id is
 * resolved with a monotonic OR on each — a tombstone is never flipped back off,
 * and a photograph one device knows about is never dropped because the other
 * had not heard of it yet.
 *
 * `fertilized` is deliberately *not* one of them. A day's watering can be
 * corrected in both directions — pressing water after fertiliser says it was
 * plain water after all — so there is no direction to resolve towards, and an
 * OR would make the correction impossible to sync rather than merely lossy.
 * Two devices amending the same day before syncing is left as the rare case it
 * is: one of the two amendments wins and the other is visible in the log to be
 * fixed by hand.
 *
 * Nothing removes an event outright any more — deleting one sets the flag and
 * the row stays — so a push can go out at any moment without a merge handing
 * back something a person has already taken away.
 *
 * Two devices photographing the same entry before either has synced is the one
 * case this does not resolve cleanly: both carry a `photo`, `a` keeps its own,
 * and whichever file reached the repo first is the one everybody ends up
 * looking at. The result is still one entry with one picture.
 */
export function mergeEvents(a: readonly PlantEvent[], b: readonly PlantEvent[]): MergeResult<PlantEvent> {
  const fromA = new Map<string, PlantEvent>()
  for (const event of a) fromA.set(event.id, event)

  const merged = new Map(fromA)
  for (const event of b) {
    const existing = merged.get(event.id)
    if (!existing) {
      merged.set(event.id, event)
      continue
    }

    const deleted = existing.deleted || event.deleted
    const photo = existing.photo ?? event.photo
    if (deleted === existing.deleted && photo === existing.photo) continue

    merged.set(event.id, {
      ...existing,
      ...(deleted ? { deleted: true } : {}),
      ...(photo ? { photo } : {}),
    } as PlantEvent)
  }

  const changed =
    merged.size !== fromA.size ||
    [...merged].some(([id, event]) => {
      const before = fromA.get(id)
      return before?.deleted !== event.deleted || before?.photo !== event.photo
    })

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
