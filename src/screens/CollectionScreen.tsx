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
 * moves back into the column. Grouped by genus the same rule runs the other
 * way — the label says the genus, so the second line drops it and reads as the
 * bench label does, `papillilaminum × crystallinum`, while the Place column
 * comes back because nothing above the row is saying where the plant stands.
 *
 * Which is also the whole of the trailing "One of each" drawer: it is not a
 * genus, so the rows under it put their genus back without being told to.
 *
 * On a phone there is no column for it to move into, and it does not move at
 * all: the tile says the name and the species, and the room is whatever the
 * drawer label above it says — nothing, when you have sorted A–Z. The place
 * had been drawn there as a fainter, smaller run of the same prose as the
 * species, which is what you do to rank two facts of one kind; these are two
 * kinds. The room being one tap away is a better answer than a second line
 * you have to read to identify.
 *
 * Days since water is here and quiet. Today is the list you water from, and two
 * screens shouting the same number at you means you trust neither.
 */

import {
  archivedMatching,
  collectionCounts,
  daysSinceWater,
  filterCollection,
  groupByGenus,
  groupByPlace,
  isArchiveQuery,
  isThirsty,
  ownedPlants,
  vocabName,
  vocabOf,
  vocabUsage,
} from '~/data/selectors'
import { useStore } from '~/data/store'
import type { Plant } from '~/data/types'
import { cn } from '~/lib/cn'
import { formatEpithet, formatSpecies, label } from '~/lib/format'
import { useHeld, useRemembered, useTyped } from '~/lib/remembered'
import { COLLECTION_FILTERS, navigate, routes, type CollectionFilter } from '~/lib/router'
import { Button } from '~/ui/Button'
import { Chip, ChipStrip, SortSwitch, type SortOption } from '~/ui/Chip'
import { Dozing } from '~/ui/Dozing'
import { Icon } from '~/ui/Icon'
import { plants as plantCount, SuggestField, type SuggestGroup } from '~/ui/suggest'
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

type Sort = 'place' | 'genus' | 'name'

/**
 * A place or a genus picked out of the search's suggestions: a filter that
 * sits in the field as a tag, rather than words that happen to match. "Plant
 * cabinet" typed also finds a plant named Cabinet; picked, it means the room.
 * One of each at most — a plant stands in one place and is one genus, so two
 * of a kind would only ever show nothing.
 */
type Scope = { kind: 'place' | 'genus'; value: string; label: string }

function inScope(plant: Plant, scope: readonly Scope[]): boolean {
  return scope.every((part) =>
    part.kind === 'place'
      ? plant.locationId === part.value
      : plant.genus.trim().toLowerCase() === part.value.toLowerCase(),
  )
}

/** By place is where a plant is, by genus is what it is, and A–Z is the list
 *  with nothing done to it — which is why it goes last. */
const SORTS = [
  { value: 'place', label: 'By place' },
  { value: 'genus', label: 'By genus' },
  { value: 'name', label: 'A–Z' },
] as const satisfies readonly SortOption<Sort>[]

/**
 * What a row says under the name.
 *
 * The species, unless the label over the run is already saying this plant's
 * genus — then the genus comes off and the epithet is left standing. One
 * predicate rather than a flag per sort: a row drops whatever the drawer above
 * it has already said, and there is nowhere for the two to disagree.
 */
function secondaryOf(plant: Plant, drawer: string): string {
  return drawer && drawer === plant.genus.trim() ? formatEpithet(plant) : formatSpecies(plant)
}

