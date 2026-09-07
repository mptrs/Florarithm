/**
 * Wishlist — everything you want.
 *
 * Its own screen rather than a filter on the collection, which is what it was.
 * A wish has no photograph, no place and no care: it was the one row in that
 * list that had to be built differently, and that is the argument for it not
 * living there. The record is still the same record with one flag flipped —
 * that is a data decision, not a navigation one.
 */

import { wishlist } from '~/data/selectors'
import { useStore } from '~/data/store'
import type { Plant } from '~/data/types'
import { formatSpecies } from '~/lib/format'
import { routes } from '~/lib/router'
import { Button } from '~/ui/Button'
import { EmptyState, Rows, ScreenHeader } from '~/ui/primitives'

export function WishlistScreen() {
  const state = useStore()
  const wishes = wishlist(state)

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
              <WishRow key={plant.code} plant={plant} />
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
    </div>
  )
}

/** A wish is only ever the species and a note — no photo, no name, no page of
 *  its own to visit. The one thing to do with it is the button. */
function WishRow({ plant }: { plant: Plant }) {
  return (
    <div className="flex min-h-touch items-center gap-4 border-b border-line py-2.5 last:border-b-0 lg:px-2.5">
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
      <Button
        size="sm"
        variant="outline"
        icon="plus"
        className="shrink-0 rounded-full border-leaf text-leaf"
        onClick={() => window.location.assign(routes.have(plant.code))}
      >
        Add to collection
      </Button>
    </div>
  )
}
