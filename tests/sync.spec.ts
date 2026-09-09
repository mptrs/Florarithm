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

test.beforeEach(async ({ page }) => {
  await page.goto('')
  await clearDatabase(page)
  await page.reload()
})

test('a completely empty repo bootstraps on the first sync', async ({ page }) => {
  const puts: string[] = []

  await page.route('https://api.github.com/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (request.method() === 'GET' && path === '/repos/test-owner/test-repo') {
      // `default_branch` exists from repo creation, before any commit —
      // this is what lets a `PUT contents` create the very first one.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ default_branch: 'main' }),
      })
    } else if (request.method() === 'GET') {
      await route.fulfill({ status: 404, body: '{}' })
    } else if (request.method() === 'PUT') {
      const contentsPath = path.split('/contents/')[1]
      puts.push(contentsPath ?? '')
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ content: { sha: `sha-${puts.length}` } }),
      })
    } else {
      await route.fulfill({ status: 404, body: '{}' })
    }
  })

  await configureSync(page)

  await expect(page.getByText(/^Synced /)).toBeVisible()
  expect(puts.sort()).toEqual(['meta.json', 'plants.json'])
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

function json(body: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify(body) }
}

test('a photograph taken here is pushed as its own file', async ({ page }) => {
  const puts = new Map<string, string>()

  await page.route('https://api.github.com/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (request.method() === 'GET' && path === '/repos/test-owner/test-repo') {
      await route.fulfill(json({ default_branch: 'main' }))
    } else if (request.method() === 'GET') {
      await route.fulfill({ status: 404, body: '{}' })
    } else if (request.method() === 'PUT') {
      const contentsPath = path.split('/contents/')[1] ?? ''
      const body = request.postDataJSON() as { content: string }
      puts.set(contentsPath, body.content)
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ content: { sha: 'sha' } }) })
    } else {
      await route.fulfill({ status: 404, body: '{}' })
    }
  })

  // Photograph a plant before there is any sync at all, so the upload pass is
  // working from what this device already had rather than from a live edit.
  const code = await addPlantWithPhoto(page)
  await configureSync(page)
  await expect(page.getByText(/^Synced /)).toBeVisible()

  const photoPath = [...puts.keys()].find((key) => key.startsWith('photos/'))
  expect(photoPath).toMatch(/^photos\/\d{4}-\d{2}\/[0-9a-f-]{36}\.jpg$/)

  // The bytes are the image itself, not JSON with an image inside it.
  const bytes = Buffer.from(puts.get(photoPath!) ?? '', 'base64')
  expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]) // JPEG's magic number

  // And the entry that points at it went up as an ordinary event.
  const eventsFile = [...puts.keys()].find((key) => key.startsWith('events/'))
  expect(Buffer.from(puts.get(eventsFile!) ?? '', 'base64').toString()).toContain('"type": "photo"')
  expect(code).toMatch(/^[A-Z0-9]{3}-[0-9A-F]{4}$/)
})

test('a photograph the other device took is pulled down and shown', async ({ page }) => {
  const requested: string[] = []

  await page.route('https://api.github.com/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const contentsPath = path.split('/contents/')[1] ?? ''

    if (request.method() === 'PUT') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ content: { sha: 'sha' } }) })
      return
    }
    if (path === '/repos/test-owner/test-repo') {
      await route.fulfill(json({ default_branch: 'main' }))
      return
    }

    requested.push(contentsPath)

    if (contentsPath === 'meta.json') {
      await route.fulfill(json({ content: Buffer.from(JSON.stringify({ format: 'florarithm', version: 3, vocab: [] })).toString('base64'), sha: 'm' }))
    } else if (contentsPath === 'plants.json') {
      await route.fulfill(json({ content: Buffer.from(JSON.stringify([REMOTE_PLANT])).toString('base64'), sha: 'p' }))
    } else if (contentsPath === 'events') {
      await route.fulfill(json([{ name: '2026-09.json', sha: 'e', type: 'file' }]))
    } else if (contentsPath === 'events/2026-09.json') {
      await route.fulfill(json({ content: Buffer.from(JSON.stringify([REMOTE_EVENT])).toString('base64'), sha: 'e' }))
    } else if (contentsPath === PHOTO_PATH) {
      await route.fulfill(json({ content: png(1200, 1600).toString('base64'), sha: 'j' }))
    } else {
      await route.fulfill({ status: 404, body: '{}' })
    }
  })

  await configureSync(page)
  await expect(page.getByText(/^Synced /)).toBeVisible()

  // It asked for exactly the file the event's id and date point at — nothing
  // was listed or searched for to find it.
  expect(requested).toContain(PHOTO_PATH)

  await page.goto(`#p=${REMOTE_PLANT.code}`)
  await expect(page.getByRole('img', { name: /Gruyère, photographed/ })).toBeVisible()
})
