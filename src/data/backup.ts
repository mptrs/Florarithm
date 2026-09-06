/**
 * Export and import.
 *
 * One JSON file holding plants, events and the growing lists. It is the same
 * shape the sync will push to the private repo in M2, on purpose: the local
 * store, the backup file and the synced document should never drift into three
 * different truths.
 *
 * Until that sync exists this file is the only safety net there is.
 */

import { nowISO } from '~/lib/date'
import { migrateEvents, migrateVocab } from './migrate'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  READABLE_BACKUP_VERSIONS,
  type Backup,
  type VocabItem,
} from './types'
import type { State } from './store'

export function buildBackup(state: State): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: nowISO(),
    plants: [...state.plants],
    events: [...state.events],
    vocab: [...state.vocab],
  }
}

export function backupFilename(date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10)
  return `florarithm-${stamp}.json`
}

/**
 * Hand the file to the operating system.
 *
 * On iOS `navigator.share` opens the share sheet, which is the route to "Save
 * to Files" and so to iCloud Drive. Everywhere else, and when sharing is
 * refused, fall back to a download.
 *
 * @returns whether the file left the app, so the caller only records a backup
 *          that actually happened.
 */
export async function shareBackup(backup: Backup): Promise<boolean> {
  const json = JSON.stringify(backup, null, 2)
  const filename = backupFilename()
  const file = new File([json], filename, { type: 'application/json' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Florarithm backup' })
      return true
    } catch (error) {
      // A cancelled share sheet is not a failure; anything else falls through
      // to the download so the export is still possible.
      if (error instanceof DOMException && error.name === 'AbortError') return false
    }
  }

  download(json, filename)
  return true
}

function download(json: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export class BackupParseError extends Error {}

/**
 * Read a file back, refusing anything that is not recognisably ours. Importing
 * replaces the whole collection, so this is the wrong moment to be lenient.
 */
export function parseBackup(text: string): Backup {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new BackupParseError('That file is not JSON.')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new BackupParseError('That file does not contain a backup.')
  }

  const candidate = parsed as Partial<Backup>

  if (candidate.format !== BACKUP_FORMAT) {
    throw new BackupParseError('That file was not exported by Florarithm.')
  }
  if (!READABLE_BACKUP_VERSIONS.includes(Number(candidate.version))) {
    throw new BackupParseError(
      `That backup is version ${String(candidate.version)}; this app reads ${READABLE_BACKUP_VERSIONS.join(' and ')}.`,
    )
  }
  if (
    !Array.isArray(candidate.plants) ||
    !Array.isArray(candidate.events) ||
    !Array.isArray(candidate.vocab)
  ) {
    throw new BackupParseError('That backup is missing plants, events or lists.')
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: candidate.exportedAt ?? nowISO(),
    plants: candidate.plants,
    // A version 2 file still names a fertilizer brand on every watering; it
    // comes in as a plain yes/no, and the list it pointed at is dropped.
    events: migrateEvents(candidate.events),
    vocab: migrateVocab(candidate.vocab.map(withVocabUpdatedAt)),
  }
}

/** A backup exported before `VocabItem.updatedAt` existed has no way to date
 *  a rename, so it falls back to `createdAt` — good enough for a field that
 *  only matters once a second device's copy needs to be compared against it. */
function withVocabUpdatedAt(item: VocabItem): VocabItem {
  return { ...item, updatedAt: item.updatedAt ?? item.createdAt }
}

export async function readBackupFile(file: File): Promise<Backup> {
  return parseBackup(await file.text())
}
