/**
 * Today — what you see when you open the bookmark.
 *
 * The whole collection on one line, measured against each plant's own rhythm:
 * Late, Due and Tomorrow are the water owed, Later is everything else with how
 * many days it has to go. Late is half as long again as the usual gap, the
 * point where "late" stops being a matter of a day; Tomorrow is a day short,
 * the evening before a round being when you look to see what is coming.
 * Only a plant with a rhythm can be late: late is a claim about a habit, and
 * one watered once or never has none yet, so however long it has gone it is
 * Due.
 *
 * Need is measured against each plant's own rhythm — the gap you usually leave
 * between its waterings, read back out of its log (see `waterRhythm`). A plant
 * on a weekly round at day nine is further along than one in a self-watering
 * pot at day ten of its usual fourteen, and a single scale of days could not
 * say so. A plant without enough history to have a rhythm waits the number of
 * days set in Settings, and one never watered leads Due.
 *
 * Every plant is there. A list that quietly showed less than the collection
 * was a list you stopped trusting, and on a desktop there was the room to show
 * it all; on a phone Later folds into one line under the water.
 *
 * The row leads with what the plant is, the species, because that is what you
 * know it by; the name you gave it follows small, with the room it stands in.
 * The rooms are a filter rather than a grouping: you water a room at a time,
 * so a room picked shows that room alone, with what is owed in it in one
 * press. There are a dozen of them, so the filter is one control that says
 * the room it is on rather than a row of chips that said all of them at
 * once. The room picked stays picked while the app is open — you go into a
 * plant from it and come back to the same round — and the app opens again on
 * every room.
 *
 * Watering is logged from here too. The figure on each row is a button:
 * pressed, it turns to the check that already meant "watered today", and
 * pressed again it takes the day's watering back. The cachepots the day after,
 * and the rest of what is owed today, stay out of the water's way — see
 * `Chores`.
 *
 * A plant watered today keeps the column it was in this morning — its place
 * is read from the watering before today's — and sinks to the foot of it.
 * While you are on the screen the rows hold the order and the column they
 * opened in, so a plant you have just watered does not slide the next one
 * under your pointer.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { logEvent, removeEvent, useStore, waterPlants, type State } from '~/data/store'
import {
  eventsFor,
  livePlants,
  todayList,
  vocabName,
  waterRhythm,
  wateringToday,
} from '~/data/selectors'
import type { Plant } from '~/data/types'
import { useSyncStatus } from '~/data/sync'
import { daysSince, isoToInputValue, todayInputValue } from '~/lib/date'
import { formatSpecies, plural } from '~/lib/format'
import { useTodayAfter } from '~/lib/todayAfter'
import { useToday } from '~/lib/today'
import { useHeld as useKept } from '~/lib/remembered'
import { navigate, routes } from '~/lib/router'
import { cn } from '~/lib/cn'
import { Banner } from '~/ui/Banner'
import { Button } from '~/ui/Button'
import { ChoresStrip } from '~/ui/Chores'
import { Icon } from '~/ui/Icon'
import { PlantThumb } from '~/ui/plantPicture'
import { EmptyState, ScreenHeader } from '~/ui/primitives'
import { RowLink } from '~/ui/rows'
import { SachetReminder } from '~/ui/Sachets'
import { SyncStatusPill } from '~/ui/SyncStatusPill'
import { WaterFigure } from '~/ui/Water'

/** After this long without an export, the reminder appears and stays. */
const BACKUP_REMINDER_DAYS = 14

/** The room a plant with no place stands in, which goes last in the filter. */
const NO_PLACE = 'No place'

type Column = 'late' | 'due' | 'soon' | 'later'

/** The water owed, left to right: the heading and how it is set. */
const OWED: { column: Exclude<Column, 'later'>; title: string; tone: string }[] = [
  { column: 'late', title: 'Late', tone: 'text-ember' },
  { column: 'due', title: 'Due', tone: 'text-ink' },
  { column: 'soon', title: 'Tomorrow', tone: 'text-ink-muted' },
]

/** Where a plant stood this morning, against its own rhythm — or, without one
 *  yet, against the days set in Settings. */
type Standing = {
  plant: Plant
  room: string
  /** Days since the watering before today's: what the figure said before any
   *  water went in today, so a press never moves the plant. */
  days: number | null
  rhythm: number | null
  /** How far into its usual gap: 1 is the gap itself. Never watered is
   *  infinite, so it leads. */
  need: number
  column: Column
  /** For Later: days until it is at its usual gap. */
  until: number
  /** Watered today. Read for the order the screen opens in, which puts it at
   *  the foot of its column; after that `useHeld` keeps every row where it
   *  opened, so a press does not move it. */
  wateredToday: boolean
}

