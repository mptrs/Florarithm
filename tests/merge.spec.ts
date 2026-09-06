/**
 * Sync's pure core: the merge rules, the remote file shapes, and the base64
 * transport encoding. No network, no IndexedDB, no browser — same reasoning
 * as `logic.spec.ts`: these are cheaper to get wrong than to discover wrong.
 */

import { expect, test } from '@playwright/test'
import { base64ToUtf8, utf8ToBase64 } from '../src/data/base64'
import {
  GitHubAuthError,
  GitHubConflictError,
  getDefaultBranch,
  getFile,
  listDir,
  putFile,
} from '../src/data/githubClient'
import { mergeEvents, mergePlants, mergeSnapshots, mergeVocab } from '../src/data/merge'
import {
  buildEventsFile,
  buildMetaFile,
  buildPlantsFile,
  groupEventsByMonth,
  monthFilePath,
  monthKeyOf,
  parseEventsFile,
  parsePlantsFile,
  parseRemoteMeta,
  RemoteParseError,
} from '../src/data/remoteFormat'
import { BACKUP_VERSION, type Plant, type PlantEvent, type VocabItem } from '../src/data/types'

function plant(code: string, updatedAt: string, extra: Partial<Plant> = {}): Plant {
  return {
    code,
    name: code,
    genus: '',
    species: '',
    cultivar: '',
    locationId: null,
    system: 'soil',
    potSize: null,
    mediumId: null,
    origin: { type: null, from: '', date: null, price: null },
    parent: null,
    status: 'active',
    wish: false,
    wishNote: '',
    createdAt: updatedAt,
    updatedAt,
    ...extra,
  }
}

function waterEvent(id: string, date: string, extra: { deleted?: boolean } = {}): PlantEvent {
  return { id, plantCode: 'MON-0001', date, type: 'water', fertilized: false, ...extra }
}

function vocab(id: string, updatedAt: string, extra: Partial<VocabItem> = {}): VocabItem {
  return { id, kind: 'location', name: id, archived: false, createdAt: updatedAt, updatedAt, ...extra }
}

test.describe('merging plants', () => {
  test('a plant only one side has is just carried over', () => {
    const { merged, changed } = mergePlants([plant('A', '2026-01-01')], [plant('B', '2026-01-01')])
    expect(merged.map((p) => p.code).sort()).toEqual(['A', 'B'])
    expect(changed).toBe(true)
  })

  test('the newer updatedAt wins outright, not field by field', () => {
    const local = plant('A', '2026-01-01T00:00:00.000Z', { name: 'Old name', potSize: 12 })
    const remote = plant('A', '2026-02-01T00:00:00.000Z', { name: 'New name', potSize: null })

    const { merged } = mergePlants([local], [remote])
    expect(merged).toEqual([remote])
  })

  test('identical snapshots report unchanged', () => {
    const a = [plant('A', '2026-01-01')]
    const { changed } = mergePlants(a, [plant('A', '2026-01-01')])
    expect(changed).toBe(false)
  })
})

test.describe('merging vocab', () => {
  test('last write wins by updatedAt, same as plants', () => {
    const local = vocab('loc-1', '2026-01-01', { name: 'Living room' })
    const remote = vocab('loc-1', '2026-03-01', { name: 'Bedroom', archived: true })

    const { merged, changed } = mergeVocab([local], [remote])
    expect(merged).toEqual([remote])
    expect(changed).toBe(true)
  })
})

test.describe('merging events', () => {
  test('a tombstone survives the merge even if the other side never saw it deleted', () => {
    const local = [waterEvent('e1', '2026-01-01')]
    const remote = [waterEvent('e1', '2026-01-01', { deleted: true })]

    const { merged, changed } = mergeEvents(local, remote)
    expect(merged).toEqual([{ ...local[0], deleted: true }])
    expect(changed).toBe(true)
  })

  test('a tombstone never comes back from a merge, regardless of side order', () => {
    const deleted = [waterEvent('e1', '2026-01-01', { deleted: true })]
    const notDeleted = [waterEvent('e1', '2026-01-01')]

    expect(mergeEvents(deleted, notDeleted).merged[0]?.deleted).toBe(true)
    expect(mergeEvents(notDeleted, deleted).merged[0]?.deleted).toBe(true)
  })

  test('events unique to one side are unioned in, and identical sides report unchanged', () => {
    const shared = waterEvent('e1', '2026-01-01')
    const onlyRemote = waterEvent('e2', '2026-01-02')

    const { merged, changed } = mergeEvents([shared], [shared, onlyRemote])
    expect(merged.map((e) => e.id).sort()).toEqual(['e1', 'e2'])
    expect(changed).toBe(true)

    expect(mergeEvents([shared], [shared]).changed).toBe(false)
  })
})

test.describe('mergeSnapshots', () => {
  test('reports changed if any of the three parts did', () => {
    const same = { plants: [plant('A', '2026-01-01')], events: [], vocab: [] }
    expect(mergeSnapshots(same, same).changed).toBe(false)

    const withExtraEvent = { ...same, events: [waterEvent('e1', '2026-01-01')] }
    expect(mergeSnapshots(same, withExtraEvent).changed).toBe(true)
  })
})

