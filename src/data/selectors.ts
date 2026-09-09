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

/** Every entry with a picture, newest first — the timeline, which is just the
 *  history with the wordless entries left out. */
export function photoEventsFor(state: State, code: string): PlantEvent[] {
  return eventsFor(state, code).filter((event) => event.photo)
}

/**
 * The plant's picture: the one that was chosen, or the most recent.
 *
 * The fallback is the rule and the choice is the exception — a plant that has
 * never been thought about shows its newest photograph, which is what you want
 * without ever saying so. `photoEventId` only overrides it, and only while the
 * entry it names still exists: delete that entry and the newest picture takes
 * over again, with nothing left pointing at a hole.
 */
export function currentPhotoEvent(state: State, code: string): PlantEvent | null {
  const photos = photoEventsFor(state, code)
  const chosen = findPlant(state, code)?.photoEventId
  return (chosen ? photos.find((event) => event.id === chosen) : undefined) ?? photos[0] ?? null
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

/** The last watering that had fertilizer in it. Fertilizing is not its own
 *  event: it is a property of a watering, because that is when it happens. */
export function lastFertilisedAt(state: State, code: string): string | null {
  const event = eventsFor(state, code).find(
    (candidate) => candidate.type === 'water' && candidate.fertilized,
  )
  return event?.date ?? null
}

export function isThirsty(days: number | null): boolean {
  return days !== null && days >= THIRSTY_AFTER_DAYS
}

export function countThisYear(state: State, code: string, type: EventType): number {
  const thisYear = new Date().getFullYear()
  return eventsFor(state, code).filter(
    (event) => event.type === type && yearOf(event.date) === thisYear,
  ).length
}

/**
 * The log, cut into calendar months, newest first.
 *
 * Ninety entries today and a few thousand in ten years: a flat list stops being
 * navigable long before it stops being correct, and the month is the unit
 * people actually remember things in.
 */
export function eventsByMonth(events: readonly PlantEvent[]): [string, PlantEvent[]][] {
  const groups = new Map<string, PlantEvent[]>()
  for (const event of events) {
    const date = new Date(event.date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const bucket = groups.get(key)
    if (bucket) bucket.push(event)
    else groups.set(key, [event])
  }
  return [...groups.entries()]
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

/** Oldest first: a branch reads in the order the cuttings were taken. */
export function childrenOf(state: State, code: string): Plant[] {
  return [...(childrenByParent(state).get(code) ?? [])].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name),
  )
}

/**
 * The line above a plant, oldest first.
 *
 * Walks `parent.code` up until it runs out. The `seen` set is not paranoia:
 * nothing in the record stops A naming B as its parent while B names A, and a
 * loop here would hang the page rather than draw a wrong tree.
 *
 * A tombstoned ancestor ends the walk — the line is only as long as the plants
 * that are still on the shelf. Dead and given-away ones stay: they are still
 * where the cutting came from, and the rail marks them as what they are.
 */
export function ancestorsOf(state: State, code: string): Plant[] {
  const line: Plant[] = []
  const seen = new Set<string>([code])

  let current = findPlant(state, code)
  while (current?.parent) {
    const parent = findPlant(state, current.parent.code)
    if (!parent || parent.deleted || seen.has(parent.code)) break
    line.unshift(parent)
    seen.add(parent.code)
    current = parent
  }

  return line
}

/** One plant and everything propagated off it, as deep as it goes. */
export type Descendant = { plant: Plant; children: Descendant[] }

export function descendantsOf(state: State, code: string): Descendant[] {
  const seen = new Set<string>([code])

  const walk = (parentCode: string): Descendant[] => {
    const branch: Descendant[] = []
    for (const plant of childrenOf(state, parentCode)) {
      if (seen.has(plant.code)) continue
      seen.add(plant.code)
      branch.push({ plant, children: walk(plant.code) })
    }
    return branch
  }

  return walk(code)
}

/** Every code below this one, flat. What a plant may not be propagated from:
 *  pick your own cutting as your parent and the line eats itself. */
export function descendantCodes(state: State, code: string): Set<string> {
  const codes = new Set<string>()
  const queue = [code]

  while (queue.length > 0) {
    for (const child of childrenOf(state, queue.pop() as string)) {
      if (codes.has(child.code)) continue
      codes.add(child.code)
      queue.push(child.code)
    }
  }

  return codes
}

/**
 * Everything the Family rail draws: the line up, the tree down, and the two
 * counts its heading is set from.
 *
 * `generations` counts the whole line the plant belongs to, not its distance
 * from the top — a cutting of a cutting with two cuttings of its own reads
 * "four generations" whichever of the four you happen to have open.
 */
export function lineageOf(state: State, code: string) {
  const ancestors = ancestorsOf(state, code)
  const descendants = descendantsOf(state, code)

  const depth = (branch: Descendant[]): number =>
    branch.reduce((deepest, node) => Math.max(deepest, 1 + depth(node.children)), 0)
  const count = (branch: Descendant[]): number =>
    branch.reduce((total, node) => total + 1 + count(node.children), 0)

  return {
    ancestors,
    descendants,
    plants: ancestors.length + 1 + count(descendants),
    generations: ancestors.length + 1 + depth(descendants),
  }
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
      if (filter === 'archive') return isArchived(plant)
      if (isArchived(plant)) return false
      if (filter === 'all') return true
      return plant.system === filter
    })
    .filter((plant) => matchesQuery(state, plant, needle))
    .sort(byName)
}

