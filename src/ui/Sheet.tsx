/**
 * The sheet that holds everything the WATER button is not.
 *
 * It rises from the bottom on a phone, because that is where a thumb is, and
 * becomes a centred panel from `md` up, because a desktop window has no bottom
 * edge worth reaching for. Same component, same content, one breakpoint.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '~/lib/cn'

type SheetProps = {
  open: boolean
  onClose: () => void
  /** Announced to screen readers, and shown at the top of the sheet. */
  title: string
  /** Small print beside the title — a plant code, usually. */
  meta?: ReactNode
  children: ReactNode
}

export function Sheet({ open, onClose, title, meta, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    // Stop the page behind from scrolling while the sheet is up.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    panel.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/45"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative max-h-[88vh] w-full overflow-y-auto bg-surface outline-none',
          'safe-bottom rounded-t-[14px] border-t border-line px-4 pt-2.5 pb-6',
          'md:max-w-lg md:rounded-lg md:border md:px-6 md:pb-6',
        )}
      >
        <div className="mx-auto mb-3.5 h-1 w-9 rounded-full bg-line-strong md:hidden" />

        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-title">{title}</h2>
          {meta}
        </div>

        {children}
      </div>
    </div>
  )
}

/** A tappable row inside a sheet: one icon, one label, logs and closes. */
export function SheetAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3.5 border-b border-line text-left text-[1.0625rem] text-ink last:border-b-0 active:opacity-70"
    >
      <span className="text-leaf">{icon}</span>
      {label}
    </button>
  )
}
