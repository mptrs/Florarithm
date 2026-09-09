/**
 * Collection — everything you have.
 *
 * Two readings of one list, and the difference is a breakpoint. A phone gets
 * tiles, because standing in a room you recognise a plant by sight long before
 * you recognise its name; a desktop gets the ledger, because that is where the
 * columns have room to line up.
 *
 * One rule runs through both: whatever the list is grouped by never repeats
 * itself inside a row. Grouped by place, the drawer label says the room, so the
 * table drops its Place column; sorted A–Z there is no label, so the place
 * moves back in.
 *
 * The species is not part of that trade. It stays on the tile in either order,
 * because on a phone it is the line you are actually reading — the rule is
 * about not saying the room twice, and it used to cost you the species every
 * time you sorted alphabetically.
 *
 * Days since water is here and quiet. Today is the list you water from, and two
 * screens shouting the same number at you means you trust neither.
 */

import { useState } from 'react'
import {
  archivedMatching,
  countOf,
  daysSinceWater,
  filterCollection,
  groupByPlace,
  isArchiveQuery,
  isThirsty,
  vocabName,
  vocabNameOrNone,
} from '~/data/selectors'
import { useStore } from '~/data/store'
import type { Plant } from '~/data/types'
import { cn } from '~/lib/cn'
import { formatSpecies, label } from '~/lib/format'
import { COLLECTION_FILTERS, routes, type CollectionFilter } from '~/lib/router'
import { Button } from '~/ui/Button'
import { Chip, ChipStrip, SortSwitch, type SortOption } from '~/ui/Chip'
import { Dozing } from '~/ui/Dozing'
import { SearchField } from '~/ui/fields'
import { PlantThumb, PlantTile } from '~/ui/plantPicture'
import { EmptyState, ScreenHeader } from '~/ui/primitives'
import { ColumnHeader, DrawerLabel, RowLink } from '~/ui/rows'

/** The systems, and nothing else: the wishlist has its own page now, and the
 *  archive is a word you type rather than a tab stop you pass every day. */
const SYSTEM_FILTERS = COLLECTION_FILTERS.filter(
  (filter) => filter !== 'wishlist' && filter !== 'archive',
)

const FILTER_LABELS: Record<CollectionFilter, string> = {
  all: 'All',
  hydro: 'Hydro',
  'semi-hydro': 'Semi-hydro',
  soil: 'Soil',
  wishlist: 'Wishlist',
  archive: 'Archive',
}

type Sort = 'place' | 'name'

const SORTS = [
  { value: 'place', label: 'By place' },
  { value: 'name', label: 'A–Z' },
] as const satisfies readonly SortOption<Sort>[]

