/**
 * Sync — the private repo is the second device.
 *
 * `store.ts` has no idea this file exists: sync watches the store the same
 * way a React component does (`subscribe`) and applies a merge result through
 * the same `replaceEverything` a backup import already uses. That keeps the
 * dependency direction store.ts already relies on intact, and means a merge
 * and a restored backup are, deliberately, the same code path.
 *
 * A sync round trip always fetches the full remote picture and diffs before
 * writing back — no sha cache, no manifest of "what changed since last time."
 * Correct and simple beats clever at the file counts one person's plants
 * produce; revisit if that stops being true.
 *
 * Photographs are the exception, and have to be: re-fetching a hundred JPEGs to
 * find out they have not changed would be absurd. They are immutable and named
 * after the event they belong to, so "do I have this one?" is a local key
 * lookup and a file is never fetched twice. See `downloadPhotos`.
 *
 * A round writes once. Everything it changed — the lists, the month files and
 * any photographs — goes up as a single commit through the Git Data API, not
 * a commit per file. That is what stopped this app from generating conflicts
 * against itself; `commitFiles` in `githubClient.ts` tells that story.
 */

import { useSyncExternalStore } from 'react'
import { nowISO } from '~/lib/date'
import * as db from './db'
import type { Snapshot } from './db'
import type { PlantEvent } from './types'
import { acceptDownloadedPhoto } from './photos'
import { getState, replaceEverything, subscribe as subscribeStore } from './store'
import { mergeSnapshots } from './merge'
import {
  GitHubApiError,
  GitHubAuthError,
  GitHubNetworkError,
  type FileToCommit,
  type GitHubConfig,
  type RemoteFile,
  commitFiles,
  getBinaryFile,
  getDefaultBranch,
  getFile,
  listDir,
} from './githubClient'
import {
  buildEventsFile,
  buildMetaFile,
  buildPlantsFile,
  groupEventsByMonth,
  monthFilePath,
  parseEventsFile,
  parsePlantsFile,
  parseRemoteMeta,
  photoFilePath,
} from './remoteFormat'

export type SyncConfig = GitHubConfig

export type SyncStatus =
  | { kind: 'unconfigured' }
  // `lastSyncedAt` is null in the narrow window between "just configured" and
  // "first sync finished" — the pill reads that as "not synced yet" rather
  // than a bogus relative time.
  | { kind: 'idle'; lastSyncedAt: string | null; eventCount: number }
  | { kind: 'syncing' }
  | { kind: 'offline-pending'; count: number }
  // The count rides along with the message: "something went wrong" on its own
  // leaves a person wondering whether the edit they just made still exists
  // anywhere. It does, it is waiting, and the line should say so.
  | { kind: 'error'; message: string; pendingCount: number }

const CONFIG_KEY = 'syncConfig'
const STATE_KEY = 'syncState'
const DEBOUNCE_MS = 8000 // comfortably past undo.tsx's 6s VISIBLE_MS

type Phase = 'idle' | 'syncing' | 'offline' | 'error'

type PersistedState = { lastSyncedAt: string | null; pendingCount: number }

let config: SyncConfig | null = null
let phase: Phase = 'idle'
let lastSyncedAt: string | null = null
let pendingCount = 0
let errorMessage = ''

let initialized = false
let previousStoreStatus: string | null = null
let applyingRemote = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let inFlight: Promise<void> | null = null
let runAgainRequested = false

const listeners = new Set<() => void>()

// `useSyncExternalStore` requires `getSnapshot` to return the *same*
// reference until something actually changes — a fresh object literal on
// every call reads as "changed every render" and loops forever. So the
// status is computed once per state change and cached, not recomputed live.
let cachedStatus: SyncStatus = { kind: 'unconfigured' }

function computeStatus(): SyncStatus {
  if (!config) return { kind: 'unconfigured' }
  if (phase === 'syncing') return { kind: 'syncing' }
  if (phase === 'error') return { kind: 'error', message: errorMessage, pendingCount }
  if (phase === 'offline' || pendingCount > 0) return { kind: 'offline-pending', count: pendingCount }

  const eventCount = getState().events.filter((event) => !event.deleted).length
  return { kind: 'idle', lastSyncedAt, eventCount }
}

