/**
 * IndexedDB.
 *
 * Used as record storage, not as a query engine: fifty plants and a few
 * thousand events live in memory (see `store.ts`) and are filtered there in
 * microseconds. What this layer has to do well is write **one record at a
 * time** — logging a watering must not rewrite the whole collection — and
 * survive Safari deciding to hand back an error instead of a database.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Plant, PlantEvent, VocabItem, VocabKind } from './types'

const DATABASE_NAME = 'florarithm'
const DATABASE_VERSION = 1

interface FlorarithmDB extends DBSchema {
  plants: { key: string; value: Plant }
  events: { key: string; value: PlantEvent; indexes: { 'by-plant': string } }
  vocab: { key: string; value: VocabItem; indexes: { 'by-kind': VocabKind } }
  meta: { key: string; value: unknown }
}

let connection: Promise<IDBPDatabase<FlorarithmDB>> | null = null

function db(): Promise<IDBPDatabase<FlorarithmDB>> {
  connection ??= openDB<FlorarithmDB>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore('plants', { keyPath: 'code' })

        const events = database.createObjectStore('events', { keyPath: 'id' })
        events.createIndex('by-plant', 'plantCode')

        const vocab = database.createObjectStore('vocab', { keyPath: 'id' })
        vocab.createIndex('by-kind', 'kind')

        database.createObjectStore('meta')
      }
    },
  })

  return connection
}

/**
 * Ask Safari to keep this data. It evicts storage for sites left untouched for
 * seven days, and a granted persistence request turns that off. Best effort:
 * the answer is advisory and a refusal is not an error — from M2 the sync is
 * the real safety net.
 */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export type Snapshot = {
  plants: Plant[]
  events: PlantEvent[]
  vocab: VocabItem[]
}

/** Everything, once, at boot. */
export async function readAll(): Promise<Snapshot> {
  const database = await db()
  const [plants, events, vocab] = await Promise.all([
    database.getAll('plants'),
    database.getAll('events'),
    database.getAll('vocab'),
  ])
  return { plants, events, vocab }
}

export async function putPlant(plant: Plant): Promise<void> {
  await (await db()).put('plants', plant)
}

export async function putEvent(event: PlantEvent): Promise<void> {
  await (await db()).put('events', event)
}

export async function putVocab(item: VocabItem): Promise<void> {
  await (await db()).put('vocab', item)
}

/** Events belonging to a plant, including tombstones. Only used when deleting a
 *  plant outright; screens read from the in-memory store instead. */
export async function eventsForPlant(code: string): Promise<PlantEvent[]> {
  return (await db()).getAllFromIndex('events', 'by-plant', code)
}

export async function deleteEvents(ids: readonly string[]): Promise<void> {
  const database = await db()
  const transaction = database.transaction('events', 'readwrite')
  await Promise.all([...ids.map((id) => transaction.store.delete(id)), transaction.done])
}

/** Wipe and refill in one transaction per store, for importing a backup. Either
 *  the whole import lands or the old collection stays. */
export async function replaceAll(snapshot: Snapshot): Promise<void> {
  const database = await db()
  const transaction = database.transaction(['plants', 'events', 'vocab'], 'readwrite')

  await Promise.all([
    transaction.objectStore('plants').clear(),
    transaction.objectStore('events').clear(),
    transaction.objectStore('vocab').clear(),
  ])

  await Promise.all([
    ...snapshot.plants.map((plant) => transaction.objectStore('plants').put(plant)),
    ...snapshot.events.map((event) => transaction.objectStore('events').put(event)),
    ...snapshot.vocab.map((item) => transaction.objectStore('vocab').put(item)),
    transaction.done,
  ])
}

export async function readMeta<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('meta', key)) as T | undefined
}

export async function writeMeta(key: string, value: unknown): Promise<void> {
  await (await db()).put('meta', value, key)
}