export function CollectionScreen({ filter }: { filter: CollectionFilter }) {
  const state = useStore()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('place')

  const plants = filterCollection(state, filter, query)
  // An old `#collection/archive` link still works, and when it is what you are
  // looking at the drawer would only show you the same plants twice.
  const archived = filter === 'archive' ? [] : archivedMatching(state, query)
  const nothing = plants.length === 0 && archived.length === 0

  return (
    <div className="flex flex-col gap-4 lg:gap-8">
      <ScreenHeader
        title="Collection"
        meta={
          <>
            <span className="font-mono">{countOf(state, 'all')}</span> plants
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <SearchField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, species or place"
          aria-label="Search the collection"
          className="lg:w-76"
        />

        {/* Filtering by system is a desk job: on a phone it cost a whole row
            of chips to narrow a list you were going to look at anyway. */}
        <ChipStrip className="hidden lg:flex">
          {SYSTEM_FILTERS.map((candidate) => (
            <Chip
              key={candidate}
              selected={candidate === filter}
              onClick={() => window.location.assign(routes.collection(candidate))}
            >
              {FILTER_LABELS[candidate]}
            </Chip>
          ))}
        </ChipStrip>

        <div className="hidden lg:block lg:flex-1" />
        <SortSwitch value={sort} options={SORTS} onChange={setSort} />
      </div>

      {nothing ? (
        <EmptyState
          title={query ? 'Nothing matches' : emptyTitle(filter)}
          description={query ? `No plant matches “${query}”.` : emptyDescription(filter)}
          action={
            query ? null : (
              <Button variant="accent" onClick={() => window.location.assign(routes.new())}>
                Add a plant
              </Button>
            )
          }
        />
      ) : plants.length > 0 ? (
        <PlantRuns
          runs={sort === 'place' ? groupByPlace(state, plants) : [['', plants]]}
          showPlace={sort === 'name'}
        />
      ) : null}

      {archived.length > 0 ? <Archive plants={archived} query={query} /> : null}
    </div>
  )
}

/**
 * The list itself, in both renderings.
 *
 * The grid and the table are the same runs of the same plants, collapsed by
 * breakpoint rather than chosen in JavaScript — so the two can never disagree
 * about what is in the collection, and there is no flash of the wrong one.
 */
function PlantRuns({
  runs,
  showPlace,
}: {
  runs: readonly (readonly [string, readonly Plant[]])[]
  showPlace: boolean
}) {
  const state = useStore()

  return (
    <div>
      {/* The table header exists only where there are columns to head. */}
      <div className="hidden items-center gap-4 border-b border-line-strong px-2.5 pb-2.5 lg:flex">
        <span className="w-10 shrink-0" />
        <ColumnHeader className="flex-1">Plant</ColumnHeader>
        <div className="flex items-center gap-8">
          {showPlace ? <ColumnHeader className="w-32">Place</ColumnHeader> : null}
          <ColumnHeader className="w-26">System</ColumnHeader>
          <ColumnHeader className="w-11 text-right">Pot</ColumnHeader>
          <ColumnHeader className="w-16 text-right">Days</ColumnHeader>
        </div>
      </div>

      {runs.map(([place, members]) => (
        <section key={place || 'all'}>
          {place ? <DrawerLabel name={place} count={members.length} /> : null}

          <div className={cn('grid grid-cols-2 gap-3 lg:hidden', place ? '' : 'mt-4')}>
            {members.map((plant) => (
              <PlantTile
                key={plant.code}
                plant={plant}
                secondary={formatSpecies(plant)}
                meta={showPlace ? vocabNameOrNone(state, plant.locationId) : undefined}
              />
            ))}
          </div>

          <div className="hidden lg:block">
            {members.map((plant) => (
              <PlantRow key={plant.code} plant={plant} showPlace={showPlace} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/** The tile unrolled. Name over species, because the two are one fact — you
 *  never scan a column of species looking for one. */
function PlantRow({ plant, showPlace }: { plant: Plant; showPlace: boolean }) {
  const state = useStore()
  const days = daysSinceWater(state, plant.code)
  const species = formatSpecies(plant)
  const dormant = plant.status === 'dormant'

  return (
    <RowLink href={routes.plant(plant.code)}>
      <PlantThumb plant={plant} />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline gap-1.5">
          <span className="truncate font-display text-[1.09375rem] leading-[1.375rem] font-medium">
            {plant.name}
          </span>
          {dormant ? <Dozing className="shrink-0 self-center" /> : null}
        </span>
        {species ? (
          <span className="truncate text-[0.8125rem] leading-[1.0625rem] text-ink-muted">
            {species}
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-8">
        {showPlace ? (
          <span className="w-32 shrink-0 truncate text-[0.875rem] text-ink-muted">
            {vocabName(state, plant.locationId)}
          </span>
        ) : null}
        <span className="w-26 shrink-0 truncate text-[0.875rem] text-ink-muted">
          {label(plant.system)}
        </span>
        <span className="w-11 shrink-0 text-right font-mono text-[0.875rem] text-ink-muted">
          {plant.potSize ?? '—'}
        </span>
        <span
          className={cn(
            'w-16 shrink-0 text-right font-mono text-[0.875rem]',
            // A dormant plant is not late, it is asleep — counting its days
            // in ember would ask you to water something you have decided not
            // to water.
            isThirsty(days) && !dormant ? 'font-semibold text-ember' : 'text-ink',
            dormant ? 'text-ink-faint' : '',
          )}
        >
          {days ?? '—'}
        </span>
      </div>
    </RowLink>
  )
}

/**
 * The drawer, under the living plants.
 *
 * Faded and carrying its own status, so a plant that is gone can never be
 * mistaken for one that is standing in the next room.
 */
function Archive({ plants, query }: { plants: readonly Plant[]; query: string }) {
  return (
    <section>
      <DrawerLabel name="Archive" count={plants.length} />

      <div className="grid grid-cols-2 gap-3 lg:hidden">
        {plants.map((plant) => (
          <PlantTile
            key={plant.code}
            plant={plant}
            secondary={formatSpecies(plant)}
            tag={label(plant.status)}
          />
        ))}
      </div>

      <div className="hidden lg:block">
        {plants.map((plant) => (
          <RowLink key={plant.code} href={routes.plant(plant.code)}>
            <span className="opacity-70 grayscale">
              <PlantThumb plant={plant} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-display text-[1.09375rem] leading-[1.375rem] font-medium text-ink-muted">
                {plant.name}
              </span>
              <span className="truncate text-[0.8125rem] leading-[1.0625rem] text-ink-faint">
                {formatSpecies(plant)}
              </span>
            </div>
            <span className="shrink-0 text-[0.875rem] text-ink-faint">{label(plant.status)}</span>
          </RowLink>
        ))}
      </div>

      <p className="mt-3.5 px-0.5 text-[0.8125rem] leading-[1.125rem] text-ink-faint text-pretty">
        {isArchiveQuery(query)
          ? 'Plants that died or were given away. A dormant plant is not here — it is still on the shelf, just asleep.'
          : 'Archived, so it is out of every list you water from.'}
      </p>
    </section>
  )
}

function emptyTitle(filter: CollectionFilter): string {
  if (filter === 'archive') return 'Nothing archived'
  return 'No plants yet'
}

function emptyDescription(filter: CollectionFilter): string {
  if (filter === 'archive') {
    return 'Plants that died or were given away show up here rather than in the list of things to water.'
  }
  return 'Everything you own, searchable by name, species, code or place.'
}
