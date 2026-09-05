/**
 * Florarithm's service worker.
 *
 * Network first, cache as the safety net. The other way round — cache first —
 * serves a stale app for a day after every deploy, and there is no version
 * checker here to talk you out of it.
 *
 * The catch with network-first is that it only ever caches what it has already
 * served, so a brand-new install that loses signal before its second visit has
 * nothing to fall back on. Hence the precache on install: fetch the shell, read
 * the asset URLs straight out of it, and store those. No build-time manifest to
 * keep in step with the bundler — the shell is the manifest.
 *
 * The one cache-first exception is fonts. They are vendored and built with a
 * content hash in the filename (same as every other asset Vite emits), so a
 * given URL never changes — re-fetching it every load buys nothing and costs
 * a round trip on the path between tapping a sticker and logging a watering.
 */

const CACHE = 'florarithm-v1'
const SHELL = new URL('./', self.location).toString()

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (/\.woff2?$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(networkFirst(request))
})

/** Store the shell and everything it references, so the first offline start
 *  works even if it is also the second time the app has ever been opened. */
async function precacheShell() {
  const cache = await caches.open(CACHE)

  const response = await fetch(SHELL, { cache: 'reload' })
  if (!response.ok) return

  const html = await response.clone().text()
  await cache.put(SHELL, response)

  const assets = new Set()
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = new URL(match[1], SHELL)
    if (url.origin === self.location.origin) assets.add(url.toString())
  }

  // One at a time rather than addAll: a single missing file should not throw
  // away the whole precache.
  await Promise.all(
    Array.from(assets, async (asset) => {
      try {
        const assetResponse = await fetch(asset, { cache: 'reload' })
        if (assetResponse.ok) await cache.put(asset, assetResponse)
      } catch {
        // Offline mid-install, or a file that no longer exists. The runtime
        // cache picks it up on the next successful load.
      }
    }),
  )
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE)
      await cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) return cached

    // Every hash route is the same document, so the shell answers all of them.
    if (request.mode === 'navigate') {
      const shell = await caches.match(SHELL)
      if (shell) return shell
    }

    throw error
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE)
    await cache.put(request, response.clone())
  }
  return response
}
