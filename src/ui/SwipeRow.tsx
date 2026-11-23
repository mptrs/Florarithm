/**
 * A row you can drag.
 *
 * Right reveals the action at its start, left the one at its end — the
 * gesture people already know from Mail. The start is always something
 * ordinary, set in ink (Edit, Still wet); the end is only ever removing, in
 * ember. So left means "take it away" wherever a row can be dragged.
 *
 * On every screen size, by every pointer: a finger, a mouse, and a trackpad's
 * two-finger swipe, which reaches the page as a sideways wheel rather than as
 * a pointer at all. Pointer events cover the first two in one code path; the
 * wheel is the third.
 *
 * A drag is not the only way in. `RowActions` shows the same actions on hover
 * or focus — the visible way for a pointer, and the only one for a keyboard,
 * since the revealed buttons leave the tab order while the row is closed:
 * ninety rows would otherwise be a hundred and eighty tab stops to get past.
 * While a row is dragged open its hover buttons step aside, so a row never
 * shows the same action twice. What is still missing is a keyboard route on a
 * phone; the usual answer is a long-press menu, which is not built.
 */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Icon, type IconName } from './Icon'

/** How far the row travels when open, and how far you have to drag to get
 *  there. Below the threshold it springs back. */
const REVEAL = 88
const THRESHOLD = REVEAL * 0.45
/** Past this the row is being scrolled, not swiped: let the list have it. */
const SLOP = 10
/** A trackpad swipe has no release of its own: the wheel just stops. This long
 *  without a sideways tick is taken for the fingers lifting. */
const WHEEL_REST = 140

export type SwipeAction = {
  /** The word under the icon when dragged open. */
  label: string
  /** What a screen reader hears, with the row's subject in it. */
  ariaLabel: string
  icon: IconName
  onPress: () => void
}

type Side = 'start' | 'end' | null

