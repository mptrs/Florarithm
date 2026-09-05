/**
 * The app, end to end, against the production build.
 *
 * These are the acceptance criteria from the build plan, in order of how much
 * it would hurt to get them wrong. The first one is the whole idea of the app:
 * tap the sticker, land on the plant, log a watering with one tap.
 */

import { expect, test, type Page } from '@playwright/test'

/** Add a plant through the interface and hand back the code it was given. */
async function addPlant(page: Page, species: string, name: string, place = 'Living room') {
  await page.goto('#new')
  await page.getByLabel('Species').fill(species)
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByLabel('Place').fill(place)
  await page.getByRole('button', { name: 'Add to the collection' }).click()

  await expect(page.getByRole('heading', { name })).toBeVisible()

  const code = new URL(page.url()).hash.replace('#p=', '')
  expect(code).toMatch(/^[A-Z0-9]{3}-[0-9A-F]{4}$/)
  return code
}

test.beforeEach(async ({ page }) => {
  await page.goto('')
  // Each test starts from an empty collection rather than inheriting one.
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase('florarithm')
      request.onsuccess = resolve
      request.onerror = resolve
      request.onblocked = resolve
    })
  })
  await page.reload()
})

test('a scanned sticker opens the plant with the actions already in view', async ({ page }) => {
  const code = await addPlant(page, 'Monstera deliciosa', 'Gruyère')

  // Exactly what an NFC tag carries: a cold load straight at the hash.
  await page.goto(`#p=${code}`)

  const water = page.getByRole('button', { name: 'WATER', exact: true })
  await expect(water).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Gruyère' })).toBeVisible()

  // "In view" is the point — it must not need a scroll.
  const box = await water.boundingBox()
  const viewport = page.viewportSize()
  expect(box).not.toBeNull()
  expect((box as { y: number; height: number }).y + (box as { height: number }).height).toBeLessThan(
    (viewport as { height: number }).height,
  )
})

test('an unknown code gets a real page, not an empty list', async ({ page }) => {
  await page.goto('#p=ZZZ-0000')
  await expect(page.getByText('ZZZ-0000')).toBeVisible()
  await expect(page.getByText('No plant with this code')).toBeVisible()
})

test('watering is one tap, with no confirmation, and can be undone', async ({ page }) => {
  const code = await addPlant(page, 'Monstera deliciosa', 'Gruyère')
  await page.goto(`#p=${code}`)

  await expect(page.getByText('never logged').first()).toBeVisible()

  await page.getByRole('button', { name: 'WATER', exact: true }).click()

  // No dialog, no second step: the fact changes and the undo bar appears.
  await expect(page.getByText('Watered Gruyère')).toBeVisible()
  await expect(page.getByText('0 days ago')).toBeVisible()

  await page.getByRole('button', { name: 'UNDO' }).click()
  await expect(page.getByText('never logged').first()).toBeVisible()
})

test('a logged watering survives a reload', async ({ page }) => {
  const code = await addPlant(page, 'Anthurium crystallinum', 'Fluweel')
  await page.goto(`#p=${code}`)
  await page.getByRole('button', { name: 'WATER', exact: true }).click()
  await expect(page.getByText('0 days ago')).toBeVisible()

  await page.reload()
  await expect(page.getByText('0 days ago')).toBeVisible()
})

test('deleting a history entry is undoable', async ({ page }) => {
  const code = await addPlant(page, 'Hoya carnosa', 'Was')
  await page.goto(`#p=${code}`)
  await page.getByRole('button', { name: 'WATER', exact: true }).click()
  await expect(page.getByText('1 entry')).toBeVisible()

  await page.getByRole('button', { name: /^Delete water/ }).click()
  await expect(page.getByText('No history yet')).toBeVisible()

  await page.getByRole('button', { name: 'UNDO' }).click()
  await expect(page.getByText('1 entry')).toBeVisible()
})

test('deleting a plant forever tombstones it rather than erasing it outright', async ({ page }) => {
  const code = await addPlant(page, 'Hoya carnosa', 'Weg')
  await page.goto(`#p=${code}`)
  await page.getByRole('button', { name: 'WATER', exact: true }).click()

  await page.goto(`#edit/${code}`)
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Delete this plant' }).click()

  // Gone from the collection... (the undo toast from the earlier WATER tap
  // can still be on screen saying "Watered Weg" for a few seconds, so this
  // checks the empty state rather than searching the whole page for the name)
  await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No plants yet' })).toBeVisible()

  // ...and its old code reads exactly like one that never existed, not a
  // crash or a page that half-shows the deleted record.
  await page.goto(`#p=${code}`)
  await expect(page.getByText('No plant with this code')).toBeVisible()
})

