/**
 * Today — what you see when you open the bookmark.
 *
 * The water round, room by room, because that is how a round goes: a can in
 * your hand, one room at a time. The rooms come in order of need, and so do
 * the plants inside each one.
 *
 * Need is measured against each plant's own rhythm — the gap you usually leave
 * between its waterings, read back out of its log (see `waterRhythm`). A plant
 * on a weekly round at day nine is further along than one in a self-watering
 * pot at day ten of its usual fourteen, and a single scale of days could not
 * say so: the pot sat at the top of its room for a week and a half. It is
 * still looking back, not forward — it says what you have been doing, not when
 * a plant will need water.
 *
 * A plant comes onto the list a day before its usual gap. One without enough
 * history to have a rhythm waits the number of days set in Settings, and one
 * never watered is always there. What is left off is one quiet line under the
 * list that lets it back in. There is no sort to choose: one order, the right
 * one for the job, and nothing to set before you start.
 *
 * Whatever the list is grouped by never repeats itself inside a row, so there
 * is no place column — the drawer label says it.
 *
 * Watering is logged from here too. The days figure on each row is a button:
 * pressed, it turns to the check that already meant "watered today", and
 * pressed again it takes the day's watering back. A room with more than one
 * plant still to go can be done in one press. The cachepots the day after, and
 * the rest of what is owed today, stay out of the water's way — see `Chores`.
 *
 * While you are on the screen the rows hold the order they opened in. A plant
 * you have just watered would otherwise drop to the foot of its room and slide
 * the next one under your thumb.
 */

import { useRef, useState } from 'react'
import { logEvent, removeEvent, useStore, waterPlants, type State } from '~/data/store'
import {
  daysSinceWater,
  isThirsty,
  lastWaterAt,
  livePlants,
  todayList,
  vocabName,
  waterRhythm,
  wateringToday,
} from '~/data/selectors'
import type { Plant } from '~/data/types'
import { useSyncStatus } from '~/data/sync'
import { daysSince, formatDayMonth } from '~/lib/date'
import { formatSpecies, plural } from '~/lib/format'
import { useTodayAfter } from '~/lib/todayAfter'
import { useToday } from '~/lib/today'
import { navigate, routes } from '~/lib/router'
import { Banner } from '~/ui/Banner'
import { Button } from '~/ui/Button'
import { ChoresStrip } from '~/ui/Chores'
import { Icon } from '~/ui/Icon'
import { PlantThumb } from '~/ui/plantPicture'
import { EmptyState, Rows, ScreenHeader } from '~/ui/primitives'
import { Cell, ColumnHeader, DrawerLabel, RowLink } from '~/ui/rows'
import { SachetReminder } from '~/ui/Sachets'
import { SyncStatusPill } from '~/ui/SyncStatusPill'
import { WaterFigure } from '~/ui/Water'

/** After this long without an export, the reminder appears and stays. */
const BACKUP_REMINDER_DAYS = 14

/** Where a plant stands against its own rhythm — or, without one yet, against
 *  the days set in Settings. */
type Standing = {
  plant: Plant
  days: number | null
  rhythm: number | null
  /** How far into its usual gap: 1 is the gap itself. Never watered is
   *  infinite, so it leads; watered today is nought. */
  need: number
  /** On the list today. */
  listed: boolean
}

function standing(state: State, plant: Plant, fallback: number): Standing {
  const days = daysSinceWater(state, plant.code)
  const rhythm = waterRhythm(state, plant.code)
  const today = wateringToday(state, plant.code) !== null

  if (days === null) return { plant, days, rhythm, need: Infinity, listed: true }
  const gap = rhythm ?? fallback
  const need = today ? 0 : gap > 0 ? days / gap : days
  // A day before the gap: the round is a day of the week, and the evening
  // before it is when you look to see what is coming.
  const from = rhythm !== null ? rhythm - 1 : fallback
  return { plant, days, rhythm, need, listed: today || days >= from }
}