test.describe('remote file shapes', () => {
  test('the month key is a plain slice of the UTC timestamp, no timezone math', () => {
    expect(monthKeyOf('2026-09-05T23:30:00.000Z')).toBe('2026-09')
    expect(monthFilePath('2026-09')).toBe('events/2026-09.json')
  })

  test('events group by the month their own date falls in', () => {
    const events = [waterEvent('e1', '2026-01-15'), waterEvent('e2', '2026-02-01'), waterEvent('e3', '2026-01-31')]
    const grouped = groupEventsByMonth(events)
    expect([...grouped.keys()].sort()).toEqual(['2026-01', '2026-02'])
    expect(grouped.get('2026-01')?.map((e) => e.id).sort()).toEqual(['e1', 'e3'])
  })

  test('meta.json round-trips through build and parse', () => {
    const items = [vocab('loc-1', '2026-01-01')]
    const parsed = parseRemoteMeta(buildMetaFile(items))
    expect(parsed.vocab).toEqual(items)
  })

  test('meta.json from before updatedAt existed falls back to createdAt', () => {
    const legacy = {
      format: 'florarithm',
      version: BACKUP_VERSION,
      vocab: [{ id: 'x', kind: 'location', name: 'X', archived: false, createdAt: '2025-01-01' }],
    }
    const parsed = parseRemoteMeta(JSON.stringify(legacy))
    expect(parsed.vocab[0]?.updatedAt).toBe('2025-01-01')
  })

  test('a meta.json from a future format version is refused', () => {
    expect(() => parseRemoteMeta(JSON.stringify({ format: 'florarithm', version: 99, vocab: [] }))).toThrow(
      RemoteParseError,
    )
  })

  test('plants.json and an events file both round-trip and reject a non-list', () => {
    const plants = [plant('A', '2026-01-01')]
    expect(parsePlantsFile(buildPlantsFile(plants))).toEqual(plants)
    expect(() => parsePlantsFile('{}')).toThrow(RemoteParseError)

    const events = [waterEvent('e1', '2026-01-01')]
    expect(parseEventsFile(buildEventsFile(events), 'events/2026-01.json')).toEqual(events)
    expect(() => parseEventsFile('{}', 'events/2026-01.json')).toThrow(RemoteParseError)
  })

  test('malformed JSON is refused rather than crashing the merge', () => {
    expect(() => parsePlantsFile('not json')).toThrow(RemoteParseError)
  })
})

test.describe('base64', () => {
  test('round-trips text the GitHub API would otherwise mangle', () => {
    const text = 'Gruyère 🌿 — "quoted", newline\nhere'
    expect(base64ToUtf8(utf8ToBase64(text))).toBe(text)
  })

  test('survives the 60-column line wrapping GitHub returns content with', () => {
    const wrapped = utf8ToBase64('x'.repeat(200)).replace(/(.{60})/g, '$1\n')
    expect(base64ToUtf8(wrapped)).toBe('x'.repeat(200))
  })
})

test.describe('the GitHub Contents API client', () => {
  const config = { owner: 'mptrs', repo: 'florarithm-data', token: 'github_pat_test' }
  let originalFetch: typeof fetch

  test.beforeEach(() => {
    originalFetch = global.fetch
  })
  test.afterEach(() => {
    global.fetch = originalFetch
  })

  test('a 404 on a get is "does not exist yet," not an error', async () => {
    global.fetch = (async () => new Response(null, { status: 404 })) as typeof fetch
    expect(await getFile(config, 'plants.json')).toBeNull()
    expect(await listDir(config, 'events')).toBeNull()
  })

  test('a 401 is refused as an auth error, distinct from a network failure', async () => {
    global.fetch = (async () => new Response(null, { status: 401 })) as typeof fetch
    await expect(getFile(config, 'plants.json')).rejects.toBeInstanceOf(GitHubAuthError)
  })

  test('a 403 without an exhausted rate limit also reads as an auth error', async () => {
    global.fetch = (async () =>
      new Response(null, { status: 403, headers: { 'x-ratelimit-remaining': '500' } })) as typeof fetch
    await expect(getFile(config, 'plants.json')).rejects.toBeInstanceOf(GitHubAuthError)
  })

  test('a 403 that is a rate limit is not treated as an auth failure', async () => {
    global.fetch = (async () =>
      new Response(null, { status: 403, headers: { 'x-ratelimit-remaining': '0' } })) as typeof fetch
    await expect(getFile(config, 'plants.json')).rejects.not.toBeInstanceOf(GitHubAuthError)
  })

  test('the fetch itself throwing surfaces as a network error, not an auth or api error', async () => {
    global.fetch = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    await expect(getFile(config, 'plants.json')).rejects.toThrow('Could not reach GitHub.')
  })

  test('a 409 on a write is a conflict, so the caller can re-fetch and retry', async () => {
    global.fetch = (async () => new Response(null, { status: 409 })) as typeof fetch
    await expect(
      putFile(config, 'plants.json', '[]', 'sha1', 'sync', 'main'),
    ).rejects.toBeInstanceOf(GitHubConflictError)
  })

  test('a write always names an explicit branch, so it can create the very first commit on a repo with none yet', async () => {
    let body: unknown
    global.fetch = (async (_url, init) => {
      body = JSON.parse(init?.body as string)
      return new Response(JSON.stringify({ content: { sha: 'new-sha' } }), { status: 201 })
    }) as typeof fetch

    await putFile(config, 'plants.json', '[]', null, 'sync', 'main')
    expect((body as { branch: string }).branch).toBe('main')
  })

  test('a successful get decodes the base64 body and hands back its sha', async () => {
    global.fetch = (async () =>
      new Response(JSON.stringify({ content: utf8ToBase64('[]'), sha: 'abc123' }), {
        status: 200,
      })) as typeof fetch
    expect(await getFile(config, 'plants.json')).toEqual({ content: '[]', sha: 'abc123' })
  })

  test('the default branch comes from the repo itself, resolvable even before the first commit', async () => {
    global.fetch = (async () =>
      new Response(JSON.stringify({ default_branch: 'main' }), { status: 200 })) as typeof fetch
    expect(await getDefaultBranch(config)).toBe('main')
  })
})