/** Recompute the cached status and tell every subscriber. Call this, never
 *  `listeners` directly, whenever `config`/`phase`/`lastSyncedAt`/
 *  `pendingCount`/`errorMessage` changes. */
function emit(): void {
  cachedStatus = computeStatus()
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getStatus(): SyncStatus {
  return cachedStatus
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, getStatus, getStatus)
}

export function getSyncConfig(): SyncConfig | null {
  return config
}

async function persist(): Promise<void> {
  const state: PersistedState = { lastSyncedAt, pendingCount }
  await db.writeMeta(STATE_KEY, state)
}

/** Called once, from `App.tsx`'s boot effect. Guarded against StrictMode's
 *  double-invoke and against ever running twice for another reason. */
export function initSync(): void {
  if (initialized) return
  initialized = true

  void bootstrap()

  window.addEventListener('online', () => scheduleSync(0))
  subscribeStore(onStoreChange)
}

async function bootstrap(): Promise<void> {
  const [storedConfig, storedState] = await Promise.all([
    db.readMeta<SyncConfig>(CONFIG_KEY),
    db.readMeta<PersistedState>(STATE_KEY),
  ])

  config = storedConfig ?? null
  lastSyncedAt = storedState?.lastSyncedAt ?? null
  pendingCount = storedState?.pendingCount ?? 0
  emit()

  if (config) scheduleSync(0)
}

function onStoreChange(): void {
  const status = getState().status

  // The very first commit is `load()` hydrating from IndexedDB, not a change
  // a person made — it must not count as "a change waiting to sync."
  const isInitialHydration = previousStoreStatus !== 'ready' && status === 'ready'
  previousStoreStatus = status

  if (applyingRemote || isInitialHydration || status !== 'ready') return

  pendingCount += 1
  emit()
  void persist()
  scheduleSync(DEBOUNCE_MS)
}

/**
 * How long to wait before trying again after a round that failed, and how
 * many times to bother.
 *
 * A failed sync that never retries leaves an edit sitting until someone
 * notices; a failed sync that retries eagerly is a script pointing at
 * `api.github.com`, and GitHub blocks those. So: four attempts, each gap
 * several times the last, roughly an hour of cover in total, and then
 * silence until a person does something. At this spacing a whole day of
 * failure costs fewer requests than one ordinary afternoon of watering.
 */
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000]

/** A refused token is not going to un-refuse itself. Retrying that on a
 *  timer is exactly the traffic GitHub blocks accounts for, so it doesn't
 *  get one — but an edit shouldn't fire a round trip each either. */
const AUTH_COOLDOWN_MS = 30 * 60_000

let retryAttempt = 0
/** Nothing automatic may reach GitHub before this moment. Pressing "Sync
 *  now" or saving Settings is a person asking, and passes straight through. */
let cooldownUntil = 0

/** `force` is for the two things a person does deliberately. Everything else
 *  — an edit, coming back online, a scheduled retry — waits out the cooldown
 *  a failure left behind. */
function scheduleSync(delayMs: number, force = false): void {
  if (!config) return

  const waitFor = force ? delayMs : Math.max(delayMs, cooldownUntil - Date.now())
  if (debounceTimer) clearTimeout(debounceTimer)

  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void runSync()
  }, waitFor)
}

/** Back off, and say whether it is worth waking up again on our own. */
function beginCooldown(kind: 'auth' | 'transient'): void {
  if (kind === 'auth') {
    cooldownUntil = Date.now() + AUTH_COOLDOWN_MS
    return
  }

  const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)] ?? 30 * 60_000
  retryAttempt += 1
  cooldownUntil = Date.now() + delay

  if (retryAttempt <= RETRY_DELAYS_MS.length) scheduleSync(delay)
}