/** The day of the latest watering that was not today's. */
function waterBeforeToday(state: State, code: string): string | null {
  const today = todayInputValue()
  const before = eventsFor(state, code).find(
    (event) => event.type === 'water' && isoToInputValue(event.date) !== today,
  )
  return before?.date ?? null
}

function standing(state: State, plant: Plant, fallback: number): Standing {
  const before = waterBeforeToday(state, plant.code)
  const days = before === null ? null : daysSince(before)
  const rhythm = waterRhythm(state, plant.code)
  const name = vocabName(state, plant.locationId)
  const room = name && name !== '—' ? name : NO_PLACE
  const wateredToday = wateringToday(state, plant.code) !== null
  const base = { plant, room, days, rhythm, wateredToday }

  if (days === null) return { ...base, need: Infinity, column: 'due', until: 0 }
  const gap = rhythm ?? fallback
  const need = gap > 0 ? days / gap : days
  const until = gap - days

  if (rhythm !== null) {
    const column =
      days >= rhythm * 1.5 ? 'late' : days >= rhythm ? 'due' : days >= rhythm - 1 ? 'soon' : 'later'
    return { ...base, need, column, until }
  }
  // No rhythm yet: on once the days set in Settings are up, and never late —
  // a plant watered once, three weeks ago, may well be one that likes it dry.
  const column = days < fallback ? 'later' : 'due'
  return { ...base, need, column, until }
}

/** The order a column opens in: what was watered before you came to the foot,
 *  then the water by need and Later by the days it has to go, a name breaking
 *  a tie. Need is compared rather than subtracted: two never-watered plants
 *  are both infinitely far along, and infinity minus itself is not a number.
 *  Only ever two plants of one column are compared that matter — the columns
 *  are cut out of this one order. */
function byNeed(a: Standing, b: Standing): number {
  if (a.wateredToday !== b.wateredToday) return a.wateredToday ? 1 : -1
  if (a.column === 'later' && b.column === 'later' && a.until !== b.until) return a.until - b.until
  if (a.need !== b.need) return a.need > b.need ? -1 : 1
  return a.plant.name.localeCompare(b.plant.name)
}

