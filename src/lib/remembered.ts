import { useState } from 'react'

/**
 * `useState` for a choice the screen should still be showing when you come
 * back to it — a sort, most of all. Opening a plant unmounts the list, and a
 * list that snaps back to its default every time is a list you re-sort every
 * time.
 *
 * Kept in `localStorage`: it is how this device likes to look at things, not
 * part of the collection, so it neither syncs nor goes into a backup. A value
 * that is no longer one of `allowed` (a sort that was renamed or dropped) falls
 * back to the default instead of leaving the switch with nothing selected.
 */
export function useRemembered<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): [T, (value: T) => void] {
  const storageKey = `florarithm:${key}`
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return allowed.includes(stored as T) ? (stored as T) : fallback
    } catch {
      return fallback
    }
  })

  function remember(next: T) {
    setValue(next)
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // Private mode or storage switched off: the choice still holds until the
      // screen is left, which is all it could do before.
    }
  }

  return [value, remember]
}

/**
 * The same, for what is typed into a search field — but only for as long as
 * the app is open. Coming back from a plant you found should find the search
 * still there; opening the app tomorrow should not.
 */
const typed = new Map<string, string>()

export function useTyped(key: string): [string, (value: string) => void] {
  const [value, setValue] = useState(() => typed.get(key) ?? '')
  function remember(next: string) {
    typed.set(key, next)
    setValue(next)
  }
  return [value, remember]
}
