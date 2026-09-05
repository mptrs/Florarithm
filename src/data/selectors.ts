/**
 * Everything derived, computed here and stored nowhere.
 *
 * Days since water, average rhythm, leaves this year, collection value: all of
 * it falls out of the event log at render time. The moment one of these gets
 * written back into a record it can disagree with the log, and then you have
 * two answers and no way to tell which is true.
 *
 * The lookup maps are memoised against the state object, so a screen that calls
 * five selectors builds them once.
 */

import { daysSince, yearOf } from '~/lib/date'
import { formatSpecies } from '~/lib/format'
import type { CollectionFilter } from '~/lib/router'
import type { State } from './store'
import type { EventType, Id, Plant, PlantEvent, VocabItem, VocabKind } from './types'

/** Below this many days the count is a fact; at or above it, it is a nudge. */
export const THIRSTY_AFTER_DAYS = 14

/** A rhythm needs three waterings to have two gaps to average. */
const MINIMUM_WATERINGS_FOR_RHYTHM = 3

function memo<T>(compute: (state: State) => T): (state: State) => T {
  const cache = new WeakMap<State, T>()
  return (state) => {
    let value = cache.get(state)
    if (value === undefined) {
      value = compute(state)
      cache.set(state, value)
    }
    return value
  }
}

// --- lookups ----------------------------------------------------------------

export const plantsByCode = memo(
  (state) => new Map(state.plants.map((plant) => [plant.code, plant])),
)

/** Every plant minus tombstones. A lookup by code still resolves a deleted
 *  plant — an old event should still be able to name it — but nothing that
 *  produces a list should ever show one. */
export const livePlants = memo((state) => state.plants.filter((plant) => !plant.deleted))

export const vocabById = memo((state) => new Map(state.vocab.map((item) => [item.id, item])))

export function findPlant(state: State, code: string): Plant | undefined {
  return plantsByCode(state).get(code)
}

/** The stored name, or an em dash. Archived entries still resolve — that is why
 *  they are archived rather than deleted. */
export function vocabName(state: State, id: Id | null): string {
  if (!id) return '—'
  return vocabById(state).get(id)?.name ?? '—'
}

/** The list you pick from: everything of a kind that is still in use. */
export function vocabOf(state: State, kind: VocabKind): VocabItem[] {
  return state.vocab
    .filter((item) => item.kind === kind && !item.archived)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function allVocabOf(state: State, kind: VocabKind): VocabItem[] {
  return state.vocab
    .filter((item) => item.kind === kind)
    .sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name))
}

// --- events -----------------------------------------------------------------

/** Newest first, tombstones dropped. */
export const eventsByPlant = memo((state) => {
  const grouped = new Map<string, PlantEvent[]>()

  for (const event of state.events) {
    if (event.deleted) continue
    const bucket = grouped.get(event.plantCode)
    if (bucket) bucket.push(event)
    else grouped.set(event.plantCode, [event])
  }

  for (const bucket of grouped.values()) {
    bucket.sort((a, b) => b.date.localeCompare(a.date))
  }

  return grouped
})

export function eventsFor(state: State, code: string): PlantEvent[] {
  return eventsByPlant(state).get(code) ?? []
}

export function lastEventOf(state: State, code: string, type: EventType): PlantEvent | null {
  return eventsFor(state, code).find((event) => event.type === type) ?? null
}

export function lastWaterAt(state: State, code: string): string | null {
  return lastEventOf(state, code, 'water')?.date ?? null
}

export function daysSinceWater(state: State, code: string): number | null {
  const last = lastWaterAt(state, code)
  return last === null ? null : daysSince(last)
}

export function isThirsty(days: number | null): boolean {
  return days !== null && days >= THIRSTY_AFTER_DAYS
}

export type Rhythm = { average: number; min: number; max: number }