export function SwipeRow({
  children,
  start,
  end,
  surface = 'surface',
  className,
}: {
  children: ReactNode
  /** Revealed by dragging right. Never a removal. */
  start?: SwipeAction
  /** Revealed by dragging left. Only ever a removal. */
  end?: SwipeAction
  /** The ground the row is drawn on, which has to cover the actions behind it:
   *  a card's surface, or the page's paper. */
  surface?: 'surface' | 'paper'
  className?: string
}) {
  const [offset, setOffset] = useState(0)
  const [open, setOpen] = useState<Side>(null)
  const [dragging, setDragging] = useState(false)
  const startAt = useRef<{ x: number; y: number; from: number } | null>(null)
  const axis = useRef<'undecided' | 'x' | 'y'>('undecided')
  const row = useRef<HTMLDivElement>(null)
  /** Set by a drag that moved the row, so the click a mouse sends on release
   *  does not also follow the link it started on. */
  const dragged = useRef(false)
  /** Where the row actually is, readable synchronously. A quick flick can put
   *  the last move and the release in one batch, and `offset` from render would
   *  still be a frame behind — which reads as a swipe that springs back for no
   *  reason. */
  const current = useRef(0)

  const min = end ? -REVEAL : 0
  const max = start ? REVEAL : 0

  const slide = (to: number) => {
    current.current = to
    setOffset(to)
  }

  const settle = (to: Side) => {
    setOpen(to)
    slide(to === 'end' ? -REVEAL : to === 'start' ? REVEAL : 0)
  }

  const settleWhereItIs = () => {
    const at = current.current
    settle(at <= -THRESHOLD && end ? 'end' : at >= THRESHOLD && start ? 'start' : null)
  }

  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    // The main button only: a right-click is the browser's, not a drag.
    if (event.pointerType === 'mouse' && event.button !== 0) return
    startAt.current = { x: event.clientX, y: event.clientY, from: current.current }
    axis.current = 'undecided'
    dragged.current = false
  }

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const from = startAt.current
    if (!from) return

    const dx = event.clientX - from.x
    const dy = event.clientY - from.y

    if (axis.current === 'undecided') {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (axis.current === 'x') {
        setDragging(true)
        dragged.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        // A mouse that went down on text has begun selecting it.
        window.getSelection()?.removeAllRanges()
      }
    }
    if (axis.current !== 'x') return

    // Only as far as the action behind it, and only towards an action that exists.
    slide(Math.max(min, Math.min(max, from.from + dx)))
  }

  const up = () => {
    if (!startAt.current) return
    startAt.current = null
    if (axis.current !== 'x') return
    axis.current = 'undecided'
    setDragging(false)
    settleWhereItIs()
  }

  // A trackpad's two-finger swipe. Native and not passive, because a sideways
  // swipe the row takes must not also be the browser's swipe back a page.
  // Read through a ref so the listener is added once and still sees this
  // render's actions.
  const restTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wheel = useRef<(event: WheelEvent) => void>(() => {})
  wheel.current = (event) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
    event.preventDefault()
    // Fingers moving right scroll content left: the row follows the fingers.
    slide(Math.max(min, Math.min(max, current.current - event.deltaX)))
    setDragging(true)
    if (restTimer.current) clearTimeout(restTimer.current)
    restTimer.current = setTimeout(() => {
      setDragging(false)
      settleWhereItIs()
    }, WHEEL_REST)
  }

  useEffect(() => {
    const element = row.current
    if (!element) return
    const listener = (event: WheelEvent) => wheel.current(event)
    element.addEventListener('wheel', listener, { passive: false })
    return () => {
      element.removeEventListener('wheel', listener)
      if (restTimer.current) clearTimeout(restTimer.current)
    }
  }, [])

  const press = (action: SwipeAction) => {
    settle(null)
    action.onPress()
  }

  return (
    <div data-open={open !== null || offset !== 0} className="group/swipe relative overflow-hidden">
      {/* Both actions sit behind the row; the row slides off whichever one you
          are pulling towards. Hidden while it is closed — the row is on its own
          compositing layer because of the transform, and a layer edge over a
          saturated panel leaves a hairline seam down every row. */}
      <div
        aria-hidden={offset === 0}
        className={cn('absolute inset-0 flex', offset === 0 && 'invisible')}
      >
        {start ? (
          <button
            type="button"
            onClick={() => press(start)}
            aria-label={start.ariaLabel}
            tabIndex={open === 'start' ? 0 : -1}
            className="flex w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1 bg-ink text-paper"
          >
            <Icon name={start.icon} size={20} />
            <span className="text-[0.6875rem] font-semibold">{start.label}</span>
          </button>
        ) : null}
        <div className="flex-1" />
        {end ? (
          <button
            type="button"
            onClick={() => press(end)}
            aria-label={end.ariaLabel}
            tabIndex={open === 'end' ? 0 : -1}
            className="flex w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1 bg-ember text-on-accent"
          >
            <Icon name={end.icon} size={20} />
            <span className="text-[0.6875rem] font-semibold">{end.label}</span>
          </button>
        ) : null}
      </div>

      <div
        ref={row}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        // A link or a picture would otherwise be picked up and carried off by
        // the browser's own drag the moment a mouse moves with it.
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (!dragged.current) return
          dragged.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
        className={cn(
          'relative',
          surface === 'paper' ? 'bg-paper' : 'bg-surface',
          // No transition mid-drag: the row has to track the pointer exactly.
          dragging ? 'touch-pan-y select-none' : 'touch-pan-y transition-transform duration-200 ease-out',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * The same actions for a pointer, in plain sight: shown on hover and whenever
 * anything inside the row has focus, and out of the way while the row is
 * dragged open. From `md`, where there is a pointer to hover with; a phone
 * has only the drag.
 */
export function RowActions({ start, end }: { start?: SwipeAction; end?: SwipeAction }) {
  return (
    <div className="hidden items-center gap-1 group-data-[open=true]/swipe:invisible md:flex">
      {start ? (
        <button
          type="button"
          onClick={start.onPress}
          aria-label={start.ariaLabel}
          title={start.label}
          className="flex size-touch items-center justify-center rounded-lg text-ink-muted opacity-0 transition duration-200 ease-grow group-hover:opacity-100 focus-visible:opacity-100 hover:bg-sunk hover:text-ink"
        >
          <Icon name={start.icon} size={18} />
        </button>
      ) : null}
      {end ? (
        <button
          type="button"
          onClick={end.onPress}
          aria-label={end.ariaLabel}
          title={end.label}
          className="flex size-touch items-center justify-center rounded-lg text-ember opacity-0 transition duration-200 ease-grow group-hover:opacity-100 focus-visible:opacity-100 hover:bg-ember-tint"
        >
          <Icon name={end.icon} size={18} />
        </button>
      ) : null}
    </div>
  )
}
