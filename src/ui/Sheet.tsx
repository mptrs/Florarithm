/**
 * The sheet.
 *
 * It rises from the bottom on a phone, because that is where a thumb is, and
 * becomes a centred panel from `md` up, because a desktop window has no bottom
 * edge worth reaching for. Same component, same content, one breakpoint.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Icon } from './Icon'

type SheetProps = {
  open: boolean
  onClose: () => void
  /** Announced to screen readers, and shown at the top of the sheet. */
  title: string
  /** Given when this sheet replaced another one's contents rather than opening
   *  on its own: a form swaps in where the action list was, instead of a second
   *  sheet stacking on top of the first. */
  onBack?: () => void
  children: ReactNode
}

export function Sheet({ open, onClose, title, onBack, children }: SheetProps) {
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
          'safe-bottom rounded-t-[1.625rem] border-t border-line px-5 pt-2.5 pb-7',
          'md:max-w-lg md:rounded-xl md:border md:px-6 md:pb-6',
        )}
      >
        <div className="mx-auto h-1 w-9 rounded-full bg-line-strong md:hidden" />

        {/* Back on the left, close on the right, title centred between them —
            so the title stays put as the sheet swaps its contents. */}
        <div className="mt-3 mb-1 flex items-center justify-between gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="-ml-2.5 flex size-touch items-center justify-center text-ink-muted active:opacity-70"
            >
              <Icon name="chevronLeft" size={23} />
            </button>
          ) : (
            <span className="size-touch" />
          )}
          <h2 className="font-display text-[1.625rem] leading-8 font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2.5 flex size-touch items-center justify-center text-ink-muted active:opacity-70"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
