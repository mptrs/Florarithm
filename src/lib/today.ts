/**
 * The calendar day, as something a screen can re-render on.
 *
 * Every count of days is read at render, and a phone keeps the page alive
 * overnight: put away after the evening's watering and picked up the next
 * morning, nothing in the store has changed, so nothing would redraw and the
 * screen would still be telling yesterday. This changes when the day does —
 * at midnight while the page is open, and on coming back to it.
 */

import { useSyncExternalStore } from 'react'
import { addDays, todayInputValue } from './date'

function subscribe(onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>
  const atMidnight = () => {
    timer = setTimeout(
      () => {
        onChange()
        atMidnight()
      },
      // A second past, so the new day is the one read.
      addDays(new Date(), 1).getTime() - Date.now() + 1000,
    )
  }
  atMidnight()

  document.addEventListener('visibilitychange', onChange)
  window.addEventListener('focus', onChange)
  return () => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onChange)
    window.removeEventListener('focus', onChange)
  }
}

/** `2026-10-03`. Only its changing matters; the value is there to compare. */
export function useToday(): string {
  return useSyncExternalStore(subscribe, todayInputValue, todayInputValue)
}