export function TodayScreen() {
  const state = useStore()
  // Everything below counts days from now; this redraws it when now is a new day.
  useToday()
  const syncStatus = useSyncStatus()
  const [fallback] = useTodayAfter()
  const [room, setRoom] = useKept<string | null>('today-room', null)
  const [showLater, setShowLater] = useState(false)

  const plants = todayList(state)
  const held = useHeld(plants.map((plant) => standing(state, plant, fallback)).sort(byNeed))
  const watered = (each: Standing) => wateringToday(state, each.plant.code) !== null
  const owed = (each: Standing) =>
    (each.column === 'late' || each.column === 'due') && !watered(each)

  const rooms = [...new Set(held.map((each) => each.room))].sort((a, b) =>
    a === NO_PLACE ? 1 : b === NO_PLACE ? -1 : a.localeCompare(b),
  )
  // A room that has emptied — its last plant moved or archived — lets go.
  const picked = room !== null && rooms.includes(room) ? room : null
  const shown = picked === null ? held : held.filter((each) => each.room === picked)
  const inColumn = (column: Column) => shown.filter((each) => each.column === column)
  const later = inColumn('later')
  const left = shown.filter(owed)
  const anyOwed = OWED.some(({ column }) => inColumn(column).length > 0)

  return (
    <div className="flex flex-col gap-6">
      <SyncStatusPill status={syncStatus} className="md:hidden" />

      <div className="flex flex-col gap-1">
        {/* From `lg` whatever else is owed today sits in the title's own row,
            as the same tiles a phone shows under it: the one glance that says
            what there is to do, and the water still the first list on the
            page. */}
        <ScreenHeader
          title="Today"
          beside={
            // The room in the title's own row: what the board below is
            // showing, said where its name is, and no line of the page
            // spent on it.
            plants.length > 0 ? (
              <RoomPicker
                rooms={rooms.map((name) => ({
                  name,
                  owed: held.filter((each) => each.room === name && owed(each)).length,
                }))}
                picked={picked}
                onPick={setRoom}
              />
            ) : null
          }
          action={
            <div className="flex items-center gap-3">
              {/* What is really owed in the room, and only that — Late and
                  Due: Tomorrow's are a day short, and are ticked one by one
                  if they had water too. At the row's end, where an action
                  stands, apart from the room it acts on. The count is in it,
                  so it says what it will do and no line beside it has to:
                  Water 2. One left is the row's own figure, so none. Quiet,
                  in the water's colour with no ground until the pointer is
                  on it: a list that already presses on every row has no
                  need to shout, and even a tinted fill was the loudest
                  thing on the page. Every room has none — a round is a
                  room. */}
              {picked !== null && left.length > 1 ? (
                <Button
                  size="sm"
                  variant="water-quiet"
                  icon="droplet"
                  title={`Water the ${left.length} late and due in ${picked}`}
                  onClick={() => void waterPlants(left.map((each) => each.plant.code))}
                >
                  {`Water ${left.length}`}
                </Button>
              ) : null}
              <ChoresStrip className="hidden lg:block" />
            </div>
          }
        />
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
          description="Add your first plant and it will show up here, the ones that have gone longest without water first."
          action={
            <Button variant="accent" onClick={() => navigate(routes.new())}>
              Add a plant
            </Button>
          }
        />
      ) : (
        <section className="flex min-w-0 flex-col gap-4">
          {/* On a phone the columns are sections, one under the other. From
              `md` Late and Due stand side by side, Tomorrow under Late, and
              from `xl` all three of the water do; three at `lg` cut a
              species after every word again. Below `xl` Later is one line
              that lets it in, as on a phone: the water is what the screen is
              for, and it then has no room beside it for anything else. From
              `xl` Later runs the full width under them, its names set in
              columns of their own. Four in one line left a column a quarter
              of the screen wide, which cut a species after a word; and Later
              is where most of a collection is on most days, so it is what
              gets the width. */}
          <div className="flex flex-col gap-6 md:gap-12">
            <div className="flex min-w-0 flex-col gap-6 md:grid md:grid-cols-2 md:grid-rows-[auto_1fr] md:gap-8 xl:grid-cols-3 xl:grid-rows-none">
              {OWED.map(({ column, title, tone }) => {
                const members = inColumn(column)
                return (
                  <section
                    key={column}
                    className={cn(
                      'min-w-0',
                      members.length === 0 && 'hidden md:block',
                      // Two columns: Due runs the height of both rows, so
                      // Tomorrow starts right under Late rather than under
                      // the foot of a long Due.
                      column === 'due' && 'md:row-span-2 xl:row-span-1',
                    )}
                  >
                    <ColumnHead title={title} count={members.length} className={tone} />
                    {members.map((each) => (
                      <TodayRow key={each.plant.code} standing={each} withRoom={picked === null} />
                    ))}
                  </section>
                )
              })}
            </div>

            {!anyOwed ? (
              <p className="text-[0.9375rem] text-ink-muted md:hidden">
                Nothing is near its usual gap today.
              </p>
            ) : null}

            <section className="min-w-0">
              {later.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowLater((was) => !was)}
                  aria-expanded={showLater}
                  className="flex min-h-touch items-center gap-2 text-[0.8125rem] text-ink-muted hover:text-ink xl:hidden"
                >
                  <Icon name={showLater ? 'chevronDown' : 'chevronRight'} size={15} className="shrink-0" />
                  {showLater ? `Hide the ${later.length} for later` : `${later.length} for later`}
                </button>
              ) : null}
              <ColumnHead title="Later" count={later.length} className="hidden text-ink-muted xl:flex" />
              <div className={cn(showLater ? 'block' : 'hidden', 'md:columns-2 md:gap-8 xl:block xl:columns-3 2xl:columns-4')}>
                {later.map((each) => (
                  <LaterRow key={each.plant.code} standing={each} />
                ))}
              </div>
            </section>
          </div>
        </section>
      )}
    </div>
  )
}

/**
 * Which room the board shows: the room's name set as a heading, with a
 * chevron, opening the rooms under it.
 *
 * A list of our own rather than the system's: the native one dropped a
 * system font and a blue highlight into a page set in this one's type, and
 * could not put a room's count where it reads as a count. It is still a
 * listbox in every way the web expects — arrows, Home and End, Enter to
 * pick, Escape to close, a press outside to let go — the anchored panel the
 * Wishlist's menu already is. In the list each room says what is owed in it,
 * so one with nothing late or due reads as done before it is picked.
 */
