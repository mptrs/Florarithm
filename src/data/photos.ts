/**
 * Photographs.
 *
 * A photograph belongs to an event — the new leaf you photographed, the note
 * with a picture in it, the plant as it looked the day it was repotted — so the
 * log already carries the dates, the ordering, the tombstones and the merge.
 * Nothing here is a second timeline; the timeline is the history that was
 * already there, with pictures in it.
 *
 * Deliberately not part of `store.ts`, for two reasons that both matter. That
 * store is read whole at boot, and a collection's worth of photographs is tens
 * of megabytes rather than the couple it is sized for. And every commit to it
 * counts, in `sync.ts`, as a change waiting to be pushed — which is true of the
 * event that gained a photo, but not of the bytes, which travel their own way.
 *
 * So: a small store of its own, read on demand and cached by event id.
 */

import { useEffect, useState } from 'react'
import { resizeForStorage } from '~/lib/image'
import * as db from './db'
import type { StoredPhoto } from './types'

/** event id → an object URL, or `null` for "looked, there is none". An id that
 *  is absent entirely has not been read off disk yet. */
const cache = new Map<string, string | null>()
const listeners = new Set<() => void>()
const inFlight = new Map<string, Promise<void>>()

function announce(): void {
  for (const listener of listeners) listener()
}

/**
 * Object URLs are revoked when they are replaced or dropped, and otherwise held
 * for the life of the tab. Refcounting them against mounted components would
 * buy back a few kilobytes per entry you happened to scroll past, at the price
 * of a photograph that blinks out from under a screen still using it.
 */
function put(eventId: string, url: string | null): void {
  const previous = cache.get(eventId)
  if (previous) URL.revokeObjectURL(previous)
  cache.set(eventId, url)
  announce()
}

/** See `StoredPhoto.bytes` for why a stored photograph is not already a blob. */
function toBlob(photo: StoredPhoto): Blob {
  return new Blob([photo.bytes], { type: photo.type })
}

function read(eventId: string): Promise<void> {
  if (cache.has(eventId)) return Promise.resolve()

  // Two rows showing the same entry must not both hit IndexedDB and both mint
  // an object URL — the second would leak the first.
  const existing = inFlight.get(eventId)
  if (existing) return existing

  const pending = (async () => {
    try {
      const photo = await db.readPhoto(eventId)
      // A write may have landed while this read was out; it wins.
      if (!cache.has(eventId)) {
        cache.set(eventId, photo ? URL.createObjectURL(toBlob(photo)) : null)
        announce()
      }
    } catch {
      if (!cache.has(eventId)) {
        cache.set(eventId, null)
        announce()
      }
    } finally {
      inFlight.delete(eventId)
    }
  })()

  inFlight.set(eventId, pending)
  return pending
}

/**
 * One entry's photograph as an object URL, or `null`.
 *
 * `null` covers three things on purpose — no photograph, not read off disk yet,
 * and synced from the other device but not downloaded here — because the caller
 * does the same thing in all three cases: shows what it shows without a picture.
 * `null` from an id whose event says it has a photo simply means "not yet."
 */
export function usePhoto(eventId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() => (eventId ? (cache.get(eventId) ?? null) : null))

  useEffect(() => {
    if (!eventId) {
      setUrl(null)
      return
    }

    const sync = () => setUrl(cache.get(eventId) ?? null)
    listeners.add(sync)
    sync()
    void read(eventId)
    return () => {
      listeners.delete(sync)
    }
  }, [eventId])

  return url
}

/**
 * A photograph that has been shrunk but does not belong to anything yet.
 *
 * Preparing and storing are two steps because the event has to be written with
 * its `photo` field already set — the log is what says a picture exists — and
 * that needs the dimensions before there is an id to file the bytes under.
 */
export type PreparedPhoto = {
  bytes: ArrayBuffer
  type: string
  width: number
  height: number
  /** For showing the picked photo before it has been logged. Owned by the
   *  caller, which revokes it when the sheet closes. */
  previewUrl: string
}

/** Throws `ImageDecodeError` for a file the browser cannot read. */
export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
  const { blob, width, height } = await resizeForStorage(file)
  return {
    bytes: await blob.arrayBuffer(),
    type: blob.type,
    width,
    height,
    previewUrl: URL.createObjectURL(blob),
  }
}

/** File a prepared photograph under the event that now exists for it. */
export async function storePhoto(eventId: string, prepared: PreparedPhoto): Promise<void> {
  await db.putPhoto({
    eventId,
    bytes: prepared.bytes,
    type: prepared.type,
    width: prepared.width,
    height: prepared.height,
    synced: 0,
  })
  put(eventId, URL.createObjectURL(new Blob([prepared.bytes], { type: prepared.type })))
}

/**
 * Move a photograph's bytes to a different entry.
 *
 * Photographs are filed under the id of the event that claims them, so an entry
 * that inherits a picture has to inherit the bytes too — leaving them under the
 * id that was thrown away gives you a row promising a picture that will never
 * load, which is the one thing the storing order everywhere else is careful to
 * avoid.
 */
export async function refilePhoto(fromEventId: string, toEventId: string): Promise<boolean> {
  const stored = await db.readPhoto(fromEventId)
  if (!stored) return false

  await db.putPhoto({ ...stored, eventId: toEventId })
  await db.deletePhotos([fromEventId])
  put(fromEventId, null)
  put(toEventId, URL.createObjectURL(toBlob({ ...stored, eventId: toEventId })))
  return true
}

/** What `sync.ts` calls when it has pulled a photograph the other device took.
 *  Already in the repo by definition, so it starts life synced. */
export async function acceptDownloadedPhoto(photo: Omit<StoredPhoto, 'synced'>): Promise<void> {
  await db.putPhoto({ ...photo, synced: 1 })
  put(photo.eventId, URL.createObjectURL(toBlob({ ...photo, synced: 1 })))
}

/** Drop the bytes for events that are gone. The repo keeps its copies: the
 *  files are immutable and the events are tombstoned rather than removed, so
 *  there is nothing to reconcile and nothing to resurrect. */
export async function dropPhotos(eventIds: readonly string[]): Promise<void> {
  if (eventIds.length === 0) return
  await db.deletePhotos(eventIds)
  for (const id of eventIds) put(id, null)
}
