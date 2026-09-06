/**
 * The app, end to end, against the production build.
 *
 * These are the acceptance criteria from the build plan, in order of how much
 * it would hurt to get them wrong. The first one is the whole idea of the app:
 * tap the sticker, land on the plant, log a watering with one tap.
 */

import { expect, test, type Page } from '@playwright/test'

/** Add a plant through the interface and hand back the code it was given.
 *  `species` is "Genus epithet", split across the two fields. */
async function addPlant(page: Page, species: string, name: string, place = 'Living room') {
  await page.goto('#new')
  const [genus, ...rest] = species.split(' ')
  await page.getByLabel('Genus').fill(genus ?? '')
  await page.getByLabel('Species', { exact: true }).fill(rest.join(' '))
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByLabel('Place').fill(place)
  await page.getByRole('button', { name: 'Add to the collection' }).click()

  await expect(page.getByRole('heading', { name })).toBeVisible()

  const code = new URL(page.url()).hash.replace('#p=', '')
  expect(code).toMatch(/^[A-Z0-9]{3}-[0-9A-F]{4}$/)
  return code
}

/** Log a watering the way the viewport offers it. A phone fans the dial open
 *  and takes one of its options; a desktop has no dial and reaches the same
 *  three things through the overflow menu and the sheet. */
async function logFromDial(page: Page, option: 'Watered' | 'Watered with fertiliser') {
  const dial = page.getByRole('button', { name: 'Log activity' })
  if (await dial.isVisible()) {
    await dial.click()
    await page.getByRole('button', { name: option, exact: true }).click()
    return
  }

  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Log activity' }).click()
  const inSheet = option === 'Watered' ? 'Water' : 'Fertiliser'
  await page.getByRole('button', { name: inSheet, exact: true }).click()
}

/** Drag a history row far enough left to open its delete, then take it. The
 *  row itself carries the pointer handlers, three levels above its title. */
async function removeEntry(page: Page, title: string, deleteName: RegExp) {
  const row = main(page).getByText(title, { exact: true }).first().locator('../../..')
  const box = await row.boundingBox()
  if (!box) throw new Error(`no row to drag for ${title}`)

  // A phone drags the row open; a desktop reveals the same action on hover.
  const y = box.y + box.height / 2
  await row.hover()
  await page.mouse.move(box.x + box.width - 24, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width - 70, y)
  await page.mouse.move(box.x + box.width - 140, y)
  await page.mouse.up()

  await page.getByRole('button', { name: deleteName }).filter({ visible: true }).click()
}

/** A phone tabs between care and history; a desktop shows both at once and has
 *  no tabs to click. */
async function openHistory(page: Page) {
  const tab = page.getByRole('tab', { name: 'history' })
  if (await tab.isVisible()) await tab.click()
}

/** The nav says "Today" too, so anything about a date is scoped to the page. */
function main(page: Page) {
  return page.getByRole('main')
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

  // The drop on a phone, the overflow menu on a desktop: whichever this
  // viewport offers, it is the way to log something.
  const dial = page.getByRole('button', { name: 'Log activity' })
  const action = (await dial.isVisible()) ? dial : page.getByRole('button', { name: 'More' })
  await expect(action).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Gruyère' })).toBeVisible()

  // "In view" is the point — it must not need a scroll.
  const box = await action.boundingBox()
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

test('watering is the dial and one option, with no confirmation', async ({ page }) => {
  const code = await addPlant(page, 'Monstera deliciosa', 'Gruyère')
  await page.goto(`#p=${code}`)

  await expect(main(page).getByText('never').first()).toBeVisible()

  await logFromDial(page, 'Watered')

  // No dialog and no save step: the card is already telling you it happened.
  await expect(main(page).getByText('today', { exact: true }).first()).toBeVisible()
})

test('fertiliser is a property of a watering, not a second entry', async ({ page }) => {
  const code = await addPlant(page, 'Monstera deliciosa', 'Gruyère')
  await page.goto(`#p=${code}`)

  await logFromDial(page, 'Watered with fertiliser')

  // Both facts move, because both happened, and there is one row for them.
  await expect(main(page).getByText('Last watered')).toBeVisible()
  await expect(main(page).getByText('today', { exact: true })).toHaveCount(2)

  await openHistory(page)
  await expect(page.getByText('with fertiliser')).toBeVisible()
  await expect(page.getByText('1 entry')).toBeVisible()
})

test('a logged watering survives a reload', async ({ page }) => {
  const code = await addPlant(page, 'Anthurium crystallinum', 'Fluweel')
  await page.goto(`#p=${code}`)
  await logFromDial(page, 'Watered')
  await expect(main(page).getByText('today', { exact: true }).first()).toBeVisible()

  await page.reload()
  await expect(main(page).getByText('today', { exact: true }).first()).toBeVisible()
})

test('a history entry is removed by dragging it out of the way', async ({ page }) => {
  const code = await addPlant(page, 'Hoya carnosa', 'Was')
  await page.goto(`#p=${code}`)
  await logFromDial(page, 'Watered')

  await openHistory(page)
  await expect(page.getByText('1 entry')).toBeVisible()

  // There is no undo bar behind this any more, so the gesture has to be
  // deliberate: a drag past the halfway point, and then the button under it.
  await removeEntry(page, 'Water', /^Delete water/)
  await expect(page.getByText('Nothing logged yet')).toBeVisible()
})

test('deleting a plant forever tombstones it rather than erasing it outright', async ({ page }) => {
  const code = await addPlant(page, 'Hoya carnosa', 'Weg')
  await page.goto(`#p=${code}`)
  await logFromDial(page, 'Watered')

  await page.goto(`#edit/${code}`)
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Delete this plant' }).click()

  // Gone from the collection...
  await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No plants yet' })).toBeVisible()

  // ...and its old code reads exactly like one that never existed, not a
  // crash or a page that half-shows the deleted record.
  await page.goto(`#p=${code}`)
  await expect(page.getByText('No plant with this code')).toBeVisible()
})

test('promoting a wish keeps its code, its name and its history', async ({ page }) => {
  await page.goto('#new/wish')
  await page.getByLabel('Genus').fill('Philodendron')
  await page.getByLabel('Species', { exact: true }).fill('spiritus-sancti')
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
  // The care card only exists for a plant you actually have.
  await expect(main(page).getByText('Last watered')).toBeVisible()

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

  await logFromDial(page, 'Watered')
  await expect(main(page).getByText('today', { exact: true }).first()).toBeVisible()

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
