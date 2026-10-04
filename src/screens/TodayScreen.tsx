/**
 * Today — what you see when you open the bookmark.
 *
 * The ledger: every active plant, longest since water at the top, never-logged
 * above all of it. The switch cuts that same list into rooms, because watering
 * happens a room at a time with a can in your hand, and a ranking is not a route.
 *
 * One rule runs through both orders, and it is Collection's: whatever the list
 * is grouped by never repeats itself inside a row. On a desktop the place has
 * a column, and it appears there whenever no drawer label is saying it.
 *
 * Below that breakpoint there is no column, and the row does not improvise
 * one: it says the name and the species, and the room is whatever the label
 * above it says. The place used to trail the species as smaller, fainter
 * prose — a ranking of two facts that are not the same kind of fact — and on
 * a narrow phone it truncated mid-word besides. The switch is one tap.
 *
 * Watering is logged from here too. The tag was meant to be the way in, but a
 * round with the can goes faster down the list than from sticker to sticker,
 * so the days figure on each row is a button: pressed, it turns to the check
 * that already meant "watered today", and pressed again it takes the day's
 * watering back. By place, a room with more than one plant still to go can be
 * done in one press. The cachepots the day after are the same kind of round;
 * see `EmptyPotsReminder`.
 *
 * While you are on the screen the rows hold the order they opened in. Sorted by
 * thirst, a plant you have just watered would otherwise drop to the foot of
 * the list and slide the next one under your thumb.
 *
 * No prediction of when a plant *needs* water: watering happens on fixed days,
 * so every measured gap lands on 7 or 14 and the app would be predicting the
 * calendar and calling it botany.
 */

import { useRef } from 'react'
import { logEvent, removeEvent, useStore, waterPlants } from '~/data/store'
import {
  daysSinceWater,
  groupByPlace,
  isThirsty,
  lastWaterAt,
  livePlants,
  todayList,
  vocabName,
  wateringToday,
} from '~/data/selectors'
import type { Plant } from '~/data/types'
import { useSyncStatus } from '~/data/sync'
import { daysSince, formatDayMonth } from '~/lib/date'
import { formatSpecies, plural } from '~/lib/format'
import { useRemembered } from '~/lib/remembered'
import { useToday } from '~/lib/today'
import { navigate, routes } from '~/lib/router'
import { Banner } from '~/ui/Banner'
import { EmptyPotsReminder } from '~/ui/EmptyPots'
import { Button } from '~/ui/Button'
import { SortSwitch, type SortOption } from '~/ui/Chip'
import { PlantThumb } from '~/ui/plantPicture'
import { EmptyState, Rows, ScreenHeader } from '~/ui/primitives'
import { Cell, ColumnHeader, DrawerLabel, RowLink } from '~/ui/rows'
import { SachetReminder } from '~/ui/Sachets'
import { SyncStatusPill } from '~/ui/SyncStatusPill'
import { WaterFigure } from '~/ui/Water'

/** After this long without an export, the reminder appears and stays. */
const BACKUP_REMINDER_DAYS = 14

type Sort = 'thirstiest' | 'place'

const SORTS = [
  { value: 'thirstiest', label: 'Thirstiest' },
  { value: 'place', label: 'By place' },
] as const satisfies readonly SortOption<Sort>[]

