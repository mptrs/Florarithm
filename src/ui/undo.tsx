/**
 * The undo bar.
 *
 * Not optional. Logging is one tap with no confirmation, so there has to be a
 * way back — and it has to say what it did, in the past tense, with the plant
 * named, because you may be two rooms away by the time you read it.
 *
 * A module store rather than context: an action is fired from a screen, a
 * sheet, or a list row, and none of them should have to be wrapped in anything
 * to do it.
 */

import { useSyncExternalStore } from 'react'
import type { UndoAction } from '~/data/store'
import { setPendingUndo } from '~/lib/pendingUndo'
import { Icon } from './Icon'

const VISIBLE_MS = 6000

type Pending = UndoAction & { id: number }

let pending: Pending | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let sequence = 0

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function clearTimer(): void {
  if (timer) clearTimeout(timer)
  timer = null
}

/** Show a bar for an action that just happened. */
export function offerUndo(action: UndoAction | null): void {
  if (!action) return

  clearTimer()
  sequence += 1
  pending = { ...action, id: sequence }
  setPendingUndo(true)
  emit()

  timer = setTimeout(() => {
    pending = null
    setPendingUndo(false)
    timer = null
    emit()
  }, VISIBLE_MS)
}

export function dismissUndo(): void {
  clearTimer()
  pending = null
  setPendingUndo(false)
  emit()
}

/** Wrap an action-returning call so the bar appears without every caller
 *  remembering to ask for it. */
export async function withUndo(run: () => Promise<UndoAction | null>): Promise<void> {
  offerUndo(await run())
}

function getPending(): Pending | null {
  return pending
}

export function UndoBar() {
  const action = useSyncExternalStore(subscribe, getPending, () => null)
  if (!action) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] md:pb-6"
    >
      <div className="pointer-events-auto flex h-13 w-full max-w-md items-center gap-3 rounded-md bg-ink pr-2 pl-4 text-paper shadow-lg">
        <span className="flex-1 truncate text-[0.9375rem]">{action.message}</span>
        <button
          type="button"
          onClick={() => {
            const { undo } = action
            dismissUndo()
            void undo()
          }}
          className="flex h-touch items-center gap-1.5 rounded-sm px-3.5 text-[0.875rem] font-semibold tracking-[0.08em] active:opacity-70"
        >
          <Icon name="close" size={15} />
          UNDO
        </button>
      </div>
    </div>
  )
}
