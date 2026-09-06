/**
 * The shape of the three file kinds that live in the private repo:
 * `meta.json` (format header plus the growing lists), `plants.json` (a bare
 * array) and one `events/YYYY-MM.json` per month a plant event falls in.
 *
 * Parsing here is defensive the same way `backup.ts`'s `parseBackup` is —
 * refusing anything that isn't recognisably ours — because a merge that
 * silently accepts a malformed remote file corrupts both devices at once.
 */

import { migrateEvents, migrateVocab } from './migrate'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  READABLE_BACKUP_VERSIONS,
  type Plant,
  type PlantEvent,
  type VocabItem,
} from './types'

export type RemoteMeta = {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  vocab: VocabItem[]
}

export class RemoteParseError extends Error {}

export function buildMetaFile(vocab: readonly VocabItem[]): string {
  const meta: RemoteMeta = { format: BACKUP_FORMAT, version: BACKUP_VERSION, vocab: [...vocab] }
  return JSON.stringify(meta, null, 2)
}

export function parseRemoteMeta(text: string): RemoteMeta {
  const parsed = parseJson(text, 'meta.json')
  const candidate = parsed as Partial<RemoteMeta>

  if (candidate.format !== BACKUP_FORMAT) {
    throw new RemoteParseError('meta.json was not written by Florarithm.')
  }
  // A repository written by version 2 is read and migrated rather than
  // refused: it is the same collection, and the next push rewrites it as 3.
  if (!READABLE_BACKUP_VERSIONS.includes(Number(candidate.version))) {
    throw new RemoteParseError(
      `meta.json is version ${String(candidate.version)}; this app reads ${READABLE_BACKUP_VERSIONS.join(' and ')}.`,
    )
  }
  if (!Array.isArray(candidate.vocab)) {
    throw new RemoteParseError('meta.json is missing its lists.')
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    vocab: migrateVocab(
      candidate.vocab.map((item) => ({ ...item, updatedAt: item.updatedAt ?? item.createdAt })),
    ),
  }
}

export function buildPlantsFile(plants: readonly Plant[]): string {
  return JSON.stringify(plants, null, 2)
}

export function parsePlantsFile(text: string): Plant[] {
  const parsed = parseJson(text, 'plants.json')
  if (!Array.isArray(parsed)) throw new RemoteParseError('plants.json is not a list.')
  return parsed as Plant[]
}

export function buildEventsFile(events: readonly PlantEvent[]): string {
  return JSON.stringify(events, null, 2)
}

export function parseEventsFile(text: string, path: string): PlantEvent[] {
  const parsed = parseJson(text, path)
  if (!Array.isArray(parsed)) throw new RemoteParseError(`${path} is not a list.`)
  return migrateEvents(parsed as PlantEvent[])
}

function parseJson(text: string, path: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new RemoteParseError(`${path} is not valid JSON.`)
  }
}

/** `2026-09` — a plain slice of the UTC ISO timestamp `nowISO()` produces, on
 *  purpose: two devices in different timezones must agree on which file an
 *  event belongs to without doing any timezone reasoning at all. */
export function monthKeyOf(dateIso: string): string {
  return dateIso.slice(0, 7)
}

export function monthFilePath(monthKey: string): string {
  return `events/${monthKey}.json`
}

export function groupEventsByMonth(
  events: readonly PlantEvent[],
): Map<string, PlantEvent[]> {
  const grouped = new Map<string, PlantEvent[]>()
  for (const event of events) {
    const key = monthKeyOf(event.date)
    const bucket = grouped.get(key)
    if (bucket) bucket.push(event)
    else grouped.set(key, [event])
  }
  return grouped
}
