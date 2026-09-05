/**
 * Offline, at the level this harness can honestly observe.
 *
 * What is proven here: with every network request failing, the service worker
 * answers for the shell, the JavaScript and the stylesheet out of its cache —
 * which is the whole mechanism a cold offline start depends on.
 *
 * What is NOT proven here: the browser's own navigation plumbing. Playwright's
 * offline emulation does not reliably reach a service worker on a cross-document
 * navigation in either engine, so a test of that would be measuring the driver.
 * Airplane mode on the actual phone is the check for that, and it is on the
 * hand-verification list rather than pretended at in CI.
 *
 * Chromium, because it is the engine whose offline emulation gets far enough to
 * be useful. The worker's logic is engine-agnostic.
 */

import { expect, test } from '@playwright/test'

test('the worker serves the whole app from cache with the network down', async ({
  page,
  context,
}) => {
  await page.goto('#new')

  // Let the worker install, precache the shell and take control.
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
    timeout: 15_000,
  })

  await context.setOffline(true)

  const served = await page.evaluate(async () => {
    const wanted = [
      new URL('./', location.href).toString(),
      ...Array.from(document.querySelectorAll('script[src]'), (s) => (s as HTMLScriptElement).src),
      ...Array.from(
        document.querySelectorAll('link[rel="stylesheet"]'),
        (l) => (l as HTMLLinkElement).href,
      ).filter((href) => href.startsWith(location.origin)),
    ]

    return Promise.all(
      wanted.map(async (url) => {
        try {
          return { url, status: (await fetch(url)).status }
        } catch (error) {
          return { url, status: String(error) }
        }
      }),
    )
  })

  expect(served.length).toBeGreaterThanOrEqual(3)
  for (const resource of served) {
    expect(resource.status, `${resource.url} was not served from cache`).toBe(200)
  }

  await context.setOffline(false)
})
