/**
 * Collection — everything you have, and everything you want.
 *
 * The wishlist is a filter rather than a separate screen, because a wish and a
 * plant are the same record with one flag flipped. That is also why "I have
 * this" keeps the code, the name and the date it was first written down.
 */

import { useState } from 'react'
import { collectionValue, countOf, filterCollection, vocabName } from '~/data/selectors'
import { useStore } from '~/data/store'
import { daysSinceWater, lastWaterAt } from '~/data/selectors'
import type { Plant } from '~/data/types'
import { formatPrice, formatSpecies, label, plural } from '~/lib/format'
import { COLLECTION_FILTERS, routes, type CollectionFilter } from '~/lib/router'
import { Button } from '~/ui/Button'
import { Chip, ChipStrip } from '~/ui/Chip'
import { SearchField } from '~/ui/fields'
import { CodeBadge, EmptyState, Rows, ScreenHeader } from '~/ui/primitives'
import { Cell, ColumnHeader, Row, RowLink, RowName } from '~/ui/rows'

const FILTER_LABELS: Record<CollectionFilter, string> = {
  all: 'All',
  hydro: 'Hydro',
  'semi-hydro': 'Semi-hydro',
  soil: 'Soil',
  wishlist: 'Wishlist',
  archive: 'Archive',
}

export function CollectionScreen({ filter }: { filter: CollectionFilter }) {
  const state = useStore()
  const [query, setQuery] = useState('')

  const plants = filterCollection(state, filter, query)
  const isWishlist = filter === 'wishlist'

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        title="Collection"
        meta={
          isWishlist ? (
            <>{plural(countOf(state, 'wishlist'), 'wish', 'wishes')} on the list</>
          ) : (
            <>
              <span className="font-mono">{countOf(state, 'all')}</span> plants &nbsp;·&nbsp;{' '}
              <span className="font-mono">{formatPrice(collectionValue(state))}</span> bought
            </>
          )
        }
      />

      <SearchField
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Name, species, code or place"
        aria-label="Search the collection"
      />

      <ChipStrip>
        {COLLECTION_FILTERS.map((candidate) => (
          <Chip
            key={candidate}
            selected={candidate === filter}
            count={candidate === 'wishlist' ? countOf(state, 'wishlist') : undefined}
            onClick={() => window.location.assign(routes.collection(candidate))}
          >
            {FILTER_LABELS[candidate]}
          </Chip>
        ))}
      </ChipStrip>

      {plants.length === 0 ? (
        <EmptyState
          title={query ? 'Nothing matches' : emptyTitle(filter)}
          description={query ? `No plant matches “${query}”.` : emptyDescription(filter)}
          action={
            query ? null : (
              <Button
                variant="accent"
                onClick={() =>
                  window.location.assign(isWishlist ? routes.newWish() : routes.new())
                }
              >
                {isWishlist ? 'Add a wish' : 'Add a plant'}
              </Button>
            )
          }
        />
      ) : isWishlist ? (
        <WishlistRows plants={plants} />
      ) : (
        <CollectionRows plants={plants} />
      )}

      {isWishlist && plants.length > 0 ? (
        <Button
          variant="outline"
          block
          className="mt-2 border-dashed"
          onClick={() => window.location.assign(routes.newWish())}
        >
          + Add a wish
        </Button>
      ) : null}
    </div>
  )
}

function CollectionRows({ plants }: { plants: readonly Plant[] }) {
  const state = useStore()

  return (
    <div>
      <div className="hidden items-center gap-4 border-b border-line-strong pb-2.5 lg:flex">
        <ColumnHeader className="w-24">Code</ColumnHeader>
        <ColumnHeader className="flex-1">Name</ColumnHeader>
        <ColumnHeader className="w-56">Species</ColumnHeader>
        <ColumnHeader className="w-44">Place</ColumnHeader>
        <ColumnHeader className="w-24">System</ColumnHeader>
        <ColumnHeader className="w-16 text-right">Pot</ColumnHeader>
        <ColumnHeader className="w-20 text-right">Paid</ColumnHeader>
        <ColumnHeader className="w-16 text-right">Water</ColumnHeader>
      </div>

      <Rows className="lg:border-t-0">
        {plants.map((plant) => {
          const place = vocabName(state, plant.locationId)
          const days = daysSinceWater(state, plant.code)
          const last = lastWaterAt(state, plant.code)
          const species = formatSpecies(plant)

          return (
            <RowLink key={plant.code} href={routes.plant(plant.code)}>
              <Cell className="hidden w-24 lg:block" mono tone="faint">
                {plant.code}
              </Cell>

              <RowName
                name={plant.name}
                secondary={[species, place].filter((part) => part && part !== '—').join(' · ')}
                hideSecondaryFrom="lg"
              />

              <Cell className="hidden w-56 lg:block">{species}</Cell>
              <Cell className="hidden w-44 lg:block">{place}</Cell>
              <Cell className="hidden w-24 lg:block">{label(plant.system)}</Cell>
              <Cell className="hidden w-16 lg:block" align="end" mono>
                {plant.potSize ?? '—'}
              </Cell>
              <Cell className="hidden w-20 lg:block" align="end" mono>
                {formatPrice(plant.origin.price)}
              </Cell>
              <Cell className="hidden w-16 lg:block" align="end" mono>
                {last ? `${days}d` : '—'}
              </Cell>

              <CodeBadge code={plant.code} tone="quiet" className="lg:hidden" />
            </RowLink>
          )
        })}
      </Rows>
    </div>
  )
}

/** A wish has no watering history, so the row carries a note and one button. */
function WishlistRows({ plants }: { plants: readonly Plant[] }) {
  return (
    <Rows>
      {plants.map((plant) => (
        <Row key={plant.code} className="gap-3">
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
      ))}
    </Rows>
  )
}

function emptyTitle(filter: CollectionFilter): string {
  if (filter === 'wishlist') return 'No wishes yet'
  if (filter === 'archive') return 'Nothing archived'
  return 'No plants yet'
}

function emptyDescription(filter: CollectionFilter): string {
  if (filter === 'wishlist') {
    return 'Plants you want but do not have. One button turns a wish into a plant, keeping its code and its name.'
  }
  if (filter === 'archive') {
    return 'Plants that died, were given away or are resting show up here rather than in the list of things to water.'
  }
  return 'Everything you own, searchable by name, species, code or place.'
}
