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

/**
 * Log a watering the way the viewport offers it.
 *
 * A phone fans the drop open and takes one of its three options. A desktop
 * has no drop — it waters straight from the split button's primary segment,
 * or reaches fertiliser behind its caret.
 */
async function logFromDial(page: Page, option: 'Watered' | 'Watered with fertiliser') {
  const dial = page.getByRole('button', { name: 'Log activity' })
  if (await dial.isVisible()) {
    await dial.click()
    await page.getByRole('button', { name: option, exact: true }).click()
    return
  }

  if (option === 'Watered') {
    await page.getByRole('button', { name: 'Water', exact: true }).click()
    return
  }
  await page.getByRole('button', { name: 'More ways to log' }).click()
  await page.getByRole('menuitem', { name: option, exact: true }).click()
}

/** The sheet of everything that is not a plain watering. */
async function openLogSheet(page: Page) {
  const dial = page.getByRole('button', { name: 'Log activity' })
  if (await dial.isVisible()) {
    await dial.click()
    await page.getByRole('button', { name: 'Log something else' }).click()
    return
  }
  await page.getByRole('button', { name: 'More ways to log' }).click()
  await page.getByRole('menuitem', { name: 'Log something else', exact: true }).click()
}

/** Attach a picture and file it as an entry of its own. */
async function addPhoto(page: Page, buffer: Buffer, name = 'plant.png') {
  await openLogSheet(page)
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add a photo' }).click()
  await (await chooser).setFiles({ name, mimeType: 'image/png', buffer })
  // The attached-photo chip is also called "Photo"; the action is the later one.
  await page.getByRole('button', { name: 'Photo', exact: true }).last().click()
}

/**
 * Drag a history row far enough left to open its delete, then take it.
 *
 * Matched on the layer SwipeRow makes draggable rather than by walking up from
 * the title: the plant page has a Water button of its own now, so the title is
 * no longer unique and `getByText('Water').first()` found that button instead.
 * Going in through the delete does not work either — it is out of the
 * accessibility tree until the row is open, which is the thing being tested.
 */
