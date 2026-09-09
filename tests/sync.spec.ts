/**
 * Sync against a fake GitHub, end to end through the real UI.
 *
 * `api.github.com` is intercepted rather than hit for real — this proves the
 * app's own behaviour (bootstrapping an empty repo, surfacing a revoked
 * token) without depending on a real private repo or a real token existing
 * in CI. The real `Florarithm-db` repo is for the manual check instead.
 */

import { expect, test, type Page, type Route } from '@playwright/test'
import { png } from './imageFixture'

async function clearDatabase(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase('florarithm')
      request.onsuccess = resolve
      request.onerror = resolve
      request.onblocked = resolve
    })
  })
}

async function configureSync(page: Page, token = 'github_pat_test123') {
  await page.goto('#settings')
  await page.getByLabel('Private repository').fill('test-owner/test-repo')
  await page.getByLabel('Private repository').blur()
  await page.getByPlaceholder('github_pat_…').fill(token)
  await page.getByRole('button', { name: 'Save' }).click()
}

/** Add a plant through the UI and photograph it, the way the plant page does. */
async function addPlantWithPhoto(page: Page): Promise<string> {
  await page.goto('#new')
  await page.getByLabel('Genus').fill('Monstera')
  await page.getByLabel('Name', { exact: true }).fill('Gruyère')
  await page.getByRole('button', { name: 'Add to the collection' }).click()
  await expect(page.getByRole('heading', { name: 'Gruyère' })).toBeVisible()

  // Photographing is one of the things the log sheet does. This project runs
  // Desktop Chrome, which has no drop — the split button's caret reaches the
  // same sheet.
  await page.getByRole('button', { name: 'More ways to log' }).click()
  await page.getByRole('menuitem', { name: 'Log something else', exact: true }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add a photo' }).click()
  await (await chooser).setFiles({ name: 'g.png', mimeType: 'image/png', buffer: png(1200, 1600) })
  // The attached-photo chip is also called "Photo"; the action is the later one.
  await page.getByRole('button', { name: 'Photo', exact: true }).last().click()
  await expect(page.getByRole('img', { name: /Gruyère, photographed/ })).toBeVisible()

  return new URL(page.url()).hash.replace('#p=', '')
}

function json(body: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify(body) }
}

/**
 * A fake GitHub, small enough to read.
 *
 * `contents` is what the repo already holds; `written` is what the app put
 * there. Writes arrive as a tree, so this understands the handful of Git Data
 * endpoints one commit touches — and counts the commits, which is the thing
 * worth asserting: a round trip is meant to make exactly one.
 */
function interceptGitHub(page: Page, contents: Record<string, string> = {}) {
  const state = { written: new Map<string, string>(), requested: [] as string[], commits: 0 }
  const blobs = new Map<string, string>()
  let head: string | null = null

  const route = async (r: Route) => {
    const request = r.request()
    const path = new URL(request.url()).pathname.replace('/repos/test-owner/test-repo', '')
    const method = request.method()
    const body = () => request.postDataJSON() as unknown

    if (path === '') {
      await r.fulfill(json({ default_branch: 'main' }))
    } else if (path === '/git/ref/heads/main') {
      // A repository with no commits answers 409, not 404.
      if (!head) await r.fulfill({ status: 409, body: '{}' })
      else await r.fulfill(json({ object: { sha: head } }))
    } else if (path.startsWith('/git/commits/') && method === 'GET') {
      await r.fulfill(json({ tree: { sha: 'base-tree' } }))
    } else if (path === '/git/blobs') {
      const sha = `blob-${blobs.size}`
      blobs.set(sha, (body() as { content: string }).content)
      await r.fulfill(json({ sha }))
    } else if (path === '/git/trees') {
      const entries = (body() as { tree: { path: string; content?: string; sha?: string }[] }).tree
      for (const entry of entries) {
        state.written.set(entry.path, entry.content ?? blobs.get(entry.sha ?? '') ?? '')
      }
      await r.fulfill(json({ sha: 'tree' }))
    } else if (path === '/git/commits') {
      state.commits += 1
      await r.fulfill(json({ sha: `commit-${state.commits}` }))
    } else if (path === '/git/refs' || path === '/git/refs/heads/main') {
      head = `commit-${state.commits}`
      await r.fulfill(json({ ref: 'refs/heads/main' }))
    } else if (path.startsWith('/contents/')) {
      const file = path.replace('/contents/', '')
      state.requested.push(file)
      const held = contents[file]
      if (held === undefined) await r.fulfill({ status: 404, body: '{}' })
      else await r.fulfill({ status: 200, contentType: 'application/json', body: held })
    } else {
      await r.fulfill({ status: 404, body: '{}' })
    }
  }

  return { state, install: () => page.route('https://api.github.com/**', route) }
}

test.beforeEach(async ({ page }) => {
  await page.goto('')
  await clearDatabase(page)
  await page.reload()
})

test('a completely empty repo bootstraps on the first sync', async ({ page }) => {
  const { state, install } = interceptGitHub(page)
  await install()

  await configureSync(page)

  await expect(page.getByText(/^Synced /)).toBeVisible()
  expect([...state.written.keys()].sort()).toEqual(['meta.json', 'plants.json'])
  // Two files, one commit. This is the whole point of the Git Data transport:
  // a round trip writes once, so it can never race itself onto the branch.
  expect(state.commits).toBe(1)
})

