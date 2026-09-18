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

import { daysBetween, daysSince, yearOf } from '~/lib/date'
import { formatSpecies, normalizeCross, plural } from '~/lib/format'
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

// --- milestones -------------------------------------------------------------

/** One dated line in the chronicle: what happened, and where it is worth
 *  saying, the one figure that makes it mean something. */
export type Milestone = {
  /** ISO date. */
  date: string
  title: string
  detail: string | null
}

/**
 * The few dates that mattered, oldest first.
 *
 * Every line is a reading of the log, true whenever it is asked and stored
 * nowhere — so nothing here is ever unlocked, awarded, or marked as seen. A
 * plant that has had one thing happen to it gets no card at all: that rule
 * lives at the screen, next to the markup it decides.
 */
export function milestonesOf(
  state: State,
  code: string,
): Milestone[] {
  const plant = findPlant(state, code)
  // Newest first, which is why the earliest of a kind is the last match.
  const events = eventsFor(state, code)
  const earliest = (type: EventType) => events.filter((event) => event.type === type).at(-1) ?? null

  const arrival = plant?.origin.date ?? null
  const dated: Milestone[] = []

  if (arrival) {
    // The wait was written down once, when the wish became a plant. Nothing
    // else here knows a number the log did not record.
    const wait = events.find(
      (event) => event.type === 'note' && event.fromWishlist !== undefined,
    )
    const days = wait?.type === 'note' ? wait.fromWishlist : undefined

    dated.push({
      date: arrival,
      title: 'Arrived',
      detail: days === undefined ? null : `after ${plural(days, 'day')} on the wishlist`,
    })
  }

  const leaf = earliest('leaf')
  if (leaf) dated.push({ date: leaf.date, title: 'First new leaf', detail: null })

  // Leaves come slower than water — ten or so a year on a plant doing well —
  // so the round numbers start lower and sit closer together.
  const leaves = events.filter((event) => event.type === 'leaf').reverse()
  const leafMark = lastMark(leaves.length, ...LEAF_MARKS)
  const leafCrossed = leafMark ? leaves[leafMark - 1] : undefined
  if (leafMark && leafCrossed) {
    dated.push({ date: leafCrossed.date, title: `The ${leafMark}th new leaf`, detail: null })
  }

  const bloom = earliest('bloom')
  if (bloom) {
    // The one detail line worth the room. A first leaf arrives weeks after a
    // plant does and surprises nobody; a first bloom is the fact you would
    // have to work out by hand, so it is the fact that gets counted for you.
    const waited = arrival ? daysBetween(arrival, bloom.date) : 0
    dated.push({
      date: bloom.date,
      title: 'First bloom',
      detail: waited > 0 ? `${plural(waited, 'day')} after it arrived` : null,
    })
  }

  const years = arrival ? anniversary(arrival) : null
  if (years) {
    const word = years.count === 1 ? 'year' : 'years'
    dated.push({ date: years.date, title: `${inWords(years.count)} ${word} here`, detail: null })
  }

  // A running total is not a moment, but the day it crossed a round number
  // is. The latest one only, for the same reason there is one anniversary.
  const waterings = events.filter((event) => event.type === 'water').reverse()
  const round = lastMark(waterings.length, ...WATER_MARKS)
  const crossed = round ? waterings[round - 1] : undefined
  if (round && crossed) {
    dated.push({ date: crossed.date, title: `Watered for the ${round}th time`, detail: null })
  }

  const pot = latestPot(events)
  if (pot) dated.push(pot)

  return dated.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * The last round number a running count has passed: one of `marks`, then
 * every `every` past the last of them. `lastMark(214, [50, 100], 100)` is 200.
 *
 * One rule for every count the app marks, so a leaf, a watering and a plant
 * all become worth a line the same way. The marks start low and spread out:
 * the first few come while a count is still news, the rest rarely enough to
 * stay worth one.
 */
export function lastMark(count: number, marks: readonly number[], every: number): number | null {
  const top = marks.at(-1)
  if (top === undefined) return null
  if (count >= top) return top + Math.floor((count - top) / every) * every
  for (let index = marks.length - 1; index >= 0; index -= 1) {
    const mark = marks[index] as number
    if (count >= mark) return mark
  }
  return null
}

/** Leaves come ten or so a year on a plant doing well; water every week. */
const LEAF_MARKS = [[10, 25, 50], 50] as const
const WATER_MARKS = [[50, 100], 100] as const

/** The most recent whole year that has passed since a date, and the day it
 *  passed on. One line, never one per year — eight rows saying the same thing
 *  in a louder voice is not a chronicle. */
function anniversary(arrival: string): { date: string; count: number } | null {
  const from = new Date(arrival)
  const now = new Date()
  let count = now.getFullYear() - from.getFullYear()

  const mark = new Date(from)
  mark.setFullYear(from.getFullYear() + count)
  if (mark.getTime() > now.getTime()) {
    count -= 1
    mark.setFullYear(from.getFullYear() + count)
  }

  return count < 1 ? null : { date: mark.toISOString(), count }
}

/**
 * `Into its third pot`, on the day of the latest repot, with the sizes it
 * climbed through as the detail: `12 → 15 → 19 cm`.
 *
 * From the second repot on. A first one is exactly what Care's Last repot row
 * already says, date and sizes both, and the same fact twice on one screen is
 * not a milestone.
 */
function latestPot(events: readonly PlantEvent[]): Milestone | null {
  const repots = events.filter((event) => event.type === 'repot').reverse()
  const last = repots.at(-1)
  if (repots.length < 2 || !last) return null

  const sizes: number[] = []

  for (const repot of repots) {
    if (repot.type !== 'repot') continue
    for (const size of [repot.fromSize, repot.toSize]) {
      if (size === null) continue
      if (sizes.at(-1) === size) continue
      sizes.push(size)
    }
  }

  return {
    date: last.date,
    title: `Into its ${ORDINALS[repots.length] ?? `${repots.length + 1}th`} pot`,
    detail: sizes.length < 2 ? null : `${sizes.join(' → ')} cm`,
  }
}

/** Small numbers as words, so the one prose line in the card reads as prose
 *  and not as a second figure beside the date. */
const WORDS = [
  'One', 'Two', 'Three', 'Four', 'Five', 'Six',
  'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
]

function inWords(count: number): string {
  return WORDS[count - 1] ?? String(count)
}

/** Indexed by repots so far, so the pot after the second repot is `third`. */
const ORDINALS = [
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth',
  'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth',
]

// --- the collection's milestones --------------------------------------------

/** When a plant entered the collection: the day it arrived where that was
 *  written down, else the day its record was made. */
function arrivalOf(plant: Plant): string {
  return plant.origin.date ?? plant.createdAt
}

/** Grown here: a cutting, a corm, a division or a seed of a plant of your own. */
export function isGrownHere(plant: Plant): boolean {
  return plant.parent !== null || plant.origin.type === 'own-cutting'
}

const genusKey = (plant: Plant) => plant.genus.trim().toLowerCase()

/** `1,000`: a figure in a title, with the thousands marked. */
const figure = (count: number) => count.toLocaleString('en-GB')

/** `1st`, `2nd`, `12th`, `23rd`. */
function ordinal(count: number): string {
  const tens = count % 100
  const suffix =
    tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[count % 10] ?? 'th'
  return `${figure(count)}${suffix}`
}

/** The collection as it stands: what the counts in Collection's header say. */
export function collectionCounts(state: State): { plants: number; grown: number; genera: number } {
  const plants = filterCollection(state, 'all', '')
  return {
    plants: plants.length,
    grown: plants.filter(isGrownHere).length,
    genera: new Set(plants.map(genusKey).filter(Boolean)).size,
  }
}

/**
 * The collection's own chronicle, oldest first: the latest of each kind of
 * moment the whole collection can have.
 *
 * Every plant that ever came in counts here — one that died or was given away
 * did arrive, and a record that forgets it would be flattering, not true.
 * Deleted records and wishes do not: one was a mistake, the other never came.
 */
export function collectionMilestones(state: State): Milestone[] {
  const everOwned = livePlants(state)
    .filter((plant) => !plant.wish)
    .sort((a, b) => arrivalOf(a).localeCompare(arrivalOf(b)))
  const byCode = new Map(everOwned.map((plant) => [plant.code, plant]))
  const events = everOwned
    .flatMap((plant) => eventsFor(state, plant.code))
    .sort((a, b) => a.date.localeCompare(b.date))
  const nameOf = (code: string) => byCode.get(code)?.name ?? code
  const dated: Milestone[] = []

  // A round number of plants.
  const plants = lastMark(everOwned.length, [10, 25, 50], 50)
  const nth = plants ? everOwned[plants - 1] : undefined
  if (plants && nth) {
    dated.push({ date: arrivalOf(nth), title: `The ${ordinal(plants)} plant`, detail: nth.parent ? `${nth.name}, a cutting` : nth.name })
  }

  // Grown here: the first, then round numbers.
  const grown = everOwned.filter(isGrownHere)
  const grownMark = lastMark(grown.length, [1, 5, 10, 25], 25)
  const grownNth = grownMark ? grown[grownMark - 1] : undefined
  if (grownMark && grownNth) {
    const parent = grownNth.parent ? byCode.get(grownNth.parent.code) : undefined
    dated.push({
      date: arrivalOf(grownNth),
      title: grownMark === 1 ? 'First plant grown here' : `The ${ordinal(grownMark)} plant grown here`,
      detail: parent ? `${grownNth.name}, a cutting of ${parent.name}` : grownNth.name,
    })
  }

  // The deepest line, on the day its newest generation arrived. Families are
  // read through `ancestorsOf`, which stops at a loop or a missing parent.
  const lines = everOwned.map((plant) => ({ plant, ancestors: ancestorsOf(state, plant.code) }))
  const deepest = Math.max(0, ...lines.map((line) => line.ancestors.length + 1))
  const deep = lines.find((line) => line.ancestors.length + 1 === deepest)
  // From a third generation on: a second is the first plant grown here,
  // which already has its line, on the same day.
  if (deepest >= 3 && deep) {
    const root = deep.ancestors[0] ?? deep.plant
    dated.push({
      date: arrivalOf(deep.plant),
      title: `A ${ORDINALS[deepest - 1] ?? ordinal(deepest)} generation`,
      detail: `${deep.plant.name}, from a line started in ${yearOf(arrivalOf(root))}`,
    })
  }

  // The largest family, on the day it reached its last round size.
  const families = new Map<string, Plant[]>()
  for (const { plant, ancestors } of lines) {
    const root = (ancestors[0] ?? plant).code
    families.set(root, [...(families.get(root) ?? []), plant])
  }
  const largest = [...families.entries()].sort((a, b) => b[1].length - a[1].length)[0]
  const familyMark = largest ? lastMark(largest[1].length, [5, 10, 25], 25) : null
  const familyNth = largest && familyMark ? largest[1][familyMark - 1] : undefined
  if (largest && familyMark && familyNth) {
    dated.push({
      date: arrivalOf(familyNth),
      title: `${nameOf(largest[0])}\u2019s line reaches ${familyMark} plants`,
      detail: 'the largest family here',
    })
  }

  // The largest genus, on the day it took the lead and kept it.
  const counts = new Map<string, number>()
  const genera: Plant[] = []
  let leader = null as { key: string; count: number; plant: Plant } | null
  for (const plant of everOwned) {
    const key = genusKey(plant)
    if (!key) continue
    if (!counts.has(key)) genera.push(plant)
    const count = (counts.get(key) ?? 0) + 1
    counts.set(key, count)
    if (leader?.key === key) continue
    if (!leader || count > (counts.get(leader.key) ?? 0)) leader = { key, count, plant }
  }
  if (leader && genera.length >= 2 && (counts.get(leader.key) ?? 0) >= 3) {
    dated.push({
      date: arrivalOf(leader.plant),
      title: `${leader.plant.genus.trim()}, the largest genus`,
      detail: `with its ${ordinal(leader.count)} plant, ${leader.plant.name}`,
    })
  }

  // A round number of genera: every fifth.
  const generaMark = lastMark(genera.length, [5], 5)
  const newGenus = generaMark ? genera[generaMark - 1] : undefined
  if (generaMark && newGenus) {
    dated.push({
      date: arrivalOf(newGenus),
      title: `The ${ordinal(generaMark)} genus`,
      detail: `the first ${newGenus.genus.trim()}, ${newGenus.name}`,
    })
  }

  // Plants that have bloomed here, by the day each first did.
  const firstBlooms = new Map<string, string>()
  for (const event of events) {
    if (event.type === 'bloom' && !firstBlooms.has(event.plantCode)) firstBlooms.set(event.plantCode, event.date)
  }
  const bloomers = [...firstBlooms.entries()]
  const bloomMark = lastMark(bloomers.length, [1, 5, 10, 25], 25)
  const bloomNth = bloomMark ? bloomers[bloomMark - 1] : undefined
  if (bloomMark && bloomNth) {
    const [code, date] = bloomNth
    dated.push(
      bloomMark === 1
        ? { date, title: 'First bloom in the collection', detail: nameOf(code) }
        : { date, title: `${bloomMark} plants have bloomed here`, detail: `the ${ordinal(bloomMark)} was ${nameOf(code)}` },
    )
  }

  // Round numbers of leaves, waterings and photographs across everything.
  const tallies: [PlantEvent[], readonly number[], number, (mark: number, name: string) => [string, string]][] = [
    [events.filter((event) => event.type === 'leaf'), [100, 250, 500], 500, (mark, name) => [`The ${ordinal(mark)} new leaf`, `on ${name}`]],
    [events.filter((event) => event.type === 'water'), [500, 1000], 1000, (mark, name) => [`The ${ordinal(mark)} watering`, `on ${name}`]],
    [events.filter((event) => event.photo), [50, 100], 100, (mark, name) => [`The ${ordinal(mark)} photograph`, `of ${name}`]],
  ]
  for (const [list, marks, every, words] of tallies) {
    const mark = lastMark(list.length, marks, every)
    const crossed = mark ? list[mark - 1] : undefined
    if (mark && crossed) {
      const [title, detail] = words(mark, nameOf(crossed.plantCode))
      dated.push({ date: crossed.date, title, detail })
    }
  }

  // The longest wait a wish ever ended, on the day it did.
  let longest: PlantEvent | null = null
  for (const event of events) {
    if (event.type !== 'note' || event.fromWishlist === undefined) continue
    if (longest?.type !== 'note' || event.fromWishlist > (longest.fromWishlist ?? 0)) longest = event
  }
  if (longest?.type === 'note' && longest.fromWishlist !== undefined) {
    dated.push({
      date: longest.date,
      title: `${plural(longest.fromWishlist, 'day')} on the wishlist`,
      detail: `${nameOf(longest.plantCode)}, the longest wait yet`,
    })
  }

  return dated.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Each year the log has something in, newest first: what it added up to.
 *
 * Losses are not here, and not by choice. A plant's status changes without a
 * date — the log records the plant dying no more than it records it being
 * given away — so a year cannot be told what it lost without guessing.
 */
export function yearsInReview(
  state: State,
): { year: number; leaves: number; blooms: number; added: number; grown: number }[] {
  const years = new Map<number, { leaves: number; blooms: number; added: number; grown: number }>()
  const at = (year: number) => {
    const found = years.get(year)
    if (found) return found
    const fresh = { leaves: 0, blooms: 0, added: 0, grown: 0 }
    years.set(year, fresh)
    return fresh
  }
  const everOwned = livePlants(state).filter((plant) => !plant.wish)
  for (const plant of everOwned) {
    const year = at(yearOf(arrivalOf(plant)))
    year.added += 1
    if (isGrownHere(plant)) year.grown += 1
    for (const event of eventsFor(state, plant.code)) {
      if (event.type === 'leaf') at(yearOf(event.date)).leaves += 1
      if (event.type === 'bloom') at(yearOf(event.date)).blooms += 1
    }
  }
  return [...years.entries()].sort((a, b) => b[0] - a[0]).map(([year, figures]) => ({ year, ...figures }))
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

export function descendantsOf(state: State, code: string, above: Iterable<string> = []): Descendant[] {
  // `above` is the line already drawn over this plant. Only a broken record
  // puts a plant in both places — two plants naming each other as parent — and
  // then the honest answer is the one nearer the top, drawn once.
  const seen = new Set<string>([code, ...above])

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
  // Seeded with the plant itself, then taken back out at the end: it is what
  // stops a record that names itself — or a pair that name each other — from
  // coming back as its own descendant, which is the one answer that is never
  // true however broken the record is.
  const codes = new Set<string>([code])
  const queue = [code]

  while (queue.length > 0) {
    for (const child of childrenOf(state, queue.pop() as string)) {
      if (codes.has(child.code)) continue
      codes.add(child.code)
      queue.push(child.code)
    }
  }

  codes.delete(code)
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
  const descendants = descendantsOf(
    state,
    code,
    ancestors.map((plant) => plant.code),
  )

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
  // Both sides through the same `x` → `×` swap, so a hybrid can be searched
  // for with the character actually on the keyboard.
  return normalizeCross([plant.name, formatSpecies(plant), plant.code, place].join(' '))
    .toLowerCase()
    .includes(normalizeCross(needle))
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
