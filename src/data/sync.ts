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
 */

import { useSyncExternalStore } from 'react'
import { hasPendingUndo } from '~/lib/pendingUndo'
import { nowISO } from '~/lib/date'
import * as db from './db'
import type { Snapshot } from './db'
import type { PlantEvent } from './types'
import { getState, replaceEverything, subscribe as subscribeStore } from './store'
import { mergeSnapshots } from './merge'
import {
  GitHubApiError,
  GitHubAuthError,
  GitHubConflictError,
  GitHubNetworkError,
  type GitHubConfig,
  type RemoteFile,
  getDefaultBranch,
  getFile,
  listDir,
  putFile,
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
  | { kind: 'error'; message: string }

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
  if (phase === 'error') return { kind: 'error', message: errorMessage }
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

function scheduleSync(delayMs: number): void {
  if (!config) return
  if (debounceTimer) clearTimeout(debounceTimer)

  debounceTimer = setTimeout(() => {
    debounceTimer = null
    if (hasPendingUndo()) {
      scheduleSync(DEBOUNCE_MS)
      return
    }
    void runSync()
  }, delayMs)
}

/** Save the repository and token, then try a sync right away. */
export async function configureSync(next: SyncConfig): Promise<void> {
  config = next
  await db.writeMeta(CONFIG_KEY, next)
  phase = 'idle'
  errorMessage = ''
  emit()
  scheduleSync(0)
}

/** The "Sync now" button. Coalesces with anything already running or queued. */
export function syncNow(): void {
  scheduleSync(0)
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
  } catch (error) {
    if (error instanceof GitHubAuthError) {
      phase = 'error'
      errorMessage = 'Your access token expired. Sync is paused.'
    } else if (error instanceof GitHubNetworkError) {
      // Actually offline, or GitHub is unreachable — nobody's fault, sync
      // will simply try again once a connection comes back.
      phase = 'offline'
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

  await pushIfChanged(active, branch, 'meta.json', remoteMetaFile, buildMetaFile(merged.vocab))
  await pushIfChanged(active, branch, 'plants.json', remotePlantsFile, buildPlantsFile(merged.plants))

  const mergedMonths = groupEventsByMonth(merged.events)
  for (const [key, events] of mergedMonths) {
    await pushIfChanged(
      active,
      branch,
      monthFilePath(key),
      remoteMonthFiles.get(key) ?? null,
      buildEventsFile(events),
    )
  }
}

const COMMIT_MESSAGE = 'Sync from Florarithm'

async function pushIfChanged(
  active: SyncConfig,
  branch: string,
  path: string,
  existing: RemoteFile | null,
  content: string,
): Promise<void> {
  if (existing && existing.content === content) return

  try {
    await putFile(active, path, content, existing?.sha ?? null, COMMIT_MESSAGE, branch)
  } catch (error) {
    if (!(error instanceof GitHubConflictError)) throw error

    // Someone else wrote first — take their latest and push again on top of
    // it. One retry only; a second conflict means this sync round is out of
    // luck and will simply try again next time.
    const fresh = await getFile(active, path)
    if (fresh?.content !== content) {
      await putFile(active, path, content, fresh?.sha ?? null, COMMIT_MESSAGE, branch)
    }
  }
}
