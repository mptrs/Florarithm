/**
 * The wishlist's order — the one you want most at the top.
 *
 * Each wish carries a `wishRank`, a plain number. Moving a wish gives it a
 * number between its new neighbours, so a move writes one record: sync keeps
 * one `updatedAt` per plant, and rewriting the whole list to move one row
 * would bump every wish for nothing.
 *
 * Halving a gap runs out of room after some fifty moves into the same spot;
 * when it does, or while some wish has no rank at all, the whole list is
 * numbered 1, 2, 3 once and the move goes on from there.
 *
 * Pure. The store writes what this hands back.
 */

import { formatSpecies } from '~/lib/format'
import type { Plant } from './types'

/** Ranked wishes first, by rank; anything not placed yet after them, by name.
 *  Before the first move nothing is placed, which is the old order exactly. */
export function compareWishes(a: Plant, b: Plant): number {
  const ra = a.wishRank
  const rb = b.wishRank
  if (ra !== undefined && rb !== undefined && ra !== rb) return ra - rb
  if (ra !== undefined && rb === undefined) return -1
  if (ra === undefined && rb !== undefined) return 1
  return (formatSpecies(a) || a.name).localeCompare(formatSpecies(b) || b.name)
}

/**
 * The rank a new wish starts with: last on the list. Undefined while no wish
 * has a rank, so it sorts by name among the others until someone starts
 * ordering them.
 */
export function rankForNewWish(wishes: readonly Plant[]): number | undefined {
  let highest: number | undefined
  for (const wish of wishes) {
    if (wish.wishRank !== undefined && (highest === undefined || wish.wishRank > highest)) {
      highest = wish.wishRank
    }
  }
  return highest === undefined ? undefined : highest + 1
}

/**
 * The ranks to write so that `code` lands at `toIndex` in `ordered` (the list
 * as it is on screen now). Only the wishes whose rank changes are in the map;
 * empty when nothing moves.
 */
export function ranksForMove(
  ordered: readonly Plant[],
  code: string,
  toIndex: number,
): Map<string, number> {
  const from = ordered.findIndex((plant) => plant.code === code)
  if (from === -1) return new Map()

  const target = Math.max(0, Math.min(ordered.length - 1, Math.round(toIndex)))
  if (target === from) return new Map()

  const moved = ordered[from]!
  const rest = ordered.filter((_, index) => index !== from)
  const next = [...rest.slice(0, target), moved, ...rest.slice(target)]

  const before = next[target - 1]?.wishRank
  const after = next[target + 1]?.wishRank
  const allRanked = ordered.every((plant) => plant.wishRank !== undefined)

  if (allRanked) {
    const rank =
      before === undefined
        ? after! - 1
        : after === undefined
          ? before + 1
          : (before + after) / 2
    // The gap has run out once the midpoint is one of its own ends.
    if (rank !== before && rank !== after) return new Map([[code, rank]])
  }

  const ranks = new Map<string, number>()
  next.forEach((plant, index) => {
    if (plant.wishRank !== index + 1) ranks.set(plant.code, index + 1)
  })
  return ranks
}