/**
 * How often this plant actually got water, looking backwards only.
 *
 * There is deliberately no prediction here. Watering happens on fixed days, so
 * every measured gap lands on 7 or 14 and the app would "learn" a schedule that
 * is really just the calendar, handed back with a straight face.
 */
export function waterRhythm(state: State, code: string): Rhythm | null {
  const waterings = eventsFor(state, code).filter((event) => event.type === 'water')
  if (waterings.length < MINIMUM_WATERINGS_FOR_RHYTHM) return null

  const gaps: number[] = []
  for (let i = 0; i < waterings.length - 1; i += 1) {
    const newer = waterings[i]
    const older = waterings[i + 1]
    if (!newer || !older) continue
    gaps.push(Math.max(0, daysSince(older.date) - daysSince(newer.date)))
  }
  if (gaps.length === 0) return null

  const total = gaps.reduce((sum, gap) => sum + gap, 0)
  return {
    average: Math.round(total / gaps.length),
    min: Math.min(...gaps),
    max: Math.max(...gaps),
  }
}

export function countThisYear(state: State, code: string, type: EventType): number {
  const thisYear = new Date().getFullYear()
  return eventsFor(state, code).filter(
    (event) => event.type === type && yearOf(event.date) === thisYear,
  ).length
}

export function lastRepot(state: State, code: string) {
  const event = lastEventOf(state, code, 'repot')
  return event?.type === 'repot' ? event : null
}

// --- family -----------------------------------------------------------------

export const childrenByParent = memo((state) => {
  const grouped = new Map<string, Plant[]>()

  for (const plant of livePlants(state)) {
    const parentCode = plant.parent?.code
    if (!parentCode) continue
    const bucket = grouped.get(parentCode)
    if (bucket) bucket.push(plant)
    else grouped.set(parentCode, [plant])
  }

  return grouped
})

export function childrenOf(state: State, code: string): Plant[] {
  return childrenByParent(state).get(code) ?? []
}

// --- screens ----------------------------------------------------------------

/** What Today shows: plants you actually own and still care for, thirstiest at
 *  the top, and anything never logged above all of it. */
export function todayList(state: State): Plant[] {
  return livePlants(state)
    .filter((plant) => !plant.wish && plant.status === 'active')
    .sort((a, b) => {
      const left = daysSinceWater(state, a.code) ?? Number.POSITIVE_INFINITY
      const right = daysSinceWater(state, b.code) ?? Number.POSITIVE_INFINITY
      return right - left || a.name.localeCompare(b.name)
    })
}

export function collectionValue(state: State): number {
  return livePlants(state)
    .filter((plant) => !plant.wish)
    .reduce((total, plant) => total + (plant.origin.price ?? 0), 0)
}

export function ownedPlants(state: State): Plant[] {
  return livePlants(state).filter((plant) => !plant.wish)
}

export function wishlist(state: State): Plant[] {
  return livePlants(state)
    .filter((plant) => plant.wish)
    .sort((a, b) => (formatSpecies(a) || a.name).localeCompare(formatSpecies(b) || b.name))
}

export function countOf(state: State, filter: CollectionFilter): number {
  return filterCollection(state, filter, '').length
}

/**
 * The Collection screen.
 *
 * Wishes appear only under their own filter, and anything not `active` only
 * under `archive` — otherwise a plant you gave away two years ago keeps turning
 * up in a list of things to water.
 */
export function filterCollection(
  state: State,
  filter: CollectionFilter,
  query: string,
): Plant[] {
  const needle = query.trim().toLowerCase()

  return livePlants(state)
    .filter((plant) => {
      if (filter === 'wishlist') return plant.wish
      if (plant.wish) return false
      if (filter === 'archive') return plant.status !== 'active'
      if (plant.status !== 'active') return false
      if (filter === 'all') return true
      return plant.system === filter
    })
    .filter((plant) => {
      if (!needle) return true
      const place = vocabName(state, plant.locationId)
      return [plant.name, formatSpecies(plant), plant.code, place]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code))
}