function RoomPicker({
  rooms,
  picked,
  onPick,
}: {
  rooms: { name: string; owed: number }[]
  picked: string | null
  onPick: (room: string | null) => void
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)

  const choices: { value: string | null; name: string; owed: number }[] = [
    { value: null, name: 'Every room', owed: rooms.reduce((sum, room) => sum + room.owed, 0) },
    ...rooms.map((room) => ({ value: room.name, ...room })),
  ]
  const pickedAt = Math.max(0, choices.findIndex((choice) => choice.value === picked))

  // The list takes the keys as it opens, on the room it is on.
  useEffect(() => {
    if (open) list.current?.focus()
  }, [open])
  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, id])

  const show = () => {
    setActive(pickedAt)
    setOpen(true)
  }
  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  const pick = (index: number) => {
    onPick(choices[index]!.value)
    close()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = choices.length - 1
    const to: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    }
    if (event.key in to) {
      event.preventDefault()
      setActive(to[event.key]!)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      pick(active)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`Room: ${choices[pickedAt]!.name}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            show()
          }
        }}
        className={cn(
          'warm inline-flex h-touch items-center gap-2 rounded-md px-3 hover:bg-sunk active:opacity-70',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
          open && 'bg-sunk',
        )}
      >
        <span className="font-display text-[1.3125rem] leading-7 text-ink">
          {choices[pickedAt]!.name}
        </span>
        <Icon
          name="chevronDown"
          size={18}
          className={cn(
            'shrink-0 text-ink-muted transition-[rotate] duration-200 ease-grow',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close the rooms"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-label="Room"
            tabIndex={-1}
            aria-activedescendant={`${id}-${active}`}
            onKeyDown={onKeyDown}
            // On the room name's edge rather than the hover's, so on a phone
            // it keeps the page's gutter.
            className={cn(
              'absolute top-full left-3 z-50 mt-1 w-64 max-h-[min(30rem,70vh)] overflow-y-auto overscroll-contain',
              'rounded-xl border border-line bg-surface py-1 shadow-xl outline-none',
              'origin-top-left animate-panel-in motion-reduce:animate-none',
            )}
          >
            {choices.map((choice, index) => {
              const selected = index === pickedAt
              return (
                <div
                  key={choice.value ?? ''}
                  id={`${id}-${index}`}
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(index)}
                  onPointerMove={() => setActive(index)}
                  className={cn(
                    'flex h-11 cursor-pointer items-center gap-3 px-4 text-[0.9375rem] text-ink',
                    // Every room is the whole house; a hairline sets it
                    // apart from the rooms it is made of.
                    index === 0 && 'border-b border-line',
                    index === active && 'bg-sunk',
                    selected && 'font-semibold',
                  )}
                >
                  <span className="flex w-4 shrink-0 justify-center text-leaf">
                    {selected ? <Icon name="check" size={16} /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{choice.name}</span>
                  {/* Nothing owed is no figure at all, so a room that is
                      done reads as quiet rather than as a nought. */}
                  {choice.owed > 0 ? (
                    <span className="font-mono text-micro text-ink-faint">{choice.owed}</span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}

function ColumnHead({ title, count, className }: { title: string; count: number; className?: string }) {
  return (
    <div className={cn('flex items-baseline gap-2 border-b border-line-strong pb-2', className)}>
      <h2 className="font-display text-[1.3125rem] leading-7 font-medium">{title}</h2>
      <span className="font-mono text-micro text-ink-faint">{count}</span>
    </div>
  )
}

/** What the plant is, cut where a specimen label changes face: the binomial,
 *  and the cultivar and variegation after it. Null for a plant known no
 *  further than the name you gave it. */
type Species = { binomial: string; rest: string }

function speciesOf(plant: Plant): Species | null {
  const named = formatSpecies({ ...plant, variegation: '' })
  if (!named) return null
  const cut = named.startsWith("'") ? 0 : named.indexOf(" '")
  const binomial = cut < 0 ? named : named.slice(0, cut)
  const rest = [cut < 0 ? '' : named.slice(cut).trim(), plant.variegation ?? ''].filter(Boolean).join(' ')
  return { binomial, rest }
}

/** The binomial in italic, the cultivar and the variegation upright — or,
 *  without a species, the plant's own name. */
function SpeciesName({ species, name }: { species: Species | null; name: string }) {
  if (!species) return <>{name}</>
  const { binomial, rest } = species
  return (
    <>
      {binomial ? <span className="italic">{binomial}</span> : null}
      {binomial && rest ? ' ' : null}
      {rest}
    </>
  )
}

/** The press on a row: water, or take the day's watering back. */
function useWaterPress(plant: Plant) {
  const state = useStore()
  const today = wateringToday(state, plant.code)

  const takeBack = () => {
    if (!today) return
    // A watering with a photograph on it is more than a tick, so it is not
    // taken back blind from a list: the press opens the plant, where the entry
    // and its picture are in view and are swiped out together.
    if (today.photo) navigate(routes.plant(plant.code))
    else void removeEvent(today.id)
  }
  // Always fed, as on the plant's page.
  const water = () => void logEvent({ type: 'water', plantCode: plant.code, fertilized: true })

  return { watered: today !== null, water, takeBack }
}

/**
 * One plant owed water: its picture, what it is, and the figure that waters it.
 *
 * After the figure, the plant's own rhythm, `17 /9`: the number means
 * nothing much until you know what it usually is.
 */
function TodayRow({ standing: { plant, room, days, rhythm, column }, withRoom }: { standing: Standing; withRoom: boolean }) {
  const { watered, water, takeBack } = useWaterPress(plant)
  const species = speciesOf(plant)
  // The name you gave it is in the serif, like everywhere else a person named
  // something; the room after it is chrome. Without a species the name is
  // already the line above.
  const nickname = species ? plant.name : null
  const place = withRoom ? room : null

  return (
    <RowLink
      href={routes.plant(plant.code)}
      trailing={
        <WaterFigure
          name={plant.name}
          days={days}
          rhythm={rhythm}
          tone={column === 'later' ? 'soon' : column}
          watered={watered}
          onWater={water}
          onTakeBack={takeBack}
        />
      }
    >
      <PlantThumb plant={plant} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Two lines before it is cut: a column of the board is narrow, and a
            cultivar is often what tells two of a species apart. */}
        <span className="line-clamp-2 font-display text-[1.0625rem] leading-[1.375rem]">
          <SpeciesName species={species} name={plant.name} />
        </span>
        {nickname || place ? (
          <span className="truncate text-[0.8125rem] leading-[1.0625rem] text-ink-muted">
            {nickname ? <span className="font-display text-[0.9375rem]">{nickname}</span> : null}
            {nickname && place ? ' · ' : null}
            {place}
          </span>
        ) : null}
      </div>
    </RowLink>
  )
}

/**
 * A plant not near its gap yet: what it is, and how many days it has to go.
 *
 * Quieter than a row owed water, and still a press — a plant watered early
 * because the rest of its room was is ticked here like any other. It writes
 * data, so it keeps the reach floor however quiet it looks.
 */
function LaterRow({ standing: { plant, until } }: { standing: Standing }) {
  const { watered, water, takeBack } = useWaterPress(plant)

  return (
    <div className="warm flex break-inside-avoid items-center border-b border-line hover:bg-sunk">
      <a
        href={routes.plant(plant.code)}
        className="flex min-h-touch min-w-0 flex-1 items-center py-2 pl-3 font-display text-[0.9375rem] leading-5 text-ink-muted"
      >
        {/* Two lines before it is cut, as on a row owed water. */}
        <span className="line-clamp-2">
          <SpeciesName species={speciesOf(plant)} name={plant.name} />
        </span>
      </a>
      <button
        type="button"
        onClick={watered ? takeBack : water}
        aria-pressed={watered}
        aria-label={`${plant.name}: watered today`}
        title={watered ? 'Watered today. Press to take it back' : 'Watered'}
        className={cn(
          'flex min-h-touch min-w-14 shrink-0 items-center justify-end rounded-md px-3 font-mono text-micro',
          'hover:bg-line active:opacity-70',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
          watered ? 'text-leaf' : 'text-ink-faint',
        )}
      >
        {watered ? <Icon name="check" size={16} /> : `in ${until}`}
      </button>
    </div>
  )
}

/**
 * The order and the column the screen opened with, held for as long as it is
 * up.
 *
 * Watering moves a plant to the foot of its column, and can nudge its rhythm
 * over a line; doing either while you are working down the list puts the next
 * row under the pointer that just pressed. A plant that turns up mid-visit — a
 * sync, a plant added on another tab — joins at the end. Leaving the screen
 * lets go, so the next visit opens in the real order.
 */
function useHeld(standings: readonly Standing[]): Standing[] {
  const held = useRef(new Map<string, { rank: number; column: Column }>())
  for (const each of standings) {
    if (!held.current.has(each.plant.code)) {
      held.current.set(each.plant.code, { rank: held.current.size, column: each.column })
    }
  }
  return standings
    .map((each) => ({ ...each, column: held.current.get(each.plant.code)!.column }))
    .sort((a, b) => held.current.get(a.plant.code)!.rank - held.current.get(b.plant.code)!.rank)
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