/** Save the repository and token, then try a sync right away. */
export async function configureSync(next: SyncConfig): Promise<void> {
  config = next
  await db.writeMeta(CONFIG_KEY, next)
  phase = 'idle'
  errorMessage = ''
  retryAttempt = 0
  cooldownUntil = 0
  emit()
  scheduleSync(0, true)
}

/** The "Sync now" button. Coalesces with anything already running or queued. */
export function syncNow(): void {
  // A person pressing the button is allowed to skip the queue, and they
  // deserve the full run of automatic retries again if this one fails too.
  retryAttempt = 0
  cooldownUntil = 0
  scheduleSync(0, true)
}

function runSync(): Promise<void> {
  if (inFlight) {
    runAgainRequested = true
    return inFlight
  }

  inFlight = performSync().finally(() => {
    inFlight = null
    if (runAgainRequested) {
      runAgainRequested = false
      void runSync()
    }
  })

  return inFlight
}

async function performSync(): Promise<void> {
  if (!config) return
  const active = config

  phase = 'syncing'
  emit()

  try {
    await syncOnce(active)
    phase = 'idle'
    lastSyncedAt = nowISO()
    pendingCount = 0
    errorMessage = ''
    retryAttempt = 0
    cooldownUntil = 0
  } catch (error) {
    if (error instanceof GitHubAuthError) {
      phase = 'error'
      errorMessage = 'Your access token expired. Sync is paused.'
      beginCooldown('auth')
    } else if (error instanceof GitHubNetworkError) {
      // Actually offline, or GitHub is unreachable — nobody's fault, sync
      // will simply try again once a connection comes back. The `online`
      // event is the real signal; the backoff is only there for the case
      // where the browser thinks it is online and GitHub disagrees.
      phase = 'offline'
      beginCooldown('transient')
    } else {
      // A 404/403 GitHub actually returned, a conflict that didn't resolve
      // after a retry, a remote file that doesn't parse: these are real
      // problems with the repository, the token's permissions, or the data —
      // "waiting for a connection" would be a lie, so this gets a message
      // instead, even though there's no single button that fixes all of them.
      phase = 'error'
      errorMessage =
        error instanceof GitHubApiError
          ? `GitHub rejected the request (${error.status}). Check the repository name and the token's Contents permission.`
          : error instanceof Error
            ? `Sync failed: ${error.message}`
            : 'Sync failed for an unknown reason.'
      beginCooldown('transient')
    }
  }

  await persist()
  emit()
}

async function syncOnce(active: SyncConfig): Promise<void> {
  // Resolved once per round and passed to every write: a `PUT contents` with
  // no explicit branch resolves against the repo's default ref, which does
  // not exist yet on a repo with zero commits — that PUT 404s even though
  // the repo and the token are both fine. `default_branch` is set at repo
  // creation, before any commit, so this works from the very first sync too.
  const branch = await getDefaultBranch(active)

  const remoteMetaFile = await getFile(active, 'meta.json')
  const remoteVocab = remoteMetaFile ? parseRemoteMeta(remoteMetaFile.content).vocab : []

  const remotePlantsFile = await getFile(active, 'plants.json')
  const remotePlants = remotePlantsFile ? parsePlantsFile(remotePlantsFile.content) : []

  const local = getState()
  const localMonths = groupEventsByMonth(local.events)
  const remoteMonthEntries = (await listDir(active, 'events')) ?? []
  const remoteMonthKeys = remoteMonthEntries
    .map((entry) => entry.name.replace(/\.json$/, ''))
    .filter((key) => /^\d{4}-\d{2}$/.test(key))

  const monthKeys = new Set([...remoteMonthKeys, ...localMonths.keys()])
  const remoteMonthFiles = new Map<string, RemoteFile | null>()
  const remoteEvents: PlantEvent[] = []

  for (const key of monthKeys) {
    const file = await getFile(active, monthFilePath(key))
    remoteMonthFiles.set(key, file)
    if (file) remoteEvents.push(...parseEventsFile(file.content, monthFilePath(key)))
  }

  const localSnapshot: Snapshot = {
    plants: [...local.plants],
    events: [...local.events],
    vocab: [...local.vocab],
  }
  const remoteSnapshot: Snapshot = { plants: remotePlants, events: remoteEvents, vocab: remoteVocab }

  const { snapshot: merged, changed } = mergeSnapshots(localSnapshot, remoteSnapshot)

  if (changed) {
    applyingRemote = true
    try {
      await replaceEverything(merged)
    } finally {
      applyingRemote = false
    }
  }

  // Everything this round changes, gathered before anything is written. One
  // commit lands the lot — see `commitFiles` for why that is the whole point.
  const writes: FileToCommit[] = []

  addIfChanged(writes, 'meta.json', remoteMetaFile, buildMetaFile(merged.vocab))
  addIfChanged(writes, 'plants.json', remotePlantsFile, buildPlantsFile(merged.plants))

  const mergedMonths = groupEventsByMonth(merged.events)
  for (const [key, events] of mergedMonths) {
    const path = monthFilePath(key)
    addIfChanged(writes, path, remoteMonthFiles.get(key) ?? null, buildEventsFile(events))
  }

  // Photographs ride in the same commit as the log that describes them, so a
  // picture is never in the repo without its entry, or the other way round.
  const uploaded = await photosToUpload(merged.events)
  for (const photo of uploaded) writes.push({ path: photo.path, bytes: photo.bytes })

  await commitFiles(active, branch, writes, COMMIT_MESSAGE)

  // Only once the commit has actually landed: a photograph marked synced that
  // never made it up would never be offered again.
  for (const photo of uploaded) await db.markPhotoSynced(photo.eventId)

  await downloadPhotos(active, merged.events)
}

