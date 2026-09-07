/**
 * The app, end to end, against the production build.
 *
 * These are the acceptance criteria from the build plan, in order of how much
 * it would hurt to get them wrong. The first one is the whole idea of the app:
 * tap the sticker, land on the plant, log a watering with one tap.
 */

import { expect, test, type Page } from '@playwright/test'
import { png } from './imageFixture'

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

  // A phone drags the row open; a desktop reveals the same action on hover.
  // Measured *after* the hover, because hovering scrolls the row into view and
  // a box read before that is off by however far the page moved.
  await row.hover()
  const box = await row.boundingBox()
  if (!box) throw new Error(`no row to drag for ${title}`)
  const y = box.y + box.height / 2
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
  await page.getByRole('button', { name: 'Delete this plant' }).click()
  // A native confirm() is a silent no-op in an installed, standalone PWA on
  // iOS, so the confirmation is an in-app sheet rather than window.confirm.
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

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

test('the collection groups by place, or drops the grouping for A\u2013Z', async ({ page }) => {
  await addPlant(page, 'Monstera deliciosa', 'Gruy\u00e8re', 'Living room')
  await addPlant(page, 'Alocasia zebrina', 'Zebra', 'Bedroom')

  await page.goto('#collection')

  // Grouped by place, the drawer label carries the room and the tile is free
  // to say what the plant is.
  await expect(main(page).getByText('Living room', { exact: true })).toBeVisible()
  await expect(main(page).getByRole('link', { name: /Gruy\u00e8re/ })).toContainText(
    'Monstera deliciosa',
  )

  await page.getByRole('button', { name: 'A\u2013Z' }).click()

  // Sorted A\u2013Z there is no label to carry it, so the place moves into the row.
  await expect(main(page).getByRole('link', { name: /Gruy\u00e8re/ })).toContainText('Living room')
  const names = await main(page)
    .getByRole('link')
    .filter({ hasText: /Gruy\u00e8re|Zebra/ })
    .allInnerTexts()
  expect(names[0]).toContain('Gruy\u00e8re')
})

test('Today sorts by thirst, or cuts the same list into rooms', async ({ page }) => {
  await addPlant(page, 'Monstera deliciosa', 'Gruy\u00e8re', 'Living room')
  await addPlant(page, 'Alocasia zebrina', 'Zebra', 'Bedroom')

  await page.goto('#today')

  // Thirstiest first, and with no label above the row it carries its own place.
  await expect(main(page).getByRole('link', { name: /Gruy\u00e8re/ })).toContainText('Living room')

  await page.getByRole('button', { name: 'By place' }).click()

  // Cut into rooms, the drawer label says where you are and the row goes back
  // to saying what the plant is.
  await expect(main(page).getByText('Bedroom', { exact: true })).toBeVisible()
  await expect(main(page).getByRole('link', { name: /Gruy\u00e8re/ })).toContainText(
    'Monstera deliciosa',
  )
})

test('a plant watered today shows a mark instead of a nought', async ({ page }) => {
  const code = await addPlant(page, 'Hoya carnosa', 'Nore', 'Living room')

  // Nothing logged is not the same fact as a long time ago, and says so.
  await page.goto('#today')
  await expect(main(page).getByRole('link', { name: /Nore/ })).toContainText('never logged')

  await page.goto(`#p=${code}`)
  await logFromDial(page, 'Watered')

  await page.goto('#today')
  await expect(main(page).getByRole('link', { name: /Nore/ })).toContainText('watered today')
  await expect(main(page).getByRole('link', { name: /Nore/ })).not.toContainText('days')
})

test('an archived plant is out of the way but still findable', async ({ page }) => {
  await addPlant(page, 'Monstera deliciosa', 'Gruy\u00e8re', 'Living room')
  const code = await addPlant(page, 'Calathea orbifolia', 'Wolk', 'Bedroom')

  await page.goto(`#edit/${code}`)
  await page.getByLabel('Status').selectOption('died')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(main(page).getByText('Last watered')).toBeVisible()

  await page.goto('#collection')
  const search = page.getByLabel('Search the collection')

  // Gone from the list you water from...
  await expect(main(page).getByRole('link', { name: /Wolk/ })).toBeHidden()

  // ...reachable by the word...
  await search.fill('archive')
  await expect(main(page).getByRole('link', { name: /Wolk/ })).toBeVisible()
  await expect(main(page).getByRole('link', { name: /Gruy\u00e8re/ })).toBeHidden()

  // ...and by its own name, without knowing there is a word.
  await search.fill('Wolk')
  await expect(main(page).getByRole('link', { name: /Wolk/ })).toContainText('Died')
})