/**
 * The round: rooms in order of their neediest plant, and the plants in each
 * by need, a name breaking a tie. Plants with no place are a room of their own
 * and go last, because nothing says where in the house they are.
 */
function round(state: State, standings: readonly Standing[]): Plant[] {
  const rooms = new Map<string, Standing[]>()
  for (const each of standings) {
    const name = vocabName(state, each.plant.locationId)
    const key = name && name !== '—' ? name : ''
    rooms.set(key, [...(rooms.get(key) ?? []), each])
  }
  // Compared rather than subtracted: two never-watered plants are both
  // infinitely far along, and infinity minus itself is not a number.
  const needs = (a: Standing, b: Standing) => (a.need === b.need ? 0 : a.need > b.need ? -1 : 1)
  const byNeed = (a: Standing, b: Standing) => needs(a, b) || a.plant.name.localeCompare(b.plant.name)
  return [...rooms.entries()]
    .map(([key, members]) => [key, [...members].sort(byNeed)] as const)
    .sort(([a, first], [b, second]) => {
      if (!a) return 1
      if (!b) return -1
      return needs(first[0]!, second[0]!) || a.localeCompare(b)
    })
    .flatMap(([, members]) => members.map((each) => each.plant))
}

export function TodayScreen() {
  const state = useStore()
  // Everything below counts days from now; this redraws it when now is a new day.
  useToday()
  const syncStatus = useSyncStatus()
  const [fallback] = useTodayAfter()
  const [showRecent, setShowRecent] = useState(false)

  const plants = todayList(state)
  const standings = new Map(plants.map((plant) => [plant.code, standing(state, plant, fallback)]))
  const listed = (plant: Plant) => standings.get(plant.code)!.listed
  const ordered = useHeldOrder(round(state, [...standings.values()]))
  const shown = showRecent ? ordered : ordered.filter(listed)
  const recent = ordered.filter((plant) => !listed(plant))

  // Cut into rooms in the order the round already has them in. By first
  // appearance rather than by run: a plant that joins mid-visit is held at the
  // end of the order, and still belongs under its own room's label.
  const byRoom = new Map<string, Plant[]>()
  for (const plant of shown) {
    const name = vocabName(state, plant.locationId)
    const label = name && name !== '—' ? name : 'No place'
    byRoom.set(label, [...(byRoom.get(label) ?? []), plant])
  }
  const rooms = [...byRoom.entries()]

  return (
    <div className="flex flex-col gap-6">
      <SyncStatusPill status={syncStatus} className="md:hidden" />

      <div className="flex flex-col gap-1">
        {/* From `lg` whatever else is owed today sits in the title's own row,
            as the same tiles a phone shows under it: the one glance that says
            what there is to do, and the water still the first list on the
            page. */}
        <ScreenHeader title="Today" action={<ChoresStrip className="hidden lg:block" />} />
        {/* The sachets while they are only hanging: a fact about the room
            the plants stand in, owed nothing, so a line under the title
            rather than a tile. Ordering them is a chore, and is one above. */}
        <SachetReminder />
      </div>

      {/* The only thing here about losing data, so it stays a banner. */}
      <BackupReminder
        lastBackupAt={state.lastBackupAt}
        hasPlants={livePlants(state).length > 0}
        synced={syncStatus.kind !== 'unconfigured'}
      />

      {/* On a phone the tiles stand under the title, out of the water's way;
          each opens its rows in a sheet. */}
      <ChoresStrip className="lg:hidden" />

      {plants.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Add your first plant and it will show up here, room by room, the ones that have gone longest without water first."
          action={
            <Button variant="accent" onClick={() => navigate(routes.new())}>
              Add a plant
            </Button>
          }
        />
      ) : (
        <section className="min-w-0">
          {/* The table header only exists once there are columns to head. No
              heading over the list: the tiles above and these heads say where
              it starts. */}
          <div className="hidden items-center gap-3 border-b border-line-strong pb-2 pl-3 lg:flex">
            <span className="w-10 shrink-0" />
            <ColumnHeader className="flex-1">Plant</ColumnHeader>
            <ColumnHeader className="w-64">Species</ColumnHeader>
            {/* Built the way a row is: the cells sit inside the link and its
                padding, and the figure's column stands outside it with no gap,
                so each head is over what it names. */}
            <div className="flex items-center gap-8 pr-3">
              <ColumnHeader className="w-24">Last water</ColumnHeader>
            </div>
            <ColumnHeader className="-ml-3 w-32 pr-3 text-right">Days</ColumnHeader>
          </div>

          {rooms.map(([place, members], index) => (
            // Rooms are a block step apart; the first sits under the tiles on
            // a phone, and under the table header on a desktop.
            <section key={place} className={index > 0 ? 'mt-6' : 'lg:mt-6'}>
              <DrawerLabel
                name={place}
                count={members.length}
                action={<WaterRoom plants={members} />}
              />
              <Rows className="border-t-0">
                {members.map((plant) => (
                  <TodayRow key={plant.code} plant={plant} rhythm={standings.get(plant.code)!.rhythm} />
                ))}
              </Rows>
            </section>
          ))}

          {shown.length === 0 ? (
            <p className="border-b border-line px-3 py-4 text-[0.9375rem] text-ink-muted">
              Nothing is near its usual gap today.
            </p>
          ) : null}

          <RecentLine
            count={recent.length}
            shown={showRecent}
            onToggle={() => setShowRecent((was) => !was)}
          />
        </section>
      )}
    </div>
  )
}

