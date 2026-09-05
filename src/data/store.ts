/**
 * The one place the app's data lives while it is running.
 *
 * A module-level snapshot plus `useSyncExternalStore`. Everything is loaded at
 * boot and kept in memory — at fifty plants and a few thousand events that is a
 * couple of megabytes and a filter costs microseconds — while every write goes
 * to IndexedDB one record at a time.
 *
 * Every mutation that a person could regret returns an `UndoAction`. That is not
 * a nicety: logging is one tap with no confirmation, so there has to be a way
 * back.
 */

import { useSyncExternalStore } from 'react'
import { nowISO } from '~/lib/date'
import { newId } from '~/lib/id'
import { generatePlantCode } from '~/lib/plantCode'
import * as db from './db'
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

export type UndoAction = {
  /** Past tense, and it names the plant: you may be two rooms away by the time
   *  you read it. */
  message: string
  undo: () => Promise<void>
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

function subscribe(listener: () => void): () => void {
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

export async function load(): Promise<void> {
  try {
    const [snapshot, lastBackupAt] = await Promise.all([
      db.readAll(),
      db.readMeta<string>(LAST_BACKUP_KEY),
    ])

    const plants = snapshot.plants.map(migrateLegacySpecies)
    const migrated = plants.filter((plant, index) => plant !== snapshot.plants[index])
    if (migrated.length > 0) await Promise.all(migrated.map((plant) => db.putPlant(plant)))

    commit({ ...snapshot, plants, lastBackupAt: lastBackupAt ?? null, status: 'ready' })
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
    tagWritten: existing?.tagWritten ?? false,
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

export async function setTagWritten(code: string, tagWritten: boolean): Promise<UndoAction | null> {
  const before = findPlant(code)
  if (!before || before.tagWritten === tagWritten) return null

  const plant = await patchPlant(code, { tagWritten })
  if (!plant) return null

  return {
    message: tagWritten
      ? `Marked ${plant.name}'s tag as written`
      : `Marked ${plant.name}'s tag as not written`,
    undo: async () => {
      await patchPlant(code, { tagWritten: before.tagWritten })
    },
  }
}

/** Removing a plant removes its history too — there is nothing left for those
 *  events to belong to. Not undoable, so the screen asks first. */
export async function deletePlantForever(code: string): Promise<void> {
  const events = await db.eventsForPlant(code)
  await db.deleteEvents(events.map((event) => event.id))
  await db.deletePlant(code)

  commit({
    plants: state.plants.filter((plant) => plant.code !== code),
    events: state.events.filter((event) => event.plantCode !== code),
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
 *  the keys every member shares, which would silently drop `text`, `flushed`
 *  and the rest. */
type DraftOf<T> = T extends unknown ? Omit<T, 'id' | 'date' | 'deleted'> & { date?: string } : never
export type EventDraft = DraftOf<PlantEvent>

export async function logEvent(draft: EventDraft): Promise<UndoAction> {
  const event = { ...draft, id: newId(), date: draft.date ?? nowISO() } as PlantEvent

  await db.putEvent(event)
  commit({ events: [...state.events, event] })

  // Repotting changes the plant itself, not just the log. Remember what it was
  // so undo puts the pot and the medium back too.
  let restorePlant: (() => Promise<void>) | null = null
  if (event.type === 'repot') {
    const before = findPlant(event.plantCode)
    if (before) {
      const { potSize, mediumId } = before
      await patchPlant(event.plantCode, {
        potSize: event.toSize ?? potSize,
        mediumId: event.mediumId ?? mediumId,
      })
      restorePlant = async () => {
        await patchPlant(event.plantCode, { potSize, mediumId })
      }
    }
  }

  return {
    message: undoMessage(event),
    undo: async () => {
      await hardRemoveEvent(event.id)
      await restorePlant?.()
    },
  }
}

/** A deletion is a tombstone, never a removal: an append-only log that forgets
 *  a row will have it handed straight back by the next merge. */
export async function removeEvent(id: string): Promise<UndoAction | null> {
  const event = state.events.find((candidate) => candidate.id === id)
  if (!event || event.deleted) return null

  const tombstone = { ...event, deleted: true } as PlantEvent
  await db.putEvent(tombstone)
  commit({ events: state.events.map((current) => (current.id === id ? tombstone : current)) })

  return {
    message: `Deleted ${describeEvent(event).toLowerCase()}`,
    undo: async () => {
      const restored = { ...event, deleted: false } as PlantEvent
      await db.putEvent(restored)
      commit({ events: state.events.map((current) => (current.id === id ? restored : current)) })
    },
  }
}

/** Undoing a log the moment it happened takes the row out for good — there is
 *  nothing to reconcile yet, and a tombstone for a mistap is just litter. */
async function hardRemoveEvent(id: string): Promise<void> {
  await db.deleteEvents([id])
  commit({ events: state.events.filter((event) => event.id !== id) })
}

function undoMessage(event: PlantEvent): string {
  const plant = findPlant(event.plantCode)
  const name = plant?.name || event.plantCode
  return event.type === 'water' ? `Watered ${name}` : `${describeEvent(event)} · ${name}`
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
 *  fertilizers lists you pick from instead of text you retype. */
export async function ensureVocabItem(kind: VocabKind, name: string): Promise<Id | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const existing = state.vocab.find(
    (item) => item.kind === kind && item.name.toLowerCase() === trimmed.toLowerCase(),
  )
  if (existing) return existing.id

  const item: VocabItem = {
    id: newId(),
    kind,
    name: trimmed,
    archived: false,
    createdAt: nowISO(),
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

  const item: VocabItem = { ...existing, ...patch }
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
