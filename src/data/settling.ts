/**
 * Settling in: the few weeks a plant needs looking after differently.
 *
 * Three kinds, each with its own schedule fixed here rather than set up per
 * plant — the schedule is what you do every time, and a plant that is not
 * ready when it ends gets two weeks longer, which is one press:
 *
 * - **Hardening off**, for a plant from tissue culture: four weeks of taking
 *   the lid off a little longer each week, started once it has a first leaf
 *   or good roots. That moment is a judgement, so it is a press; six weeks
 *   after the plant arrived without one, Today asks.
 * - **Into pon**, after the move from soil: six weeks of water from the top
 *   every third day, the reservoir left empty. Lechuza's own advice is twelve;
 *   six with "two weeks longer" is what is actually done here.
 * - **Quarantine**, for as long as a plant stands in a place marked as one. It
 *   says on Today when the weeks are up, and ends when the plant is moved.
 *
 * Like everything derived, none of this is stored: the start, any two weeks
 * longer, and the ticks are events, and the week, the day and what today asks
 * for are read off them at render time.
 */

import { addDays, daysBetween, daysSince, isoToInputValue, todayInputValue } from '~/lib/date'
import { eventsFor, findPlant, livePlants, vocabById } from './selectors'
import type { State } from './store'
import type {
  AiredEvent,
  Plant,
  PlantEvent,
  SettleEvent,
  SettleKind,
  VocabItem,
  WaterEvent,
} from './types'

/** What two weeks longer adds, for every kind. */
export const LONGER_DAYS = 14

/** Hardening off, week by week: what the week is called on the plant page,
 *  and what the day asks for. */
export const HARDEN_WEEKS = [
  { name: '1 hour', today: 'Lid off for an hour today', short: '1 hour' },
  { name: '3 hours', today: 'Lid off for 3 hours today', short: '3 hours' },
  { name: 'By day', today: 'Lid off for the day', short: 'by day' },
  { name: 'Always', today: 'Leave the lid off', short: 'lid off' },
] as const

export const HARDEN_DAYS = HARDEN_WEEKS.length * 7

/** Six weeks after a plant from tissue culture arrived, Today asks whether it
 *  is time — about when the first leaf or the roots are there. */
export const HARDEN_ASK_AFTER_DAYS = 42

export const PON_DAYS = 42
export const PON_EVERY_DAYS = 3

/** What a place gets when it is first marked as a quarantine: about a month,
 *  which is what Cornell's pest guide advises and covers a thrips hatch. */
export const DEFAULT_QUARANTINE_WEEKS = 4

export type Hardening =
  | {
      kind: 'harden'
      phase: 'waiting'
      plant: Plant
      /** Days since it arrived. */
      daysIn: number
    }
  | {
      kind: 'harden'
      phase: 'running'
      plant: Plant
      start: SettleEvent
      /** Counted from 0, the day it started. */
      day: number
      length: number
      /** 0 to 3, an index into `HARDEN_WEEKS`. */
      week: number
      airedToday: AiredEvent | null
    }

export type IntoPon = {
  kind: 'pon'
  plant: Plant
  start: SettleEvent
  day: number
  length: number
  /** Each watering since it started, oldest first. */
  waterings: WaterEvent[]
  /** Due today: three days or more since the last watering before today. */
  due: boolean
  wateredToday: WaterEvent | null
  /** Days until the next one; 0 when it is today. */
  nextIn: number
  /** Given two weeks longer — offered once, and not again while that runs. */
  extended: boolean
}

export type Quarantine = {
  kind: 'quarantine'
  plant: Plant
  place: VocabItem
  /** ISO date it came into the place. */
  since: string
  day: number
  length: number
  /** Given two weeks longer, and those two weeks are not up yet. */
  extended: boolean
}

export type Settling = Hardening | IntoPon | Quarantine

