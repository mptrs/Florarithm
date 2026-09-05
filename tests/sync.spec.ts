/**
 * Sync against a fake GitHub, end to end through the real UI.
 *
 * `api.github.com` is intercepted rather than hit for real — this proves the
 * app's own behaviour (bootstrapping an empty repo, surfacing a revoked
 * token) without depending on a real private repo or a real token existing
 * in CI. The real `Florarithm-db` repo is for the manual check instead.
 */

import { expect, test, type Page, type Route } from '@playwright/test'

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

test.beforeEach(async ({ page }) => {
  await page.goto('')
  await clearDatabase(page)
  await page.reload()
})

test('a completely empty repo bootstraps on the first sync', async ({ page }) => {
  const puts: string[] = []

  await page.route('https://api.github.com/**', async (route: Route) => {
    const request = route.request()
    if (request.method() === 'GET') {
      await route.fulfill({ status: 404, body: '{}' })
    } else if (request.method() === 'PUT') {
      const path = new URL(request.url()).pathname.split('/contents/')[1]
      puts.push(path ?? '')
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