/**
 * One plant, in both readings.
 *
 * Below `lg` the second line is the species. From `lg` the table is the
 * page's whole width and the species gets a column of its own — under the name
 * it had to be cut short at the width it used to share with the chores beside
 * it. The place is the drawer label's, at every width.
 *
 * Under the figure, the plant's own rhythm rather than the word "days": the
 * number means nothing much until you know what it usually is. It turns ember
 * at half as long again as that, the point where "late" stops being a matter
 * of a day.
 */
function TodayRow({ plant, rhythm }: { plant: Plant; rhythm: number | null }) {
  const state = useStore()
  const days = daysSinceWater(state, plant.code)
  const last = lastWaterAt(state, plant.code)
  const today = wateringToday(state, plant.code)
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
            thirsty={rhythm !== null ? days !== null && days >= rhythm * 1.5 : isThirsty(days)}
            unit={rhythm !== null ? `usually ${rhythm}` : undefined}
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
        {/* One line, one fact. The place is the drawer label's. */}
        {species ? (
          <span className="truncate text-[0.8125rem] leading-[1.0625rem] text-ink-muted lg:hidden">
            {species}
          </span>
        ) : null}
      </div>

      <Cell className="hidden w-64 lg:block">{species || '—'}</Cell>

      <div className="flex shrink-0 items-center gap-8">
        <Cell className="hidden w-24 lg:block" mono>
          {last ? formatDayMonth(last) : '—'}
        </Cell>
      </div>
    </RowLink>
  )
}

/**
 * The plants left off the list because they are not near their usual gap yet.
 *
 * Said rather than hidden: a list that quietly shows less than the collection
 * is a list you stop trusting. One quiet line under the table, which lets them
 * in for as long as the screen is up.
 */
function RecentLine({
  count,
  shown,
  onToggle,
}: {
  count: number
  shown: boolean
  onToggle: () => void
}) {
  if (count === 0) return null

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={shown}
      className="mt-3 flex min-h-touch items-center gap-2 px-3 text-[0.8125rem] text-ink-muted hover:text-ink"
    >
      <Icon name={shown ? 'chevronDown' : 'chevronRight'} size={15} className="shrink-0" />
      {shown
        ? `Hide the ${count} not yet near their usual gap`
        : `${plural(count, 'plant')} not yet near their usual gap`}
    </button>
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
