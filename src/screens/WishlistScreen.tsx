/**
 * Wishlist — everything you want.
 *
 * Its own screen rather than a filter on the collection, which is what it was.
 * A wish has no photograph, no place and no care: it was the one row in that
 * list that had to be built differently, and that is the argument for it not
 * living there. The record is still the same record with one flag flipped —
 * that is a data decision, not a navigation one.
 */

import { useState } from 'react'
import { wishlist } from '~/data/selectors'
import { deletePlantForever, useStore } from '~/data/store'
import type { Plant } from '~/data/types'
import { formatSpecies } from '~/lib/format'
import { routes } from '~/lib/router'
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
    <div className="flex flex-col gap-4 lg:gap-8">
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
            <Button variant="accent" icon="plus" onClick={() => window.location.assign(routes.newWish())}>
              Add a wish
            </Button>
          }
        />
      ) : (
        <>
          <p className="max-w-prose text-[0.9375rem] leading-6 text-ink-muted text-pretty">
            Plants you want but do not have. One button turns a wish into a plant, keeping its code
            and its name.
          </p>

          <Rows>
            {wishes.map((plant) => (
              <WishRow key={plant.code} plant={plant} onDelete={() => void remove(plant)} />
            ))}
          </Rows>

          <Button
            variant="outline"
            icon="plus"
            block
            className="mt-2 border-dashed"
            onClick={() => window.location.assign(routes.newWish())}
          >
            Add a wish
          </Button>
        </>
      )}

      {confirmDialog}
    </div>
  )
}

/** A wish is only ever the species and a note — no photo, no name, no page of
 *  its own to visit: the one thing to do with it used to be the button, and
 *  now there are three — add it, edit it, drop it — which is what turns the
 *  button into a split one instead of three of them competing for the row's
 *  width. */
function WishRow({ plant, onDelete }: { plant: Plant; onDelete: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-touch items-center gap-4 border-b border-line px-2.5 py-2.5 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-display text-[1.09375rem] leading-[1.375rem] font-medium">
          {formatSpecies(plant)}
        </span>
        {plant.wishNote ? (
          <span className="truncate text-[0.8125rem] leading-[1.0625rem] text-ink-muted">
            {plant.wishNote}
          </span>
        ) : null}
      </div>

      <div className="relative inline-flex h-touch shrink-0">
        <div className="inline-flex h-touch shrink-0 rounded-md border border-leaf">
          {/* The one action every wish gets, on every screen — text collapses
              to just the icon once the row is too narrow to spell it out
              next to the species and note. */}
          <a
            href={routes.have(plant.code)}
            className="warm flex items-center gap-1.5 rounded-l-md px-3.5 text-[0.875rem] font-semibold text-leaf hover:bg-leaf-tint active:opacity-70"
          >
            <Icon name="plus" size={16} />
            <span className="hidden md:inline">Add to collection</span>
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
                'absolute top-full right-0 z-50 mt-1.5 w-44 overflow-hidden',
                'rounded-xl border border-line bg-surface shadow-xl',
                'origin-top-right animate-panel-in motion-reduce:animate-none',
              )}
            >
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