/** The place a plant stands in, when that place is a quarantine. */
export function quarantinePlace(state: State, plant: Plant): VocabItem | null {
  const place = plant.locationId ? vocabById(state).get(plant.locationId) : undefined
  return place && isQuarantine(place) ? place : null
}

export function isQuarantine(place: VocabItem): boolean {
  return place.kind === 'location' && !place.archived && (place.quarantineWeeks ?? 0) > 0
}

function settleEvents(state: State, code: string, kind: SettleKind): SettleEvent[] {
  return eventsFor(state, code).filter(
    (event): event is SettleEvent => event.type === 'settle' && event.kind === kind,
  )
}

/**
 * The latest start (or skip) of a kind, and every two weeks longer since.
 *
 * A quarantine can be running with no start written — the plant was already
 * standing there when the place became one — so `since` says where to count
 * the extra weeks from when there is no start to count them from.
 */
function current(state: State, code: string, kind: SettleKind, since?: string) {
  // Newest first, so the first start or skip is the one in force.
  const events = settleEvents(state, code, kind)
  const anchor = events.find((event) => event.step !== 'longer') ?? null
  const from = anchor?.date ?? since
  const longer =
    from === undefined
      ? 0
      : events.filter(
          (event) =>
            event.step === 'longer' && isoToInputValue(event.date) >= isoToInputValue(from),
        ).length
  return { anchor, extra: longer * LONGER_DAYS }
}

function sameDay(iso: string, day = todayInputValue()): boolean {
  return isoToInputValue(iso) === day
}

export function hardeningOf(state: State, plant: Plant): Hardening | null {
  if (plant.wish || plant.status !== 'active') return null
  const { anchor } = current(state, plant.code, 'harden')

  if (!anchor) {
    if (!plant.tissueCulture) return null
    return {
      kind: 'harden',
      phase: 'waiting',
      plant,
      daysIn: daysSince(plant.origin.date ?? plant.createdAt),
    }
  }
  if (anchor.step === 'skip') return null

  const day = daysSince(anchor.date)
  if (day >= HARDEN_DAYS || day < 0) return null

  const airedToday =
    eventsFor(state, plant.code).find(
      (event): event is AiredEvent => event.type === 'aired' && sameDay(event.date),
    ) ?? null

  return {
    kind: 'harden',
    phase: 'running',
    plant,
    start: anchor,
    day,
    length: HARDEN_DAYS,
    week: Math.min(HARDEN_WEEKS.length - 1, Math.floor(day / 7)),
    airedToday,
  }
}

export function intoPonOf(state: State, plant: Plant): IntoPon | null {
  if (plant.wish || plant.status !== 'active') return null
  const { anchor, extra } = current(state, plant.code, 'pon')
  if (!anchor || anchor.step !== 'start') return null

  const length = PON_DAYS + extra
  const day = daysSince(anchor.date)
  if (day >= length || day < 0) return null

  const startDay = isoToInputValue(anchor.date)
  const today = todayInputValue()
  const waterings = eventsFor(state, plant.code)
    .filter(
      (event): event is WaterEvent =>
        event.type === 'water' && isoToInputValue(event.date) >= startDay,
    )
    .reverse()

  // Measured from the last watering before today, so that pressing the drop
  // today does not take the row away under your thumb: it stays, ticked.
  const before = waterings.filter((event) => isoToInputValue(event.date) < today).at(-1)
  const since = daysSince(before?.date ?? anchor.date)
  const wateredToday = waterings.find((event) => sameDay(event.date, today)) ?? null
  const last = wateredToday?.date ?? before?.date ?? anchor.date

  return {
    kind: 'pon',
    plant,
    start: anchor,
    day,
    length,
    waterings,
    due: since >= PON_EVERY_DAYS,
    wateredToday,
    nextIn: Math.max(0, PON_EVERY_DAYS - daysSince(last)),
    extended: extra > 0,
  }
}

