/**
 * A word after the fact.
 *
 * Saving a plant navigates away immediately — back to the page it belongs
 * on, same as every other confirm-and-leave action here — so the confirmation
 * can't live in the screen that triggered it; that component is gone a
 * moment later. It lives at the shell instead, the one thing that survives
 * every route change, and outlives whichever screen asked for it.
 */

import { useSyncExternalStore } from 'react'
import { cn } from '~/lib/cn'
import { Icon } from './Icon'

type Toast = { id: string; message: string }

let toasts: readonly Toast[] = []
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Up on screen for a couple of seconds, then gone — nothing to dismiss. */
export function showToast(message: string): void {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  toasts = [...toasts, { id, message }]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((toast) => toast.id !== id)
    emit()
  }, 2600)
}

export function ToastHost() {
  const current = useSyncExternalStore(subscribe, () => toasts)

  if (current.length === 0) return null

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4',
        // Above the tab bar on a phone, above nothing in particular on a desktop.
        'bottom-24 md:right-6 md:bottom-6 md:left-auto md:items-end md:px-0',
      )}
    >
      {current.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[0.875rem] font-medium text-paper shadow-lg',
            'animate-toast-in',
          )}
        >
          <Icon name="check" size={16} />
          {toast.message}
        </div>
      ))}
    </div>
  )
}