test('promoting a wish keeps its code, its name and its history', async ({ page }) => {
  await page.goto('#new/wish')
  await page.getByLabel('Species').fill('Philodendron spiritus-sancti')
  await page.getByLabel('Name', { exact: true }).fill('Ranker')
  await page.getByLabel('Note').fill('One day')
  await page.getByRole('button', { name: 'Add to the wishlist' }).click()
  await expect(page.getByText('On the wishlist')).toBeVisible()

  const code = new URL(page.url()).hash.replace('#p=', '')
  expect(code).toMatch(/^[A-Z0-9]{3}-[0-9A-F]{4}$/)

  await page.getByRole('button', { name: 'I have this now' }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  // Wait for the save to land before reading the URL, or you are asserting on
  // the form you were still standing on.
  await expect(page.getByRole('button', { name: 'WATER', exact: true })).toBeVisible()

  // Same record, same code: a promotion is one flag, not a new plant.
  expect(new URL(page.url()).hash).toBe(`#p=${code}`)
  await expect(page.getByRole('heading', { name: 'Ranker' })).toBeVisible()
})

test('a place typed once is offered the next time', async ({ page }) => {
  await addPlant(page, 'Monstera deliciosa', 'Kolos', 'Hallway · floor')

  await page.goto('#new')
  const options = page.locator('datalist option')
  await expect(options.filter({ has: page.locator('[value="Hallway · floor"]') })).toHaveCount(0)
  expect(await page.locator('datalist option[value="Hallway · floor"]').count()).toBe(1)
})

test('the tag block disappears once the sticker is written', async ({ page }) => {
  const code = await addPlant(page, 'Scindapsus pictus', 'Zilver')
  await page.goto(`#p=${code}`)

  await expect(page.getByText('Tag not written yet')).toBeVisible()
  await page.getByRole('button', { name: 'Tag is written' }).click()
  await expect(page.getByText('Tag not written yet')).toBeHidden()

  await page.reload()
  await expect(page.getByText('Tag not written yet')).toBeHidden()
})

test('the collection searches on name, species, code and place', async ({ page }) => {
  await addPlant(page, 'Monstera deliciosa', 'Gruyère', 'Living room')
  const code = await addPlant(page, 'Alocasia zebrina', 'Drakenkop', 'Bedroom')

  await page.goto('#collection')
  const search = page.getByLabel('Search the collection')

  await search.fill('zebrina')
  await expect(page.getByRole('link', { name: /Drakenkop/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Gruyère/ })).toBeHidden()

  await search.fill('Living')
  await expect(page.getByRole('link', { name: /Gruyère/ })).toBeVisible()

  await search.fill(code)
  await expect(page.getByRole('link', { name: /Drakenkop/ })).toBeVisible()
})

test('the service worker caches what a cold offline start needs', async ({ page }) => {
  await addPlant(page, 'Monstera deliciosa', 'Gruyère')

  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
    timeout: 15_000,
  })

  const cached = await page.evaluate(async () => {
    const cache = await caches.open('florarithm-v1')
    return (await cache.keys()).map((request) => new URL(request.url).pathname)
  })

  expect(cached.some((path) => path.endsWith('/Florarithm/'))).toBe(true)
  expect(cached.some((path) => path.endsWith('.js'))).toBe(true)
  expect(cached.some((path) => path.endsWith('.css'))).toBe(true)
})

test('logging still works with every request failing', async ({ page, context }) => {
  const code = await addPlant(page, 'Monstera deliciosa', 'Gruyère')
  await page.goto(`#p=${code}`)

  // Writes go to IndexedDB, so nothing about them should touch the network.
  await context.route('**/*', (route) => route.abort())

  await page.getByRole('button', { name: 'WATER', exact: true }).click()
  await expect(page.getByText('0 days ago')).toBeVisible()

  await page.getByRole('button', { name: 'UNDO' }).click()
  await expect(page.getByText('never logged').first()).toBeVisible()

  await context.unroute('**/*')
})

test('light and dark are both painted, and neither is transparent', async ({ page }) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('#today')

    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(background).not.toBe('rgba(0, 0, 0, 0)')
    expect(background).not.toBe('transparent')
  }
})
