/**
 * Whether the undo bar is showing right now.
 *
 * A one-bit signal, split out of `ui/undo.tsx` so `data/sync.ts` can read it
 * without `data` reaching into `ui` — the dependency direction stays one-way.
 * Sync must never push a change out while a person could still undo it
 * locally: see `merge.ts`'s note on why the tombstone rule depends on this.
 */

let pending = false

export function setPendingUndo(value: boolean): void {
  pending = value
}

export function hasPendingUndo(): boolean {
  return pending
}
