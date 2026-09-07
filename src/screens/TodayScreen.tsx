/**
 * Today — what you see when you open the bookmark.
 *
 * The ledger: every active plant, longest since water at the top, never-logged
 * above all of it. The switch cuts that same list into rooms, because watering
 * happens a room at a time with a can in your hand, and a ranking is not a route.
 *
 * One rule runs through both orders, and it is Collection's: whatever the list
 * is grouped by never repeats itself inside a row. Sorted thirstiest the row
 * carries the place; grouped by place the drawer label carries it and the row
 * says the species instead.
 *
 * Nothing is written from here. Today is the list you water *from* — you arrive
 * at the plant by its tag and log it there — so a plant that has had water today
 * shows a mark where its figure was, read straight back out of the log.
 *
 * No prediction of when a plant *needs* water: watering happens on fixed days,
 * so every measured gap lands on 7 or 14 and the app would be predicting the
 * calendar and calling it botany.
 */

import { useState } from 'react'
import { useStore } from '~/data/store'
import {
  daysSinceWater,
  groupByPlace,
  isThirsty,
  lastWaterAt,
  livePlants,
  todayList,
  vocabName,
} from '~/data/selectors'
import type { Plant } from '~/data/types'
import { useSyncStatus } from '~/data/sync'
import { daysSince, formatDayMonth } from '~/lib/date'
import { formatSpecies, plural } from '~/lib/format'
import { routes } from '~/lib/router'
import { Banner } from '~/ui/Banner'
import { Button } from '~/ui/Button'
import { SortSwitch, type SortOption } from '~/ui/Chip'
import { PlantThumb } from '~/ui/plantPicture'
import { DaysSinceWater, EmptyState, Rows, ScreenHeader } from '~/ui/primitives'
import { Cell, ColumnHeader, DrawerLabel, RowLink } from '~/ui/rows'
import { SyncStatusPill } from '~/ui/SyncStatusPill'

/** After this long without an export, the reminder appears and stays. */
const BACKUP_REMINDER_DAYS = 14

type Sort = 'thirstiest' | 'place'

const SORTS = [
  { value: 'thirstiest', label: 'Thirstiest' },
  { value: 'place', label: 'By place' },
] as const satisfies readonly SortOption<Sort>[]

export function TodayScreen() {
  const state = useStore()
  const plants = todayList(state)
  const syncStatus = useSyncStatus()
  const [sort, setSort] = useState<Sort>('thirstiest')

  const byPlace = sort === 'place'

  // `todayList` is already thirstiest-first, and grouping keeps the order it is
  // given — so a room is sorted by thirst without sorting it twice.
  const runs: readonly (readonly [string, readonly Plant[]])[] = byPlace
    ? groupByPlace(state, plants)
    : [['', plants]]

  return (
    <div className="flex flex-col gap-4">
      <SyncStatusPill status={syncStatus} className="md:hidden" />

      <ScreenHeader
        title="Today"
        action={
          plants.length > 0 ? (
            <SortSwitch value={sort} options={SORTS} onChange={setSort} labelFrom="lg" />
          ) : null
        }
      />

      <BackupReminder
        lastBackupAt={state.lastBackupAt}
        hasPlants={livePlants(state).length > 0}
        synced={syncStatus.kind !== 'unconfigured'}
      />

      {plants.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Add your first plant and it will show up here, sorted by how long it has been since it last had water."
          action={
            <Button variant="accent" onClick={() => window.location.assign(routes.new())}>
              Add a plant
            </Button>
          }
        />
      ) : (
        <div>
          {/* The table header only exists once there are columns to head, and
              Place is a column only while nothing above the row is saying it. */}
          <div className="hidden items-center gap-4 border-b border-line-strong pb-2.5 lg:flex">
            <span className="w-10 shrink-0" />
            <ColumnHeader className="flex-1">Plant</ColumnHeader>
            {byPlace ? null : <ColumnHeader className="w-44">Place</ColumnHeader>}
            <ColumnHeader className="w-24">Last water</ColumnHeader>
            <ColumnHeader className="w-16 text-right">Days</ColumnHeader>
          </div>

          {runs.map(([place, members]) => (
            <section key={place || 'all'}>
              {place ? <DrawerLabel name={place} count={members.length} /> : null}

              {/* Ungrouped there is no label to close the top of the list, so
                  the stack draws its own — except on a table, which has one. */}
              <Rows className={place ? 'border-t-0' : 'mt-4 lg:mt-0 lg:border-t-0'}>
                {members.map((plant) => (
                  <TodayRow key={plant.code} plant={plant} showPlace={!byPlace} />
                ))}
              </Rows>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * One plant, in both readings.
 *
 * Below the table the second line carries whatever the grouping is not already
 * saying; from `lg` the place has a column of its own and the species takes the
 * line back — the same trade Collection's row makes, by the same breakpoint.
 */
function TodayRow({ plant, showPlace }: { plant: Plant; showPlace: boolean }) {
  const state = useStore()
  const days = daysSinceWater(state, plant.code)
  const last = lastWaterAt(state, plant.code)
  const place = vocabName(state, plant.locationId)
  const species = formatSpecies(plant)

  return (
    <RowLink href={routes.plant(plant.code)}>
      <PlantThumb plant={plant} />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-display text-[1.09375rem] leading-[1.375rem] font-medium">
          {plant.name}
        </span>
        <span className="truncate text-[0.8125rem] leading-[1.0625rem] text-ink-muted lg:hidden">
          {showPlace ? place : species}
        </span>
        {species ? (
          <span className="hidden truncate text-[0.8125rem] leading-[1.0625rem] text-ink-muted lg:block">
            {species}
          </span>
        ) : null}
      </div>

      {showPlace ? <Cell className="hidden w-44 lg:block">{place}</Cell> : null}
      <Cell className="hidden w-24 lg:block" mono>
        {last ? formatDayMonth(last) : '—'}
      </Cell>

      <div className="min-w-16 shrink-0 lg:text-right">
        <DaysSinceWater days={days} thirsty={isThirsty(days)} />
      </div>
    </RowLink>
  )
}

function BackupReminder({
  lastBackupAt,
  hasPlants,
  synced,
}: {
  lastBackupAt: string | null
  hasPlants: boolean
  /** Sync is the real safety net once it's configured, so the manual-export
   *  nag has nothing left to warn about — it stays quiet rather than
   *  competing with the sync status pill for the same worry. */
  synced: boolean
}) {
  if (!hasPlants || synced) return null

  const days = lastBackupAt === null ? null : daysSince(lastBackupAt)
  if (days !== null && days < BACKUP_REMINDER_DAYS) return null

  return (
    <Banner
      tone="warning"
      action={
        <Button size="sm" variant="danger" onClick={() => window.location.assign(routes.settings())}>
          Back up
        </Button>
      }
    >
      {days === null
        ? 'Your collection has never been backed up. It lives only on this device.'
        : `No backup for ${plural(days, 'day')}. Your collection lives only on this device.`}
    </Banner>
  )
}