function addIfChanged(
  writes: FileToCommit[],
  path: string,
  existing: RemoteFile | null,
  content: string,
): void {
  if (existing?.content === content) return
  writes.push({ path, text: content })
}

const COMMIT_MESSAGE = 'Sync from Florarithm'

/** How many photographs one round trip will push up. The same reasoning as
 *  `DOWNLOAD_BUDGET`, and it also keeps a single commit a sane size. */
const UPLOAD_BUDGET = 25

/** Everything photographed here that the repo has not been told about. */
async function photosToUpload(
  events: readonly PlantEvent[],
): Promise<{ eventId: string; path: string; bytes: ArrayBuffer }[]> {
  const byId = new Map(events.map((event) => [event.id, event]))
  const ready = []

  for (const photo of await db.unsyncedPhotos()) {
    const event = byId.get(photo.eventId)
    if (!event || event.deleted) continue

    ready.push({ eventId: photo.eventId, path: photoFilePath(event), bytes: photo.bytes })
    if (ready.length === UPLOAD_BUDGET) break
  }

  return ready
}

/** How many photographs one round trip will pull down. A device joining a
 *  collection with years of pictures in it should become useful immediately and
 *  fill in behind itself, rather than holding the first sync open for a
 *  thousand requests. The rest arrive on the next rounds. */
const DOWNLOAD_BUDGET = 25

/**
 * Pull down the pictures this device does not have.
 *
 * A photograph never changes. Its path is derived from the event's id and
 * date, so there is nothing to list, nothing to compare and no sha to track —
 * only "the repo has it" and "this device has it", each a set membership test.
 */
async function downloadPhotos(
  active: SyncConfig,
  events: readonly PlantEvent[],
): Promise<void> {
  const held = new Set(await db.photoIds())
  const wanted = events.filter((event) => event.photo && !event.deleted && !held.has(event.id))

  for (const event of wanted.slice(0, DOWNLOAD_BUDGET)) {
    const file = await getBinaryFile(active, photoFilePath(event))
    // Absent means the other device logged the entry but has not pushed the
    // photograph yet. Nothing is wrong; it will be there on a later round.
    if (!file) continue

    await acceptDownloadedPhoto({
      eventId: event.id,
      bytes: file.bytes,
      type: 'image/jpeg',
      width: event.photo?.width ?? 0,
      height: event.photo?.height ?? 0,
    })
  }
}
