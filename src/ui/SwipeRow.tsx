/**
 * A history row you can drag.
 *
 * Left reveals Delete, right reveals Edit — the gesture people already know
 * from Mail. There is no undo bar behind this any more, so the delete has to
 * live somewhere you can find it deliberately, and the edit has to be as easy
 * to reach as the mistake was to make.
 *
 * Pointer events rather than touch events: one code path covers a finger, a
 * trackpad and a mouse, all three.
 *
 * The gesture is not the only way in, and the two ways never overlap: from `md`
 * up the drag is off and `RowActions` shows the same two buttons on hover or
 * focus instead. What is still missing is a keyboard route on a phone — the
 * swipe buttons leave the tab order while the row is closed, because ninety
 * rows would otherwise be a hundred and eighty tab stops to get past, and the
 * usual answer is a long-press menu, which is not built yet.
 */

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Icon } from './Icon'

/** How far the row travels when open, and how far you have to drag to get
 *  there. Below the threshold it springs back. */
const REVEAL = 88
const THRESHOLD = REVEAL * 0.45
/** Past this the row is being scrolled, not swiped: let the list have it. */
const SLOP = 10

type Side = 'edit' | 'delete' | null

export function SwipeRow({
  children,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  className,
}: {
  children: ReactNode
  onEdit?: () => void
  onDelete: () => void
  editLabel: string
  deleteLabel: string
  className?: string
}) {
  const [offset, setOffset] = useState(0)
  const [open, setOpen] = useState<Side>(null)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; from: number } | null>(null)
  const axis = useRef<'undecided' | 'x' | 'y'>('undecided')
  const actions = useRef<HTMLDivElement>(null)
  /** Where the row actually is, readable synchronously. A quick flick can put
   *  the last move and the release in one batch, and `offset` from render would
   *  still be a frame behind — which reads as a swipe that springs back for no
   *  reason. */
  const current = useRef(0)

  const slide = (to: number) => {
    current.current = to
    setOffset(to)
  }

  const settle = (to: Side) => {
    setOpen(to)
    slide(to === 'delete' ? -REVEAL : to === 'edit' ? REVEAL : 0)
  }

  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Where the hover buttons are shown the drag is switched off, so a row
    // never carries two buttons for the same action. Asking the actions layer
    // whether it is displayed keeps that in step with the breakpoint without
    // measuring the viewport in JavaScript.
    if (!actions.current || getComputedStyle(actions.current).display === 'none') return
    start.current = { x: event.clientX, y: event.clientY, from: current.current }
    axis.current = 'undecided'
  }

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const from = start.current
    if (!from) return

    const dx = event.clientX - from.x
    const dy = event.clientY - from.y

    if (axis.current === 'undecided') {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (axis.current === 'x') {
        setDragging(true)
        event.currentTarget.setPointerCapture(event.pointerId)
      }
    }
    if (axis.current !== 'x') return

    // Only as far as the action behind it, and only towards an action that exists.
    const next = from.from + dx
    const max = onEdit ? REVEAL : 0
    slide(Math.max(-REVEAL, Math.min(max, next)))
  }

  const up = () => {
    if (!start.current) return
    start.current = null
    if (axis.current !== 'x') return
    axis.current = 'undecided'
    setDragging(false)
    const at = current.current
    settle(at <= -THRESHOLD ? 'delete' : at >= THRESHOLD && onEdit ? 'edit' : null)
  }

  const close = () => settle(null)

  return (
    <div className="relative overflow-hidden">
      {/* Both actions sit behind the row; the row slides off whichever one you
          are pulling towards. Hidden while it is closed — the row is on its own
          compositing layer because of the transform, and a layer edge over a
          saturated panel leaves a hairline seam down every row. */}
      <div
        ref={actions}
        aria-hidden={offset === 0}
        className={cn('absolute inset-0 flex md:hidden', offset === 0 && 'invisible')}
      >
        {onEdit ? (
          <button
            type="button"
            onClick={() => {
              close()
              onEdit()
            }}
            aria-label={editLabel}
            tabIndex={open === 'edit' ? 0 : -1}
            className="flex w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1 bg-ink text-paper"
          >
            <Icon name="pencil" size={20} />
            <span className="text-[0.6875rem] font-semibold">Edit</span>
          </button>
        ) : null}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => {
            close()
            onDelete()
          }}
          aria-label={deleteLabel}
          tabIndex={open === 'delete' ? 0 : -1}
          className="flex w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1 bg-ember text-on-accent"
        >
          <Icon name="trash" size={20} />
          <span className="text-[0.6875rem] font-semibold">Delete</span>
        </button>
      </div>

      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
        className={cn(
          'relative bg-surface',
          // No transition mid-drag: the row has to track the finger exactly.
          dragging ? 'touch-pan-y' : 'touch-pan-y transition-transform duration-200 ease-out',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** The same two actions for a pointing device, where there is nothing to drag.
 *  Shown on hover and whenever anything inside the row has focus. */
export function RowActions({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
}: {
  onEdit?: () => void
  onDelete: () => void
  editLabel: string
  deleteLabel: string
}) {
  return (
    <div className="hidden items-center gap-1 md:flex">
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          className="flex size-touch items-center justify-center rounded-lg text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-sunk"
        >
          <Icon name="pencil" size={18} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDelete}
        aria-label={deleteLabel}
        className="flex size-touch items-center justify-center rounded-lg text-ember opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-ember-tint"
      >
        <Icon name="trash" size={18} />
      </button>
    </div>
  )
}
