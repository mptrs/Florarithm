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
import { Row } from '~/ui/rows'

export function WishlistScreen() {
  const state = useStore()
  const wishes = wishlist(state)

  return (
    <div className="flex flex-col gap-4">
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
            <Button variant="accent" onClick={() => window.location.assign(routes.newWish())}>
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
            block
            className="mt-2 border-dashed"
            onClick={() => window.location.assign(routes.newWish())}
          >
            + Add a wish
          </Button>
        </>
      )}
    </div>
  )
}

/** Species in the serif, the note under it, and the one button that matters. */
function WishRow({ plant }: { plant: Plant }) {
  return (
    <Row className="gap-3">
      <a href={routes.plant(plant.code)} className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-[1.1875rem] leading-6 font-medium">
          {formatSpecies(plant) || plant.name}
        </span>
        {plant.wishNote ? (
          <span className="truncate text-[0.8125rem] text-ink-muted">{plant.wishNote}</span>
        ) : null}
      </a>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full border-leaf text-leaf"
        onClick={() => window.location.assign(routes.have(plant.code))}
      >
        I have this
      </Button>
    </Row>
  )
}