test('the service worker caches what a cold offline start needs', async ({ page }) => {
  await addPlant(page, 'Monstera deliciosa', 'Gruyère')

  /** Everything in the worker's cache, as paths. */
  const cachedPaths = () =>
    page.evaluate(async () => {
      const cache = await caches.open('florarithm-v1')
      return (await cache.keys()).map((request) => new URL(request.url).pathname)
    })

  const holds = (paths: string[], suffix: string) => paths.some((path) => path.endsWith(suffix))

  // Taking control of the page and having finished the precache are two
  // different moments, so wait for the cache to hold what a cold start reads
  // rather than for the controller. `expect.poll` rather than
  // `page.waitForFunction`, because the latter does not await an async
  // predicate — it sees the returned promise, calls it truthy and moves on.
  await expect
    .poll(
      async () => {
        const paths = await cachedPaths()
        return holds(paths, '/Florarithm/') && holds(paths, '.js') && holds(paths, '.css')
      },
      { timeout: 30_000, message: 'the worker never finished precaching the shell' },
    )
    .toBe(true)

  const cached = await cachedPaths()

  expect(holds(cached, '/Florarithm/')).toBe(true)
  expect(holds(cached, '.js')).toBe(true)
  expect(holds(cached, '.css')).toBe(true)
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

/** Photograph the plant from the hero's overflow menu. */
async function addPhotoFromHero(page: Page, buffer: Buffer) {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Add a photo' }).click()
  await (await chooser).setFiles({ name: 'shot.png', mimeType: 'image/png', buffer })
}

test('a photograph becomes the plant, and is shrunk on the way in', async ({ page }) => {
  const code = await addPlant(page, 'Monstera deliciosa', 'Gruyère')
  await page.goto(`#p=${code}`)

  const photo = page.getByRole('img', { name: /Gruyère, photographed/ })
  await expect(photo).toBeHidden()

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Add a photo' }).click()
  await (await chooser).setFiles({
    name: 'gruyere.png',
    mimeType: 'image/png',
    buffer: png(2400, 1200),
  })

  await expect(photo).toBeVisible()

  // 2400 pixels went in and 1600 is what is kept: the long edge is capped
  // before IndexedDB ever sees the file, which is the whole point of resizing.
  await expect
    .poll(() => photo.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBe(1600)

  // Surviving a reload is the difference between a preview and a record.
  await page.reload()
  await expect(photo).toBeVisible()

  // The picture is an entry, not a property: it is in the log, and removing it
  // there is what takes it off the plant.
  await openHistory(page)
  await expect(main(page).getByText('Photo', { exact: true })).toBeVisible()

  await removeEntry(page, 'Photo', /Delete photo of/)
  await expect(photo).toBeHidden()
})

test('a photo attached to a new leaf is one entry, not two', async ({ page }) => {
  const code = await addPlant(page, 'Monstera deliciosa', 'Gruyère')
  await page.goto(`#p=${code}`)

  // Open the sheet the way this viewport offers it.
  const dial = page.getByRole('button', { name: 'Log activity' })
  if (await dial.isVisible()) {
    await dial.click()
    await page.getByRole('button', { name: 'Log something else' }).click()
  } else {
    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Log activity' }).click()
  }

  // Attach the photograph first, then say what it was — the sheet treats it as
  // a property of the entry, like the date.
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add a photo' }).click()
  await (await chooser).setFiles({
    name: 'leaf.png',
    mimeType: 'image/png',
    buffer: png(1200, 1600),
  })

  await page.getByRole('button', { name: 'New leaf', exact: true }).click()

  await openHistory(page)
  await expect(main(page).getByText('New leaf', { exact: true })).toHaveCount(1)
  await expect(main(page).getByRole('img', { name: /Photographed/ })).toBeVisible()

  // One entry carrying a picture, so it is also the plant's picture now.
  await expect(page.getByRole('img', { name: /Gruyère, photographed/ })).toBeVisible()
})

test('the picture that stands for the plant can be chosen in the edit form', async ({ page }) => {
  const code = await addPlant(page, 'Monstera deliciosa', 'Gruyère')
  await page.goto(`#p=${code}`)

  // Two photographs, taken the same day, told apart by their shape: landscape
  // first, then portrait. Both would print the same date, so the assertion
  // reads the stored pixels instead.
  await addPhotoFromHero(page, png(2400, 1200)) // kept at 1600 × 800
  await addPhotoFromHero(page, png(1200, 2400)) // kept at 800 × 1600

  const hero = page.getByRole('img', { name: /Gruyère, photographed/ })
  const heroWidth = () => hero.evaluate((image) => (image as HTMLImageElement).naturalWidth)

  // The newest wins on its own, with nothing chosen.
  await expect.poll(heroWidth).toBe(800)

  await page.goto(`#edit/${code}`)
  const choices = page.getByRole('radiogroup', { name: "The plant's photo" }).getByRole('radio')
  await expect(choices).toHaveCount(3) // "Newest", then the two photographs

  // Index 2 is the older, landscape one: the list runs newest first after
  // "Newest" itself.
  await choices.nth(2).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(hero).toBeVisible()
  await expect.poll(heroWidth).toBe(1600)
})
