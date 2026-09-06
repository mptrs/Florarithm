/**
 * The one place the app's data lives while it is running.
 *
 * A module-level snapshot plus `useSyncExternalStore`. Everything is loaded at
 * boot and kept in memory — at fifty plants and a few thousand events that is a
 * couple of megabytes and a filter costs microseconds — while every write goes
 * to IndexedDB one record at a time.
 *
 * Nothing here hands back an undo closure. A logged entry is corrected or
 * removed from the row it is written on, which is visible for as long as the
 * record exists rather than for three seconds — and, unlike a hard delete
 * behind an undo bar, a tombstone merges correctly with another device.
 */

import { useSyncExternalStore } from 'react'
import { nowISO } from '~/lib/date'
import { newId } from '~/lib/id'
import { generatePlantCode } from '~/lib/plantCode'
import * as db from './db'
import { migrateEvents, migrateVocab, needsMigration } from './migrate'
import type {
  Id,
  Origin,
  Parent,
  Plant,
  PlantEvent,
  PlantStatus,
  System,
  VocabItem,
  VocabKind,
} from './types'

export type State = {
  status: 'loading' | 'ready' | 'error'
  plants: readonly Plant[]
  events: readonly PlantEvent[]
  vocab: readonly VocabItem[]
  lastBackupAt: string | null
}

const LAST_BACKUP_KEY = 'lastBackupAt'

let state: State = {
  status: 'loading',
  plants: [],
  events: [],
  vocab: [],
  lastBackupAt: null,
}

const listeners = new Set<() => void>()