export function quarantineOf(state: State, plant: Plant): Quarantine | null {
  if (plant.wish || plant.status !== 'active') return null
  const place = quarantinePlace(state, plant)
  if (!place) return null

  // Moving a plant in writes a start; one that was already standing there
  // when the place became a quarantine counts from the day it arrived.
  const arrived = plant.origin.date ?? plant.createdAt
  const { anchor, extra } = current(state, plant.code, 'quarantine', arrived)
  const since = anchor?.step === 'start' ? anchor.date : arrived

  const day = Math.max(0, daysSince(since))
  const length = (place.quarantineWeeks ?? DEFAULT_QUARANTINE_WEEKS) * 7 + extra
  return { kind: 'quarantine', plant, place, since, day, length, extended: extra > 0 && day < length }
}

/** Everything a plant is settling into right now, for its own page. */
export function settlingOf(state: State, code: string): Settling[] {
  const plant = findPlant(state, code)
  if (!plant || plant.deleted) return []
  return [hardeningOf(state, plant), intoPonOf(state, plant), quarantineOf(state, plant)].filter(
    (item): item is Settling => item !== null,
  )
}

/**
 * What Today lists under Settling in: only what asks for something today.
 *
 * Hardening off every day of its first three weeks, and once more on the
 * first day of the fourth, when the lid comes off for good. Into pon on the
 * days a watering from the top is due. Quarantine from the day its weeks are
 * up until the plant is moved. A plant from tissue culture that was never
 * started, from six weeks after it arrived until it is.
 */
export function settlingToday(state: State): Settling[] {
  const due: Settling[] = []

  for (const plant of livePlants(state)) {
    const hardening = hardeningOf(state, plant)
    if (hardening?.phase === 'waiting' && hardening.daysIn >= HARDEN_ASK_AFTER_DAYS) {
      due.push(hardening)
    }
    if (
      hardening?.phase === 'running' &&
      (hardening.week < 3 || hardening.day === 21 || hardening.airedToday)
    ) {
      due.push(hardening)
    }

    const pon = intoPonOf(state, plant)
    if (pon?.due) due.push(pon)

    const quarantine = quarantineOf(state, plant)
    if (quarantine && quarantine.day >= quarantine.length) due.push(quarantine)
  }

  return due.sort(
    (a, b) => a.plant.name.localeCompare(b.plant.name) || a.kind.localeCompare(b.kind),
  )
}

/** Whether a row on Today has been done for the day. */
export function doneToday(item: Settling): boolean {
  if (item.kind === 'harden') return item.phase === 'running' && item.airedToday !== null
  if (item.kind === 'pon') return item.wateredToday !== null
  return false
}

/**
 * The ends worth a line in Milestones: the day a plant was used to the air,
 * and the day it was settled into pon. Quarantine ends by being moved, which
 * is not a day anybody remembers.
 */
export function settledMilestones(
  events: readonly PlantEvent[],
): { date: string; title: string; detail: string | null }[] {
  const lines: { date: string; title: string; detail: string | null }[] = []
  // Newest first, as `eventsFor` hands them over.
  const settle = events.filter((event): event is SettleEvent => event.type === 'settle')

  for (const kind of ['harden', 'pon'] as const) {
    const ofKind = settle.filter((event) => event.kind === kind)
    const anchor = ofKind.find((event) => event.step !== 'longer')
    if (!anchor || anchor.step !== 'start') continue

    const extra =
      kind === 'pon'
        ? ofKind.filter((event) => event.step === 'longer' && event.date >= anchor.date).length *
          LONGER_DAYS
        : 0
    const length = (kind === 'harden' ? HARDEN_DAYS : PON_DAYS) + extra
    const ended = addDays(anchor.date, length)
    if (daysBetween(ended) < 0) continue

    lines.push(
      kind === 'harden'
        ? { date: ended.toISOString(), title: 'Used to the air', detail: 'four weeks off the lid' }
        : { date: ended.toISOString(), title: 'Settled into pon', detail: null },
    )
  }

  return lines
}