export function CollectionScreen({ filter }: { filter: CollectionFilter }) {
  const state = useStore()
  const counts = collectionCounts(state)
  const [query, setQuery] = useTyped('collection')
  const [scope, setScope] = useHeld<Scope[]>('collection-scope', [])
  const [sort, setSort] = useRemembered<Sort>(
    'collection-sort',
    'place',
    SORTS.map((option) => option.value),
  )

  const plants = filterCollection(state, filter, query).filter((plant) => inScope(plant, scope))
  // An old `#collection/archive` link still works, and when it is what you are
  // looking at the drawer would only show you the same plants twice.
  const archived =
    filter === 'archive'
      ? []
      : archivedMatching(state, query).filter((plant) => inScope(plant, scope))
  const nothing = plants.length === 0 && archived.length === 0
  const searching = query.trim() !== '' || scope.length > 0

  function narrow(part: Scope) {
    setScope([...scope.filter((other) => other.kind !== part.kind), part])
    setQuery('')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* The counts are the way to the collection's milestones: always at
          the top, however long the grid under them grows. */}
      <ScreenHeader
        title="Collection"
        action={
          <a
            href={routes.milestones()}
            className="warm flex min-h-touch items-center gap-1 text-[0.8125rem] text-leaf hover:text-leaf-deep"
          >
            <span>
              <span className="sr-only">Milestones: </span>
              <span className="font-mono">{counts.plants}</span>{' '}
              {counts.plants === 1 ? 'plant' : 'plants'}
              {counts.grown > 0 ? (
                <>
                  {' · '}
                  <span className="font-mono">{counts.grown}</span> grown here
                </>
              ) : null}
            </span>
            <Icon name="chevronRight" size={16} />
          </a>
        }
      />

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <SuggestField
          value={query}
          onChange={setQuery}
          groups={searchSuggestions(state, query, plants, scope, narrow)}
          leading={
            <>
              <Icon name="search" size={17} className="shrink-0 text-ink-faint" />
              {scope.map((part) => (
                <ScopeTag
                  key={part.kind}
                  part={part}
                  onRemove={() => setScope(scope.filter((other) => other !== part))}
                />
              ))}
            </>
          }
          onBackspaceEmpty={() => setScope(scope.slice(0, -1))}
          browse={false}
          placeholder={scope.length > 0 ? 'Search within' : 'Name, species or place'}
          aria-label="Search the collection"
          fieldClassName={scope.length > 0 ? 'lg:w-104' : 'lg:w-76'}
        />

        {/* Filtering by system is a desk job: on a phone it cost a whole row
            of chips to narrow a list you were going to look at anyway. */}
        <ChipStrip className="hidden lg:flex">
          {SYSTEM_FILTERS.map((candidate) => (
            <Chip
              key={candidate}
              selected={candidate === filter}
              onClick={() => navigate(routes.collection(candidate))}
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
          title={searching ? 'Nothing matches' : emptyTitle(filter)}
          description={
            query.trim()
              ? `No plant matches “${query}”.`
              : searching
                ? `Nothing in ${scope.map((part) => part.label).join(' · ')} here.`
                : emptyDescription(filter)
          }
          action={
            searching ? null : (
              <Button variant="accent" onClick={() => navigate(routes.new())}>
                Add a plant
              </Button>
            )
          }
        />
      ) : plants.length > 0 ? (
        <PlantRuns
          runs={
            sort === 'place'
              ? groupByPlace(state, plants)
              : sort === 'genus'
                ? groupByGenus(plants)
                : [['', plants]]
          }
          // The column is there whenever the drawer label is not saying the
          // place for it, which is both of the other two sorts.
          showPlace={sort !== 'place'}
        />
      ) : null}

      {archived.length > 0 ? <Archive plants={archived} query={query} /> : null}
    </div>
  )
}

/**
 * What the search offers while you type: first what it could narrow the list
 * to — a room, a genus — then the plants themselves to go straight to, and
 * last the plain search, which is what Enter or simply reading on gives you.
 */
function searchSuggestions(
  state: ReturnType<typeof useStore>,
  query: string,
  found: readonly Plant[],
  scope: readonly Scope[],
  narrow: (part: Scope) => void,
): SuggestGroup[] {
  const taken = new Set(scope.map((part) => part.kind))
  const placeCounts = new Map(vocabUsage(state, 'location').all.map((u) => [u.name, u.count]))
  const generaCounts = new Map<string, number>()
  for (const plant of ownedPlants(state)) {
    const genus = plant.genus.trim()
    if (genus) generaCounts.set(genus, (generaCounts.get(genus) ?? 0) + 1)
  }

  const places = taken.has('place')
    ? []
    : vocabOf(state, 'location').map((item) => ({
        key: `place-${item.id}`,
        value: item.name,
        detail: 'Place',
        meta: String(placeCounts.get(item.name) ?? 0),
        leading: <Mark icon="place" />,
        onPick: () => narrow({ kind: 'place', value: item.id, label: item.name }),
      }))
  const genera = taken.has('genus')
    ? []
    : [...generaCounts].sort(([a], [b]) => a.localeCompare(b)).map(([genus, count]) => ({
        key: `genus-${genus}`,
        value: genus,
        italic: true,
        detail: 'Genus',
        meta: String(count),
        leading: <Mark icon="leaf" />,
        onPick: () => narrow({ kind: 'genus', value: genus, label: genus }),
      }))

  return [
    { label: 'Show only', whileTyping: true, items: [...places, ...genera] },
    {
      label: 'Go to plant',
      whileTyping: true,
      items: found.slice(0, 4).map((plant) => ({
        key: plant.code,
        value: plant.name,
        detail: formatSpecies(plant),
        detailItalic: true,
        meta: plant.code,
        // Already matched by the collection's own search, which knows about
        // codes and places, so the row needs no matching of its own.
        always: true,
        leading: <PlantThumb plant={plant} />,
        onPick: () => navigate(routes.plant(plant.code)),
      })),
    },
    {
      label: '',
      whileTyping: true,
      items: [
        {
          key: 'every',
          value: `Every plant matching “${query.trim()}”`,
          muted: true,
          always: true,
          meta: plantCount(found.length),
          // The list under the field already is this search: picking it
          // only puts the suggestions away.
          onPick: () => {},
        },
      ],
    },
  ]
}