test('a revoked token surfaces the "Fix" state, and Fix reaches Settings', async ({ page }) => {
  await page.route('https://api.github.com/**', async (route: Route) => {
    await route.fulfill({ status: 401, body: '{}' })
  })

  await configureSync(page)

  await expect(page.getByText('Your access token expired. Sync is paused.')).toBeVisible()

  await page.goto('#today')
  const fix = page.getByRole('link', { name: 'Fix' })
  await expect(fix).toBeVisible()
  await fix.click()

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})

test('a failed sync still says how much is waiting, so an edit never looks lost', async ({
  page,
}) => {
  await page.route('https://api.github.com/**', async (route: Route) => {
    await route.fulfill({ status: 401, body: '{}' })
  })

  await configureSync(page)
  await expect(page.getByText('Your access token expired. Sync is paused.')).toBeVisible()

  await page.goto('#new')
  await page.getByLabel('Genus').fill('Monstera')
  await page.getByLabel('Name', { exact: true }).fill('Gruyère')
  await page.getByRole('button', { name: 'Add to the collection' }).click()
  await expect(page.getByRole('heading', { name: 'Gruyère' })).toBeVisible()

  await page.goto('#settings')
  await expect(page.getByText(/change(s)? still waiting to sync/)).toBeVisible()
})

test('a repository that keeps refusing is left alone rather than hammered', async ({ page }) => {
  let requests = 0
  await page.route('https://api.github.com/**', async (route: Route) => {
    requests += 1
    await route.fulfill({ status: 401, body: '{}' })
  })

  await configureSync(page)
  await expect(page.getByText('Your access token expired. Sync is paused.')).toBeVisible()

  const afterFirstFailure = requests

  // Three edits in a row, each of which used to start its own round trip.
  // The cooldown a failure leaves behind now swallows all of them.
  for (const name of ['Gruyère', 'Brie', 'Comté']) {
    await page.goto('#new')
    await page.getByLabel('Genus').fill('Monstera')
    await page.getByLabel('Name', { exact: true }).fill(name)
    await page.getByRole('button', { name: 'Add to the collection' }).click()
    await expect(page.getByRole('heading', { name })).toBeVisible()
  }

  await page.waitForTimeout(2000)
  expect(requests).toBe(afterFirstFailure)

  // The person, on the other hand, is never made to wait.
  await page.goto('#settings')
  await page.getByRole('button', { name: 'Sync now' }).click()
  await expect.poll(() => requests).toBeGreaterThan(afterFirstFailure)
})

/** A repository that already holds one plant and one photographed entry — the
 *  other device, as far as this one can tell. */
const REMOTE_PLANT = {
  code: 'MON-1234',
  name: 'Gruyère',
  genus: 'Monstera',
  species: 'deliciosa',
  cultivar: '',
  variegation: '',
  locationId: null,
  system: 'soil',
  potSize: 15,
  mediumId: null,
  origin: { type: null, from: '', date: null, price: null },
  parent: null,
  status: 'active',
  wish: false,
  wishNote: '',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
}

const REMOTE_EVENT = {
  id: '11111111-2222-4333-8444-555555555555',
  plantCode: 'MON-1234',
  type: 'photo',
  date: '2026-09-01T10:05:00.000Z',
  photo: { width: 1200, height: 1600 },
}

const PHOTO_PATH = `photos/2026-09/${REMOTE_EVENT.id}.jpg`

test('a photograph rides up in the same commit as the entry that points at it', async ({
  page,
}) => {
  const { state, install } = interceptGitHub(page)
  await install()

  // Photograph a plant before there is any sync at all, so the upload pass is
  // working from what this device already had rather than from a live edit.
  const code = await addPlantWithPhoto(page)
  await configureSync(page)
  await expect(page.getByText(/^Synced /)).toBeVisible()

  const photoPath = [...state.written.keys()].find((key) => key.startsWith('photos/'))
  expect(photoPath).toMatch(/^photos\/\d{4}-\d{2}\/[0-9a-f-]{36}\.jpg$/)

  // The bytes are the image itself, not JSON with an image inside it.
  const bytes = Buffer.from(state.written.get(photoPath!) ?? '', 'base64')
  expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]) // JPEG's magic number

  // And the entry that points at it went up in that very same commit — a
  // picture is never in the repo without the log that explains it.
  const eventsFile = [...state.written.keys()].find((key) => key.startsWith('events/'))
  expect(state.written.get(eventsFile!)).toContain('"type": "photo"')
  expect(state.commits).toBe(1)
  expect(code).toMatch(/^[A-Z0-9]{3}-[0-9A-F]{4}$/)
})

test('a photograph the other device took is pulled down and shown', async ({ page }) => {
  const b64 = (value: unknown) =>
    Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64')

  const { state, install } = interceptGitHub(page, {
    'meta.json': JSON.stringify({
      content: b64({ format: 'florarithm', version: 3, vocab: [] }),
      sha: 'm',
    }),
    'plants.json': JSON.stringify({ content: b64([REMOTE_PLANT]), sha: 'p' }),
    events: JSON.stringify([{ name: '2026-09.json', sha: 'e', type: 'file' }]),
    'events/2026-09.json': JSON.stringify({ content: b64([REMOTE_EVENT]), sha: 'e' }),
    [PHOTO_PATH]: JSON.stringify({ content: png(1200, 1600).toString('base64'), sha: 'j' }),
  })
  await install()

  await configureSync(page)
  await expect(page.getByText(/^Synced /)).toBeVisible()

  // It asked for exactly the file the event's id and date point at — nothing
  // was listed or searched for to find it.
  expect(state.requested).toContain(PHOTO_PATH)

  await page.goto(`#p=${REMOTE_PLANT.code}`)
  await expect(page.getByRole('img', { name: /Gruyère, photographed/ })).toBeVisible()
})