async function removeEntry(page: Page, title: string, deleteName: RegExp) {
  const row = main(page).locator('div.relative.bg-surface').filter({ hasText: title }).first()

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

/**
 * Which of the two readings this run is looking at.
 *
 * Both list screens collapse by breakpoint rather than by prop, and the place
 * is the one fact whose presence differs: `lg` has a column for it, a phone
 * does not and does without. This suite runs at both sizes, so the assertion
 * has to know which one it is in. 1024 is Tailwind's `lg`.
 */
function isWide(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= 1024
}

/**
 * Whether a row is showing the room, at whichever width this run is.
 *
 * Visibility rather than text, because collapsing by breakpoint means the
 * desktop Place cell is in the DOM on a phone too, merely `display: none` —
 * `toContainText` reads straight through that and would pass a row nobody can
 * see the place in.
 */
async function expectPlaceShown(page: Page, name: RegExp, place: string) {
  const cell = main(page).getByRole('link', { name }).getByText(place, { exact: true })
  if (isWide(page)) await expect(cell).toBeVisible()
  else await expect(cell).toBeHidden()
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

  // The drop on a phone, the split button's primary segment on a desktop:
  // whichever this viewport offers, it is the way to log something.
  const dial = page.getByRole('button', { name: 'Log activity' })
  const action = (await dial.isVisible()) ? dial : page.getByRole('button', { name: 'Water', exact: true })
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

test('the split button caret closes on an outside click, hover and all', async ({ page }) => {
  const code = await addPlant(page, 'Monstera deliciosa', 'Gruyère')
  await page.goto(`#p=${code}`)

  const caret = page.getByRole('button', { name: 'More ways to log' })
  // Mobile has no split button — the fan covers this ground instead, with
  // its own long-standing scrim.
  if (!(await caret.isVisible())) return

  // Opened by hovering onto the caret and clicking it without moving away
  // first — the pointer is still resting there the instant the menu mounts,
  // which is exactly when `lift`'s hover transform is live on the pill
  // beneath it.
  await caret.hover()
  await caret.click()
  const closeOverlay = page.getByRole('button', { name: 'Close menu' })
  await expect(closeOverlay).toBeVisible()

  // The structural check: a `transform` on an ancestor of a `position: fixed`
  // element becomes that element's containing block, so if `lift` still sat on
  // an ancestor of this overlay, its box would shrink from the viewport down
  // to the pill's own ~140×48 footprint the moment the pointer rests on it —
  // and a click anywhere else would then miss it entirely, leaving the menu
  // stuck open. Asserting the overlay's own box, with the pointer still on the
  // button that opened it, catches that directly rather than racing a CSS
  // transition that may or may not have settled by the time a click lands.
  const overlayBox = await closeOverlay.boundingBox()
  const viewport = page.viewportSize()
  expect(overlayBox).toMatchObject({ x: 0, y: 0, width: viewport?.width, height: viewport?.height })

  // And, unhurried, a real click elsewhere does close it — a raw coordinate
  // rather than a locator's `.click()`, since Playwright's own actionability
  // check refuses to click a target it can see is obscured, so clicking the
  // heading *by locator* would just wait forever for the overlay to stop
  // covering it. `page.mouse.click` fires at the point instead, the way a
  // real click always lands on whatever is topmost there.
  await page.mouse.click(30, 30)
  await expect(page.getByRole('menu')).toBeHidden()
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

test('a plant takes water once a day, and a second press folds into the first', async ({
  page,
}) => {
  const code = await addPlant(page, 'Calathea orbifolia', 'Olga')
  await page.goto(`#p=${code}`)

  await logFromDial(page, 'Watered')
  await logFromDial(page, 'Watered')

  // Watering something twice in one day is still one watering.
  await openHistory(page)
  await expect(page.getByText('1 entry')).toBeVisible()
  await expect(page.getByText('with fertiliser')).toHaveCount(0)

  // Fertiliser went into the water that was already given, so it amends that
  // entry rather than standing beside it.
  await logFromDial(page, 'Watered with fertiliser')
  await expect(page.getByText('1 entry')).toBeVisible()
  await expect(page.getByText('with fertiliser')).toBeVisible()

  // And pressing water afterwards restates it as plain water: the last press
  // is the correction, so a mis-tap is fixable without editing the row.
  await logFromDial(page, 'Watered')
  await expect(page.getByText('1 entry')).toBeVisible()
  await expect(page.getByText('with fertiliser')).toHaveCount(0)
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
  await page.getByRole('button', { name: 'Delete this plant for good' }).click()
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

test('a hybrid is recorded as a cross, not as a cultivar', async ({ page }) => {
  await page.goto('#new')
  await page.getByLabel('Genus').fill('Anthurium')
  await page.getByLabel('Species', { exact: true }).fill('crystallinum')

  // The field is behind a switch, because most plants are not hybrids.
  await expect(page.getByLabel('Cross')).toBeHidden()
  await page.getByRole('switch', { name: 'This is a hybrid' }).click()

  // A plant is a species or it is a cross, so the species empties and stays
  // out of reach rather than sitting there contradicting the cross.
  await expect(page.getByLabel('Species', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Species', { exact: true })).toBeDisabled()

  // Typing a plain x is what the keyboard offers; the field makes it a ×.
  await page.getByLabel('Cross').fill('papillilaminum x crystallinum')
  await expect(page.getByLabel('Cross')).toHaveValue('papillilaminum × crystallinum')

  await page.getByLabel('Name', { exact: true }).fill('Vlek')
  await page.getByLabel('Place').fill('Living room')
  await page.getByRole('button', { name: 'Add to the collection' }).click()

  // No quotes anywhere: nobody registered this variety.
  await expect(page.getByText('Anthurium papillilaminum × crystallinum')).toBeVisible()

  // And it is findable by the parent, typed with the character on the keyboard.
  await page.goto('#collection')
  await page.getByPlaceholder('Name, species or place').fill('papillilaminum x cry')
  await expect(page.getByRole('link', { name: /Vlek/ })).toBeVisible()
})

test('the hybrid switch comes back on for a plant that has a cross', async ({ page }) => {
  await page.goto('#new')
  await page.getByLabel('Genus').fill('Anthurium')
  await page.getByRole('switch', { name: 'This is a hybrid' }).click()
  await page.getByLabel('Cross').fill('warocqueanum × papillilaminum')
  await page.getByLabel('Name', { exact: true }).fill('Koningin')
  await page.getByLabel('Place').fill('Living room')
  await page.getByRole('button', { name: 'Add to the collection' }).click()
  await expect(page.getByRole('heading', { name: 'Koningin' })).toBeVisible()

  const code = new URL(page.url()).hash.replace('#p=', '')
  await page.goto(`#edit/${code}`)

  // Nothing stores the switch — it is read back off the cross itself.
  await expect(page.getByRole('switch', { name: 'This is a hybrid' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.getByLabel('Cross')).toHaveValue('warocqueanum × papillilaminum')

  // Turning it off drops the cross rather than hiding it while still set.
  await page.getByRole('switch', { name: 'This is a hybrid' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: 'Koningin' })).toBeVisible()
  await expect(page.getByText('warocqueanum')).toBeHidden()
})

test('promoting a wish keeps its code and its history', async ({ page }) => {
  await page.goto('#new/wish')
  await page.getByLabel('Genus').fill('Philodendron')
  await page.getByLabel('Species', { exact: true }).fill('spiritus-sancti')
  await page.getByLabel('Note').fill('One day')
  // A wish is the species and a note, nothing else: there is no name field
  // here, so the name it carries is the one its species makes.
  await page.getByRole('button', { name: 'Add to wishlist' }).click()

  // Saving a wish returns to the Wishlist it was added from — it has no
  // detail page of its own to land on instead.
  await expect(page.getByRole('heading', { name: 'Wishlist' })).toBeVisible()
  const addLink = page.getByRole('link', { name: 'Add to collection' })
  await expect(addLink).toBeVisible()

  // The row's own link carries the wish's code; that link is the one way
  // from here into the collection.
  const code = new URL(await addLink.getAttribute('href') as string, page.url()).hash.replace(
    '#have/',
    '',
  )
  expect(code).toMatch(/^[A-Z0-9]{3}-[0-9A-F]{4}$/)

  // A wish has no name of its own — the species is all it carries until you
  // own it, so naming it is part of taking it into the collection.
  await addLink.click()

  // Promoting is the first moment a name can be typed, and the form opens
  // holding the one the wish already had rather than an empty field.
  const nameField = page.getByLabel('Name', { exact: true })
  await expect(nameField).toHaveValue('Philodendron spiritus-sancti')
  await nameField.fill('Ranker')
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

  // Sorted A\u2013Z there is no label to carry it. On a desktop it moves into
  // the Place column; on a phone there is no column and it is simply not
  // shown \u2014 the sort switch is one tap away. The species is there either way.
  await expect(main(page).getByRole('link', { name: /Gruy\u00e8re/ })).toContainText(
    'Monstera deliciosa',
  )
  await expectPlaceShown(page, /Gruy\u00e8re/, 'Living room')
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

  // Thirstiest first, and with no label above the row: the place shows in the
  // desktop column and nowhere on a phone. The species is there at both.
  await expect(main(page).getByRole('link', { name: /Gruy\u00e8re/ })).toContainText(
    'Monstera deliciosa',
  )
  await expectPlaceShown(page, /Gruy\u00e8re/, 'Living room')

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

test('a dormant plant stays on the shelf, asleep rather than archived', async ({ page }) => {
  const code = await addPlant(page, 'Caladium bicolor', 'Winter', 'Bedroom')

  await page.goto(`#edit/${code}`)
  await page.getByLabel('Status').selectOption('dormant')
  await page.getByRole('button', { name: 'Save' }).click()

  // The plant page says it is asleep without saying it is gone.
  await expect(main(page).getByRole('img', { name: 'Dormant' })).toBeVisible()

  await page.goto('#collection')
  // Still in the collection, unfiltered — not behind the archive word.
  await expect(main(page).getByRole('link', { name: /Winter/ })).toBeVisible()
  await expect(main(page).getByRole('img', { name: 'Dormant' }).first()).toBeVisible()

  // And out of the list you water from.
  await page.goto('#today')
  await expect(main(page).getByRole('link', { name: /Winter/ })).toBeHidden()
})

test('a new screen starts at its top, not where the last one was left', async ({ page }) => {
  await addPlant(page, 'Monstera deliciosa', 'Gruy\u00e8re', 'Living room')

  // Settings is the one screen long enough to scroll at either size.
  await page.goto('#settings')
  await page.evaluate(() => window.scrollTo(0, 400))
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  // A real click on the nav, not page.goto: a browser navigation would not
  // exercise the thing under test.
  await page.getByRole('link', { name: 'Collection' }).first().click()
  await expect(page).toHaveURL(/#collection/)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

test('going back puts you where you were', async ({ page }) => {
  // Only observable on a phone. The desktop sidebar sits in normal flow, so
  // reaching the nav from halfway down a screen means scrolling up to it
  // first — by the time the link is clicked the page is already at its top,
  // and there is no position left to restore.
  test.skip(isWide(page), 'the desktop nav cannot be reached from a scrolled page')

  await addPlant(page, 'Monstera deliciosa', 'Gruy\u00e8re', 'Living room')

  await page.goto('#settings')
  await page.evaluate(() => window.scrollTo(0, 400))
  const parked = await page.evaluate(() => window.scrollY)

  await page.getByRole('link', { name: 'Collection' }).first().click()
  await expect(page).toHaveURL(/#collection/)

  await page.goBack()
  await expect(page).toHaveURL(/#settings/)
  // Polled: the screen has to mount before the offset is reachable, and
  // WebKit puts the page back at 0 after the handler has already run.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(parked)
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

/** Photograph the plant, which is now one of the things the sheet logs. */
async function addPhotoFromHero(page: Page, buffer: Buffer) {
  await addPhoto(page, buffer, 'shot.png')
}

test('a photograph becomes the plant, and is shrunk on the way in', async ({ page }) => {
  const code = await addPlant(page, 'Monstera deliciosa', 'Gruyère')
  await page.goto(`#p=${code}`)

  const photo = page.getByRole('img', { name: /Gruyère, photographed/ })
  await expect(photo).toBeHidden()

  await addPhoto(page, png(2400, 1200), 'gruyere.png')

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
  await openLogSheet(page)

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

test('a photo on a second watering follows the entry it folds into', async ({ page }) => {
  const code = await addPlant(page, 'Monstera deliciosa', 'Gruyère')
  await page.goto(`#p=${code}`)

  // Today's watering already exists, so the press below has to fold into it.
  await logFromDial(page, 'Watered')

  await openLogSheet(page)

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add a photo' }).click()
  await (await chooser).setFiles({
    name: 'wet.png',
    mimeType: 'image/png',
    buffer: png(1200, 1600),
  })
  await page.getByRole('dialog').getByRole('button', { name: 'Water', exact: true }).click()

  // Still one watering — and the picture came with it. Photographs are filed
  // under an event id, so the bytes have to move to the entry that stands or
  // the row promises a picture that never loads.
  await openHistory(page)
  await expect(page.getByText('1 entry')).toBeVisible()
  await expect(main(page).getByRole('img', { name: /Photographed/ })).toBeVisible()
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
