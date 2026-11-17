/**
 * Wishlist — everything you want.
 *
 * Its own screen rather than a filter on the collection, which is what it was.
 * A wish has no photograph, no place and no care: it was the one row in that
 * list that had to be built differently, and that is the argument for it not
 * living there. The record is still the same record with one flag flipped —
 * that is a data decision, not a navigation one.
 *
 * The list is in the order you want them, the one you want most at the top
 * and numbered: you drag a wish by its number, or move it with the arrow keys
 * once the number has focus. A new wish starts at the bottom.
 */

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { wishlist } from '~/data/selectors'
import { deletePlantForever, moveWish, useStore } from '~/data/store'
import type { Plant } from '~/data/types'
import { formatSpecies } from '~/lib/format'
import { navigate, routes } from '~/lib/router'
import { cn } from '~/lib/cn'
import { Button } from '~/ui/Button'
import { useConfirm } from '~/ui/ConfirmDialog'
import { Icon } from '~/ui/Icon'
import { EmptyState, Rows, ScreenHeader } from '~/ui/primitives'
import { showToast } from '~/ui/toast'

export function WishlistScreen() {
  const state = useStore()
  const wishes = wishlist(state)
  const { confirm, dialog: confirmDialog } = useConfirm()

  const remove = async (plant: Plant) => {
    const confirmed = await confirm({
      title: `Delete ${plant.name}?`,
      message: `Its note goes with it. This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!confirmed) return
    await deletePlantForever(plant.code)
    showToast(`${plant.name} deleted`)
  }

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Wishlist"
        meta={
          <>
            <span className="font-mono">{wishes.length}</span>{' '}
            {wishes.length === 1 ? 'wish' : 'wishes'}
          </>
        }
      />

      {wishes.length === 0 ? (
        <EmptyState
          title="No wishes yet"
          description="Plants you want but do not have. One button turns a wish into a plant, keeping its code and its name."
          action={
            <Button variant="accent" icon="plus" onClick={() => navigate(routes.newWish())}>
              Add a wish
            </Button>
          }
        />
      ) : (
        <>
          <p className="max-w-prose text-[0.9375rem] leading-6 text-ink-muted text-pretty">
            Plants you want but do not have, the one you want most at the top — drag a wish by its
            number to move it. One button turns a wish into a plant, keeping its code and its name.
          </p>

          <OrderedWishes wishes={wishes} onDelete={(plant) => void remove(plant)} />

          <Button
            variant="outline"
            icon="plus"
            block
            className="mt-2 border-dashed"
            onClick={() => navigate(routes.newWish())}
          >
            Add a wish
          </Button>
        </>
      )}

      {confirmDialog}
    </div>
  )
}

/** Where a drag is: which wish, how far it has come, and the rows as they
 *  stood when it started — measured once, since nothing else moves meanwhile. */
type Drag = {
  code: string
  from: number
  pointerId: number
  startY: number
  dy: number
  tops: number[]
  heights: number[]
}

/** Below this a press on the number is a tap, not a drag. */
const DRAG_SLOP = 4

/**
 * The wishes, numbered, in the order you want them. Dragging is by hand —
 * pointer events on the number, the other rows sliding aside — rather than
 * the browser's drag and drop, which does nothing on a phone.
 */
function OrderedWishes({
  wishes,
  onDelete,
}: {
  wishes: readonly Plant[]
  onDelete: (plant: Plant) => void
}) {
  const rows = useRef(new Map<string, HTMLDivElement>())
  const [drag, setDrag] = useState<Drag | null>(null)
  // The order just dropped, held until the store has it: the write is a
  // database round trip, and without this the row would jump back for a frame.
  const [held, setHeld] = useState<readonly string[] | null>(null)

  const order = wishes.map((plant) => plant.code).join(' ')
  useEffect(() => setHeld(null), [order])

  const byCode = new Map(wishes.map((plant) => [plant.code, plant]))
  const shown =
    held && held.length === wishes.length && held.every((code) => byCode.has(code))
      ? held.map((code) => byCode.get(code)!)
      : wishes

  const target = drag ? dropIndex(drag) : null

  const start = (event: PointerEvent<HTMLButtonElement>, code: string, from: number) => {
    if (shown.length < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return
    const measured = shown.map((plant) => rows.current.get(plant.code)?.getBoundingClientRect())
    if (measured.some((rect) => !rect)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      code,
      from,
      pointerId: event.pointerId,
      startY: event.clientY,
      dy: 0,
      tops: measured.map((rect) => rect!.top),
      heights: measured.map((rect) => rect!.height),
    })
  }

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    setDrag({ ...drag, dy: event.clientY - drag.startY })
  }

  const end = (event: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    setDrag(null)
    if (cancelled || Math.abs(drag.dy) < DRAG_SLOP) return
    const to = dropIndex(drag)
    if (to === drag.from) return
    place(drag.code, to)
  }

  const place = (code: string, to: number) => {
    const codes = shown.map((plant) => plant.code)
    const from = codes.indexOf(code)
    codes.splice(from, 1)
    codes.splice(to, 0, code)
    setHeld(codes)
    void moveWish(code, to)
  }

  const key = (event: KeyboardEvent<HTMLButtonElement>, code: string, index: number) => {
    const to =
      event.key === 'ArrowUp'
        ? index - 1
        : event.key === 'ArrowDown'
          ? index + 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? shown.length - 1
              : null
    if (to === null) return
    event.preventDefault()
    if (to < 0 || to >= shown.length || to === index) return
    place(code, to)
  }

  return (
    <Rows>
      {shown.map((plant, index) => {
        const dragging = drag?.code === plant.code
        let offset = 0
        let position = index
        if (drag && target !== null) {
          const height = drag.heights[drag.from]!
          if (dragging) {
            offset = drag.dy
            position = target
          } else if (drag.from < target && index > drag.from && index <= target) {
            offset = -height
            position = index - 1
          } else if (target < drag.from && index >= target && index < drag.from) {
            offset = height
            position = index + 1
          }
        }

        return (
          <WishRow
            key={plant.code}
            plant={plant}
            number={position + 1}
            total={shown.length}
            first={index === 0}
            dragging={dragging}
            sliding={drag !== null && !dragging}
            offset={offset}
            rowRef={(element) => {
              if (element) rows.current.set(plant.code, element)
              else rows.current.delete(plant.code)
            }}
            onGripDown={(event) => start(event, plant.code, index)}
            onGripMove={move}
            onGripUp={(event) => end(event, false)}
            onGripCancel={(event) => end(event, true)}
            onGripKey={(event) => key(event, plant.code, index)}
            onToTop={() => place(plant.code, 0)}
            onDelete={() => onDelete(plant)}
          />
        )
      })}
    </Rows>
  )
}

/** The slot the dragged row's middle is over: how many of the other rows have
 *  their own middle above it. */
function dropIndex(drag: Drag): number {
  const middle = drag.tops[drag.from]! + drag.heights[drag.from]! / 2 + drag.dy
  let index = 0
  drag.tops.forEach((top, i) => {
    if (i !== drag.from && top + drag.heights[i]! / 2 < middle) index += 1
  })
  return index
}

/** A wish is only ever the species and a note — no photo, no name, no page of
 *  its own to visit: the one thing to do with it used to be the button, and
 *  now there are three — add it, edit it, drop it — which is what turns the
 *  button into a split one instead of three of them competing for the row's
 *  width. */
function WishRow({
  plant,
  number,
  total,
  first,
  dragging,
  sliding,
  offset,
  rowRef,
  onGripDown,
  onGripMove,
  onGripUp,
  onGripCancel,
  onGripKey,
  onToTop,
  onDelete,
}: {
  plant: Plant
  /** Its place as it stands on screen, mid-drag included. */
  number: number
  total: number
  first: boolean
  dragging: boolean
  /** Another row is being dragged, and this one may have to make way. */
  sliding: boolean
  offset: number
  rowRef: (element: HTMLDivElement | null) => void
  onGripDown: (event: PointerEvent<HTMLButtonElement>) => void
  onGripMove: (event: PointerEvent<HTMLButtonElement>) => void
  onGripUp: (event: PointerEvent<HTMLButtonElement>) => void
  onGripCancel: (event: PointerEvent<HTMLButtonElement>) => void
  onGripKey: (event: KeyboardEvent<HTMLButtonElement>) => void
  onToTop: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const name = formatSpecies(plant) || plant.name

  return (
    <div
      ref={rowRef}
      style={offset ? { transform: `translateY(${offset}px)` } : undefined}
      className={cn(
        'relative flex min-h-touch items-center gap-2 border-b border-line bg-paper py-3 pr-3 pl-1 last:border-b-0',
        dragging && 'z-20 rounded-md border-transparent bg-surface shadow-xl',
        sliding && 'transition-transform duration-200 ease-grow motion-reduce:transition-none',
      )}
    >
      {/* The number is the handle: what you see is where the wish stands, and
          what you take hold of to move it. A single wish has nowhere to go. */}
      <button
        type="button"
        disabled={total < 2}
        aria-label={`${name}, number ${number} of ${total}. Arrow keys move it.`}
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={onGripUp}
        onPointerCancel={onGripCancel}
        onKeyDown={onGripKey}
        className={cn(
          'group flex h-touch w-11 shrink-0 touch-none items-center justify-center gap-1 rounded-md select-none',
          'focus-visible:outline-2 focus-visible:outline-leaf',
          total < 2 ? 'cursor-default' : dragging ? 'cursor-grabbing' : 'cursor-grab hover:bg-sunk',
        )}
      >
        <Icon
          name="grip"
          size={14}
          className={cn(
            'text-ink-faint transition-opacity',
            total < 2 ? 'hidden' : dragging ? 'opacity-100' : 'opacity-40 group-hover:opacity-100',
          )}
        />
        <span className="min-w-[1ch] font-display text-[1.09375rem] leading-[1.375rem] font-medium text-ink-muted tabular-nums">
          {number}
        </span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-display text-[1.09375rem] leading-[1.375rem] font-medium">
          {name}
        </span>
        {plant.wishNote ? (
          <span className="truncate text-[0.8125rem] leading-[1.0625rem] text-ink-muted">
            {plant.wishNote}
          </span>
        ) : null}
      </div>

      <div className="relative inline-flex h-touch shrink-0">
        <div className="inline-flex h-touch shrink-0 rounded-md border border-leaf">
          {/* The one action every wish gets, on every screen — the visible
              label collapses to just the icon once the row is too narrow to
              spell it out next to the species and note, but `aria-label`
              keeps the link's own name from collapsing with it. */}
          <a
            href={routes.have(plant.code)}
            aria-label="Add to collection"
            className="warm flex items-center gap-1 rounded-l-md px-4 text-[0.875rem] font-semibold text-leaf hover:bg-leaf-tint active:opacity-70"
          >
            <Icon name="plus" size={16} />
            <span className="hidden md:inline" aria-hidden="true">
              Add to collection
            </span>
          </a>

          <span className="w-px shrink-0 bg-leaf/30" aria-hidden />

          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="More for this wish"
            onClick={() => setOpen((was) => !was)}
            className="warm flex w-8 items-center justify-center rounded-r-md text-leaf hover:bg-leaf-tint active:opacity-70"
          >
            <Icon
              name="chevronDown"
              size={16}
              className={cn('transition-[rotate] duration-200 ease-grow', open ? 'rotate-180' : '')}
            />
          </button>
        </div>

        {open ? (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              role="menu"
              aria-label="More for this wish"
              className={cn(
                'absolute top-full right-0 z-50 mt-2 w-44 overflow-hidden',
                'rounded-xl border border-line bg-surface shadow-xl',
                'origin-top-right animate-panel-in motion-reduce:animate-none',
              )}
            >
              {first ? null : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false)
                    onToTop()
                  }}
                  className="warm flex h-11 w-full items-center gap-3 border-b border-line px-4 text-left text-[0.9375rem] font-medium text-ink hover:bg-sunk active:opacity-70"
                >
                  <Icon name="toTop" size={17} />
                  Move to top
                </button>
              )}
              <a
                href={routes.edit(plant.code)}
                role="menuitem"
                className="warm flex h-11 items-center gap-3 border-b border-line px-4 text-left text-[0.9375rem] font-medium text-ink hover:bg-sunk active:opacity-70"
              >
                <Icon name="edit" size={17} />
                Edit
              </a>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onDelete()
                }}
                className="warm flex h-11 w-full items-center gap-3 px-4 text-left text-[0.9375rem] font-medium text-ember hover:bg-ember-tint active:opacity-70"
              >
                <Icon name="trash" size={17} />
                Delete
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