function byName(a: Plant, b: Plant): number {
  return a.name.localeCompare(b.name) || a.code.localeCompare(b.code)
}

/** Name, species, code and place — the four things you might have in mind
 *  when you are looking for a plant you already own. */
function matchesQuery(state: State, plant: Plant, needle: string): boolean {
  if (!needle) return true
  const place = vocabName(state, plant.locationId)
  return [plant.name, formatSpecies(plant), plant.code, place]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

// --- the archive ------------------------------------------------------------

/**
 * Whether a plant belongs in the drawer rather than on the shelf.
 *
 * Gone, not resting. A dormant plant is still yours and still in the room —
 * it simply is not on a rhythm this month — so it stays in the collection,
 * marked as asleep, and only death and a new owner close the drawer on a
 * plant. `status !== 'active'` used to stand here, which filed a Caladium
 * sleeping through the winter next to one that died.
 */
export function isArchived(plant: Plant): boolean {
  return plant.status === 'died' || plant.status === 'given-away'
}

/**
 * The word that opens the drawer.
 *
 * The archive is not a filter chip: a plant you gave away in June should not
 * cost you a tab stop every day for the rest of the year. You type your way in
 * instead — and a prefix counts, so the drawer opens while you are still
 * spelling it.
 */
const ARCHIVE_WORDS = ['archive', 'archived', 'archief']
const SHORTEST_ARCHIVE_PREFIX = 4

export function isArchiveQuery(query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle.length < SHORTEST_ARCHIVE_PREFIX) return false
  return ARCHIVE_WORDS.some((word) => word.startsWith(needle))
}

/**
 * What the archive drawer holds for this query.
 *
 * Two ways in, deliberately: the word opens all of it, and any other search
 * reaches in too — so the Monstera you gave away is findable by its name
 * without knowing there is a word.
 */
export function archivedMatching(state: State, query: string): Plant[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  const archived = livePlants(state).filter(
    (plant) => !plant.wish && !plant.deleted && isArchived(plant),
  )

  return archived
    .filter((plant) => isArchiveQuery(needle) || matchesQuery(state, plant, needle))
    .sort(byName)
}

/**
 * The list cut into places, and the places in alphabetical order.
 *
 * Anything without a place goes last rather than under an empty heading: it is
 * a plant you have not told the app where to find, not a room called nothing.
 */
export const UNPLACED = 'No place'

export function groupByPlace(state: State, plants: readonly Plant[]): [string, Plant[]][] {
  const groups = new Map<string, Plant[]>()

  for (const plant of plants) {
    const place = vocabName(state, plant.locationId)
    const key = place && place !== '—' ? place : UNPLACED
    const bucket = groups.get(key)
    if (bucket) bucket.push(plant)
    else groups.set(key, [plant])
  }

  return [...groups.entries()].sort(([a], [b]) => {
    if (a === UNPLACED) return 1
    if (b === UNPLACED) return -1
    return a.localeCompare(b)
  })
}