export function TodayScreen() {
  const state = useStore()
  // Everything below counts days from now; this redraws it when now is a new day.
  useToday()
  const plants = useHeldOrder(todayList(state))
  const syncStatus = useSyncStatus()
  const [sort, setSort] = useRemembered<Sort>(
    'today-sort',
    'thirstiest',
    SORTS.map((option) => option.value),
  )

  const byPlace = sort === 'place'
  const watered = plants.filter((plant) => wateringToday(state, plant.code)).length

  // `todayList` is already thirstiest-first, and grouping keeps the order it is
  // given — so a room is sorted by thirst without sorting it twice.
  const runs: readonly (readonly [string, readonly Plant[]])[] = byPlace
    ? groupByPlace(state, plants)
    : [['', plants]]

  return (
    <div className="flex flex-col gap-6">
      <SyncStatusPill status={syncStatus} className="md:hidden" />

      <div className="flex flex-col gap-1">
        <ScreenHeader
          title="Today"
          action={
            plants.length > 0 ? (
              <SortSwitch value={sort} options={SORTS} onChange={setSort} labelFrom="lg" />
            ) : null
          }
        />
        {/* How far the round has got. Only once it has started: "0 of 17" on a
            morning nobody is watering is a nag. */}
        {watered > 0 ? (
          <p className="text-[0.8125rem] leading-[1.125rem] text-ink-muted">
            <span className="font-mono font-medium text-ink">{watered}</span> of{' '}
            <span className="font-mono">{plants.length}</span> watered today
          </p>
        ) : null}
      </div>

      <BackupReminder
        lastBackupAt={state.lastBackupAt}
        hasPlants={livePlants(state).length > 0}
        synced={syncStatus.kind !== 'unconfigured'}
      />

      {/* Above the ledger, because it is about the room the plants stand in
          rather than about any plant in it — and below the backup warning,
          which is the only thing here about losing data. */}
      <SachetReminder />

      {/* Under the sachets and above the ledger: a chore owed from yesterday's
          round, done before today's starts. */}
      <EmptyPotsReminder />

      {plants.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Add your first plant and it will show up here, sorted by how long it has been since it last had water."
          action={
            <Button variant="accent" onClick={() => navigate(routes.new())}>
              Add a plant
            </Button>
          }
        />
      ) : (
        <div>
          {/* The table header only exists once there are columns to head, and
              Place is a column only while nothing above the row is saying it. */}
          <div className="hidden items-center gap-3 border-b border-line-strong pb-2 pl-3 lg:flex">
            <span className="w-10 shrink-0" />
            <ColumnHeader className="flex-1">Plant</ColumnHeader>
            {/* Built the way a row is: the cells sit inside the link and its
                padding, and the figure's column stands outside it with no gap, so each
                head is over what it names. */}
            <div className="flex items-center gap-8 pr-3">
              {byPlace ? null : <ColumnHeader className="w-44">Place</ColumnHeader>}
              <ColumnHeader className="w-24">Last water</ColumnHeader>
            </div>
            <ColumnHeader className="-ml-3 w-32 pr-3 text-right">Days</ColumnHeader>
          </div>

          {runs.map(([place, members], index) => (
            // Groups are a block step apart. The first has nothing above it on a
            // phone — the page's own gap already put it there — and on a desktop
            // sits under the table header: a block step when a label opens it,
            // flush when the rows answer the header directly.
            <section key={place || 'all'} className={index > 0 ? 'mt-6' : place ? 'lg:mt-6' : undefined}>
              {place ? (
                <DrawerLabel
                  name={place}
                  count={members.length}
                  action={<WaterRoom plants={members} />}
                />
              ) : null}

              {/* Ungrouped there is no label to close the top of the list, so
                  the stack draws its own — except on a table, which has one. */}
              <Rows className={place ? 'border-t-0' : 'lg:border-t-0'}>
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
 * The second line is the species, in both orders and at every width; from
 * `lg` the place appears beside it in a column of its own, and below `lg` it
 * does not appear at all — the same trade Collection makes, by the same
 * breakpoint.
 */
function TodayRow({ plant, showPlace }: { plant: Plant; showPlace: boolean }) {
  const state = useStore()
  const days = daysSinceWater(state, plant.code)
  const last = lastWaterAt(state, plant.code)
  const today = wateringToday(state, plant.code)
  const place = vocabName(state, plant.locationId)
  const species = formatSpecies(plant)

  const takeBack = () => {
    if (!today) return
    // A watering with a photograph on it is more than a tick, so it is not
    // taken back blind from a list: the press opens the plant, where the entry
    // and its picture are in view and are swiped out together.
    if (today.photo) navigate(routes.plant(plant.code))
    else void removeEvent(today.id)
  }

  return (
    <RowLink
      href={routes.plant(plant.code)}
      trailing={
        // The column keeps its width; the button in it is only as wide as its
        // drop and figure, so what presses is what is drawn.
        <div className="flex shrink-0 justify-end lg:w-32">
          <WaterFigure
            name={plant.name}
            days={days}
            thirsty={isThirsty(days)}
            watered={today !== null}
            // Always fed, as on the plant's page.
            onWater={() => void logEvent({ type: 'water', plantCode: plant.code, fertilized: true })}
            onTakeBack={takeBack}
            className="min-w-18 lg:min-w-0"
          />
        </div>
      }
    >
      <PlantThumb plant={plant} />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-display text-[1.09375rem] leading-[1.375rem] font-medium">
          {plant.name}
        </span>
        {/* One line, one fact, at every width. It was two — the species with
            the place trailing it — and the second one had to be shrunk and
            faded to keep it from reading as the equal of the first, which is
            the treatment for ranking two facts of one kind rather than
            separating two kinds. `lg` has a column for the place; here the
            drawer label has it, or nothing does. */}
        {species ? (
          <span className="truncate text-[0.8125rem] leading-[1.0625rem] text-ink-muted">
            {species}
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-8">
        {showPlace ? <Cell className="hidden w-44 lg:block">{place}</Cell> : null}
        <Cell className="hidden w-24 lg:block" mono>
          {last ? formatDayMonth(last) : '—'}
        </Cell>
      </div>
    </RowLink>
  )
}

/**
 * A room in one press, in the slot after its count.
 *
 * Only while more than one plant in it is still to go: for the last one it is
 * the same press as the row's own figure, said twice. The label keeps the room
 * for it either way, so the rows under it hold still as it goes.
 */
function WaterRoom({ plants }: { plants: readonly Plant[] }) {
  const state = useStore()
  const left = plants.filter((plant) => !wateringToday(state, plant.code))
  if (left.length < 2) return null

  return (
    <Button
      size="sm"
      variant="quiet"
      icon="droplet"
      onClick={() => void waterPlants(left.map((plant) => plant.code))}
      className="-mr-2"
    >
      All watered
    </Button>
  )
}

/**
 * The order the list opened in, held for as long as the screen is up.
 *
 * Watering moves a plant to the foot of a thirst ranking, and moving it there
 * while you are working down the list puts the next row under the finger that
 * just pressed. A plant that turns up mid-visit — a sync, a plant added on
 * another tab — joins at the end. Leaving the screen lets go, so the next
 * visit opens in the real order.
 */
function useHeldOrder(plants: readonly Plant[]): Plant[] {
  const rank = useRef(new Map<string, number>())
  for (const plant of plants) {
    if (!rank.current.has(plant.code)) rank.current.set(plant.code, rank.current.size)
  }
  return [...plants].sort((a, b) => rank.current.get(a.code)! - rank.current.get(b.code)!)
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
        <Button size="sm" variant="danger" onClick={() => navigate(routes.settings())}>
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