function Mark({ icon }: { icon: 'place' | 'leaf' }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-muted">
      <Icon name={icon} size={17} />
    </span>
  )
}

/** A filter sitting in the field, with its own way out. */
function ScopeTag({ part, onRemove }: { part: Scope; onRemove: () => void }) {
  return (
    <span className="flex h-8 max-w-[10rem] shrink-0 items-center gap-2 rounded-md bg-leaf-tint pl-3 text-[0.875rem] text-ink">
      <Icon name={part.kind === 'place' ? 'place' : 'leaf'} size={14} className="shrink-0 text-leaf" />
      <span className={cn('truncate', part.kind === 'genus' && 'font-display text-[0.9375rem] italic')}>
        {part.label}
      </span>
      <button
        type="button"
        aria-label={`Stop showing only ${part.label}`}
        onClick={(event) => {
          event.stopPropagation()
          onRemove()
        }}
        className="warm flex size-8 shrink-0 items-center justify-center rounded-md text-leaf hover:text-leaf-deep"
      >
        <Icon name="close" size={14} />
      </button>
    </span>
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
  return (
    <div>
      {/* The table header exists only where there are columns to head. */}
      <div className="hidden items-center gap-3 border-b border-line-strong px-3 pb-2 lg:flex">
        <span className="w-10 shrink-0" />
        <ColumnHeader className="flex-1">Plant</ColumnHeader>
        <div className="flex items-center gap-8">
          {showPlace ? <ColumnHeader className="w-32">Place</ColumnHeader> : null}
          <ColumnHeader className="w-26">System</ColumnHeader>
          <ColumnHeader className="w-11 text-right">Pot</ColumnHeader>
          <ColumnHeader className="w-16 text-right">Days</ColumnHeader>
        </div>
      </div>

      {runs.map(([place, members], index) => (
        // Groups are a block step apart. The first has nothing above it on a
        // phone — the page's own gap already put it there — and on a desktop
        // sits under the table header: a block step when a label opens it,
        // flush when the rows answer the header directly.
        <section key={place || 'all'} className={index > 0 ? 'mt-6' : place ? 'lg:mt-6' : undefined}>
          {place ? <DrawerLabel name={place} count={members.length} /> : null}

          <div className="grid grid-cols-2 gap-3 lg:hidden">
            {members.map((plant) => (
              <PlantTile key={plant.code} plant={plant} secondary={secondaryOf(plant, place)} />
            ))}
          </div>

          <div className="hidden lg:block">
            {members.map((plant) => (
              <PlantRow
                key={plant.code}
                plant={plant}
                secondary={secondaryOf(plant, place)}
                showPlace={showPlace}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/** The tile unrolled. Name over species, because the two are one fact — you
 *  never scan a column of species looking for one. */
function PlantRow({
  plant,
  secondary,
  showPlace,
}: {
  plant: Plant
  secondary: string
  showPlace: boolean
}) {
  const state = useStore()
  const days = daysSinceWater(state, plant.code)
  const dormant = plant.status === 'dormant'

  return (
    <RowLink href={routes.plant(plant.code)}>
      <PlantThumb plant={plant} />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline gap-1">
          <span className="truncate font-display text-[1.09375rem] leading-[1.375rem] font-medium">
            {plant.name}
          </span>
          {dormant ? <Dozing className="shrink-0 self-center" /> : null}
        </span>
        {secondary ? (
          <span className="truncate text-[0.8125rem] leading-[1.0625rem] text-ink-muted">
            {secondary}
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

      <p className="mt-2 text-[0.8125rem] leading-[1.125rem] text-ink-faint text-pretty">
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