function commit(patch: Partial<State>): void {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

/** Exported for `sync.ts`, which watches the store the same way a component
 *  does rather than `store.ts` knowing sync exists at all. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getState(): State {
  return state
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState, getState)
}

// --- boot -------------------------------------------------------------------

// Set synchronously, before the first await, so StrictMode's double-invoked
// effect can't start a second read: `sync.ts` counts every post-boot commit
// as a real change, and a second `load()` racing the first would otherwise
// land one extra "change" that nobody made.
let loadStarted = false

export async function load(): Promise<void> {
  if (loadStarted) return
  loadStarted = true

  try {
    const [snapshot, lastBackupAt] = await Promise.all([
      db.readAll(),
      db.readMeta<string>(LAST_BACKUP_KEY),
    ])

    const plants = snapshot.plants.map(migrateLegacySpecies)
    const migrated = plants.filter((plant, index) => plant !== snapshot.plants[index])
    if (migrated.length > 0) await Promise.all(migrated.map((plant) => db.putPlant(plant)))

    // Version 2 waterings and the fertilizer list, corrected on the way in and
    // written straight back so the next boot has nothing to do.
    const events = migrateEvents(snapshot.events)
    const vocab = migrateVocab(snapshot.vocab)
    if (needsMigration(snapshot.events, snapshot.vocab)) {
      const changed = events.filter((event, index) => event !== snapshot.events[index])
      const dropped = snapshot.vocab.filter((item) => !vocab.includes(item))
      await Promise.all([
        ...changed.map((event) => db.putEvent(event)),
        ...dropped.map((item) => db.deleteVocab(item.id)),
      ])
    }

    commit({ ...snapshot, plants, events, vocab, lastBackupAt: lastBackupAt ?? null, status: 'ready' })
  } catch {
    commit({ status: 'error' })
  }
}

/**
 * Plants written before the genus/species/cultivar split had one free-text
 * `species` field, e.g. `Monstera deliciosa 'Thai Constellation'`. Split it
 * once, on read, so the collection never needs a dedicated migration step —
 * the corrected record is written straight back to IndexedDB.
 */
function migrateLegacySpecies(plant: Plant): Plant {
  if (typeof (plant as unknown as Record<string, unknown>).genus === 'string') return plant

  const legacy = String((plant as unknown as { species?: unknown }).species ?? '')
  const cultivarMatch = legacy.match(/['"‘’“”]([^'"‘’“”]+)['"‘’“”]/)
  const cultivar = cultivarMatch?.[1]?.trim() ?? ''
  const withoutCultivar = (cultivarMatch ? legacy.slice(0, cultivarMatch.index) : legacy).trim()
  const [genus = '', species = ''] = withoutCultivar.split(/\s+/)

  return { ...plant, genus, species, cultivar }
}

// --- plants -----------------------------------------------------------------

export type PlantDraft = {
  /** Set when editing; absent means a code gets drawn on save. */
  code?: string
  name: string
  genus: string
  species: string
  cultivar: string
  locationId: Id | null
  system: System
  potSize: number | null
  mediumId: Id | null
  origin: Origin
  parent: Parent | null
  status: PlantStatus
  wish: boolean
  wishNote: string
}

export async function savePlant(draft: PlantDraft): Promise<Plant> {
  const existing = draft.code ? findPlant(draft.code) : undefined
  const timestamp = nowISO()

  const code =
    existing?.code ??
    (await generatePlantCode(
      draft.genus,
      draft.name,
      new Set(state.plants.map((plant) => plant.code)),
    ))

  const plant: Plant = {
    ...draft,
    code,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }

  await db.putPlant(plant)
  commit({
    plants: existing
      ? state.plants.map((current) => (current.code === code ? plant : current))
      : [...state.plants, plant],
  })

  return plant
}

/**
 * Removing a plant removes its history too, as far as anyone can see — but
 * both land as tombstones, not a row deletion. Once sync exists, a plant or
 * event that is simply gone from local storage looks to a merge exactly like
 * "never got here yet," and the other device hands it straight back. Not
 * undoable, so the screen asks first.
 */
export async function deletePlantForever(code: string): Promise<void> {
  const timestamp = nowISO()
  const events = await db.eventsForPlant(code)

  const tombstonedEvents = events
    .filter((event) => !event.deleted)
    .map((event) => ({ ...event, deleted: true }) as PlantEvent)
  await Promise.all(tombstonedEvents.map((event) => db.putEvent(event)))

  const plant = { ...findPlant(code), deleted: true, updatedAt: timestamp } as Plant
  await db.putPlant(plant)

  const tombstonedById = new Map(tombstonedEvents.map((event) => [event.id, event]))
  commit({
    plants: state.plants.map((current) => (current.code === code ? plant : current)),
    events: state.events.map((event) => tombstonedById.get(event.id) ?? event),
  })
}

async function patchPlant(code: string, patch: Partial<Plant>): Promise<Plant | null> {
  const existing = findPlant(code)
  if (!existing) return null

  const plant: Plant = { ...existing, ...patch, updatedAt: nowISO() }
  await db.putPlant(plant)
  commit({ plants: state.plants.map((current) => (current.code === code ? plant : current)) })

  return plant
}

function findPlant(code: string): Plant | undefined {
  return state.plants.find((plant) => plant.code === code)
}

// --- events -----------------------------------------------------------------

/** What a caller supplies: the type-specific fields, and optionally a date.
 *  Identity and timestamp are the store's business.
 *
 *  Distributed over the union on purpose — a plain `Omit` on a union keeps only
 *  the keys every member shares, which would silently drop `text`, `fertilized`
 *  and the rest. */
type DraftOf<T> = T extends unknown ? Omit<T, 'id' | 'date' | 'deleted'> & { date?: string } : never
export type EventDraft = DraftOf<PlantEvent>

export async function logEvent(draft: EventDraft): Promise<void> {
  const event = { ...draft, id: newId(), date: draft.date ?? nowISO() } as PlantEvent

  await db.putEvent(event)
  commit({ events: [...state.events, event] })

  // Repotting changes the plant itself, not just the log.
  if (event.type === 'repot') {
    const before = findPlant(event.plantCode)
    if (before) {
      await patchPlant(event.plantCode, {
        potSize: event.toSize ?? before.potSize,
        mediumId: event.mediumId ?? before.mediumId,
      })
    }
  }
}

/**
 * Change an entry that is already in the log.
 *
 * Editing is not undoable the way logging is — you are looking straight at the
 * thing you changed, and the form you changed it in is still on screen. The
 * record keeps its id and its place, so a merge sees one row, not two.
 */
export async function updateEvent(id: string, patch: Partial<PlantEvent>): Promise<void> {
  const event = state.events.find((candidate) => candidate.id === id)
  if (!event || event.deleted) return

  const next = { ...event, ...patch } as PlantEvent
  await db.putEvent(next)
  commit({ events: state.events.map((current) => (current.id === id ? next : current)) })
}

/** A deletion is a tombstone, never a removal: an append-only log that forgets
 *  a row will have it handed straight back by the next merge. */
export async function removeEvent(id: string): Promise<void> {
  const event = state.events.find((candidate) => candidate.id === id)
  if (!event || event.deleted) return

  const tombstone = { ...event, deleted: true } as PlantEvent
  await db.putEvent(tombstone)
  commit({ events: state.events.map((current) => (current.id === id ? tombstone : current)) })
}

/** One sentence describing what happened, without the plant's name. */
export function describeEvent(event: PlantEvent): string {
  switch (event.type) {
    case 'water':
      return 'Water'
    case 'repot':
      return 'Repot'
    case 'leaf':
      return 'New leaf'
    case 'bloom':
      return 'Blooming'
    case 'note':
      return 'Note'
  }
}

// --- growing lists ----------------------------------------------------------

/** Look a name up, or add it. This is what makes places, mediums and
 *  mediums lists you pick from instead of text you retype. */
export async function ensureVocabItem(kind: VocabKind, name: string): Promise<Id | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const existing = state.vocab.find(
    (item) => item.kind === kind && item.name.toLowerCase() === trimmed.toLowerCase(),
  )
  if (existing) return existing.id

  const timestamp = nowISO()
  const item: VocabItem = {
    id: newId(),
    kind,
    name: trimmed,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.putVocab(item)
  commit({ vocab: [...state.vocab, item] })

  return item.id
}

export async function renameVocabItem(id: Id, name: string): Promise<void> {
  await patchVocabItem(id, { name: name.trim() })
}

/** Archived, never deleted, so a plant or an event from years back keeps
 *  resolving to something readable. */
export async function setVocabArchived(id: Id, archived: boolean): Promise<void> {
  await patchVocabItem(id, { archived })
}

async function patchVocabItem(id: Id, patch: Partial<VocabItem>): Promise<void> {
  const existing = state.vocab.find((item) => item.id === id)
  if (!existing) return

  const item: VocabItem = { ...existing, ...patch, updatedAt: nowISO() }
  await db.putVocab(item)
  commit({ vocab: state.vocab.map((current) => (current.id === id ? item : current)) })
}

// --- backup -----------------------------------------------------------------

export async function replaceEverything(snapshot: db.Snapshot): Promise<void> {
  await db.replaceAll(snapshot)
  commit(snapshot)
}

export async function markBackedUp(): Promise<void> {
  const timestamp = nowISO()
  await db.writeMeta(LAST_BACKUP_KEY, timestamp)
  commit({ lastBackupAt: timestamp })
}
