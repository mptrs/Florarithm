/**
 * Hash routing.
 *
 * Not a preference. An NFC sticker carries one plain `https://` URL, GitHub
 * Pages has no rewrite rules, and a deep path would cost a 404 redirect — right
 * on the critical path between tapping the pot and logging a watering. So the
 * route lives in the hash, and `#p=MON-8F3A` is the one shape that is written
 * onto physical objects and can never change.
 */

import { useSyncExternalStore } from 'react'

export type CollectionFilter = 'all' | 'hydro' | 'semi-hydro' | 'soil' | 'wishlist' | 'archive'

export const COLLECTION_FILTERS: readonly CollectionFilter[] = [
  'all',
  'hydro',
  'semi-hydro',
  'soil',
  'wishlist',
  'archive',
]

export type Route =
  | { name: 'today' }
  | { name: 'plant'; code: string }
  | { name: 'collection'; filter: CollectionFilter }
  | { name: 'new'; wish: boolean; parentCode: string | null }
  | { name: 'edit'; code: string; promote: boolean }
  | { name: 'settings' }

export const routes = {
  today: () => '#today',
  plant: (code: string) => `#p=${code}`,
  collection: (filter: CollectionFilter = 'all') =>
    filter === 'all' ? '#collection' : `#collection/${filter}`,
  /** Its own screen, so its own hash. `#collection/wishlist` still parses to
   *  the same place: a link written down before the move must not rot. */
  wishlist: () => '#wishlist',
  new: () => '#new',
  newWish: () => '#new/wish',
  newFrom: (parentCode: string) => `#new/from/${parentCode}`,
  edit: (code: string) => `#edit/${code}`,
  /** Promote a wish: the form opens with the wish flag already off. */
  have: (code: string) => `#have/${code}`,
  settings: () => '#settings',
} as const

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '')

  // The sticker shape comes first, because it is the one that has to be fast
  // and the one that can never be changed.
  if (raw.startsWith('p=')) {
    return { name: 'plant', code: raw.slice(2).toUpperCase() }
  }

  const [head, ...rest] = raw.split('/')

  switch (head) {
    case 'collection': {
      const candidate = rest[0] as CollectionFilter | undefined
      const filter = candidate && COLLECTION_FILTERS.includes(candidate) ? candidate : 'all'
      return { name: 'collection', filter }
    }
    case 'wishlist':
      return { name: 'collection', filter: 'wishlist' }
    case 'new': {
      if (rest[0] === 'wish') return { name: 'new', wish: true, parentCode: null }
      if (rest[0] === 'from' && rest[1]) {
        return { name: 'new', wish: false, parentCode: rest[1].toUpperCase() }
      }
      return { name: 'new', wish: false, parentCode: null }
    }
    case 'edit':
    case 'have':
      return rest[0]
        ? { name: 'edit', code: rest[0].toUpperCase(), promote: head === 'have' }
        : { name: 'today' }
    case 'settings':
      return { name: 'settings' }
    default:
      return { name: 'today' }
  }
}

export function navigate(hash: string): void {
  remember()
  goingForward = true
  window.location.hash = hash
}

/**
 * Whether this page has moved to a different in-app route since it loaded.
 *
 * A sticker's QR code, a shared link, a bookmark — all of them can land
 * straight on `#p=CODE` as the tab's very first navigation, with nothing
 * of ours underneath it in `history`. `history.length` alone can't tell
 * that apart from an ordinary in-app visit: the tab may already have
 * browsed elsewhere before the app ever loaded, which counts toward the
 * same number. A hash change is the one thing that only happens once this
 * app is actually choosing where to go, so it is what "back" trusts.
 */
let navigatedWithinApp = false
// Guarded rather than assumed: `parseRoute` and friends are pure enough to
// import from a plain Node test file too, which has no `window` to listen on.
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    navigatedWithinApp = true
  })
}

/** True once `history.back()` is guaranteed to land on an earlier route of
 *  this app, rather than wherever the tab was before it loaded here. */
export function canGoBack(): boolean {
  return navigatedWithinApp
}

/* ---------------------------------------------------------------------------
   Where a new screen starts.

   Going somewhere new starts you at the top of it; going *back* puts you where
   you were. A hash change does neither on its own — the document never
   changes, so the offset simply stays where the last screen left it, and a tap
   on Collection from halfway down Settings dropped you halfway down
   Collection.

   Both halves are done here rather than left to the browser. The browser does
   keep a scroll position per history entry, but it restores it the moment the
   entry becomes current — which under client-side rendering is before React
   has mounted the screen being returned to. The document is still the *old*
   screen's height at that instant, so a restore past the end of it is clamped,
   and a long screen comes back at its top. It looked like it worked when the
   app was warm; it is a race either way.

   Telling forward from back is the other half, and no event says which:
   `popstate` fires for a script-driven `location.hash = ...` exactly as it does
   for the back button (verified in Safari, not assumed), and `history.length`
   does not grow when a push replaces a forward entry you had just stepped back
   from. So the app says so itself — every forward move in here is a click on
   an in-app link or a call to `navigate`/`redirect`, and everything reaching
   `hashchange` unannounced is a traversal, whether from the back button, a
   swipe, or the keyboard.
--------------------------------------------------------------------------- */

let goingForward = false

/** Where each route was left, keyed by hash rather than by history entry:
 *  two entries showing the same screen should come back to the same place. */
const scrollPositions = new Map<string, number>()

/** How many frames to hold a restore for. Past this the target is not
 *  reachable — a shorter screen, an emptied list, a deleted plant — and where
 *  we landed is the right answer rather than a scroll into blank space. */
const RESTORE_FRAMES = 10

/**
 * Put the page at `target`, and keep putting it there for a few frames.
 *
 * Two things can move it out from under us in that window, and asking again
 * costs nothing against either. The screen may not have mounted yet, so the
 * document is still too short and `scrollTo` lands clamped. And a browser may
 * do its own restoring anyway: WebKit sets the offset back to 0 *after* the
 * `hashchange` handler has run, whatever `scrollRestoration` was set to — a
 * single call was overwritten a frame later and the screen came back at its
 * top. Chromium at the same moment is already correct, which is exactly the
 * kind of difference not to build on.
 */
function restore(target: number, frames = RESTORE_FRAMES): void {
  window.scrollTo(0, target)
  if (frames > 0 && Math.round(window.scrollY) !== target) {
    window.requestAnimationFrame(() => restore(target, frames - 1))
  }
}

/** The route the offsets above are currently being recorded against. */
let currentHash = typeof window === 'undefined' ? '' : window.location.hash

/**
 * Write down where this screen is, now.
 *
 * Called as the page moves rather than once on the way out. Reading `scrollY`
 * inside `hashchange` looks like the obvious place and is too late: WebKit has
 * already put the offset back to 0 by the time that handler runs, so every
 * screen was remembered as being at its top and "back" faithfully restored
 * that. Tracking it as it moves means the number is written down while it is
 * still true.
 */
function remember(): void {
  scrollPositions.set(currentHash, window.scrollY)
}

if (typeof window !== 'undefined') {
  // Asked for even though WebKit ignores it — where it is honoured it stops
  // the browser restoring against a screen React has not mounted yet.
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

  window.addEventListener('scroll', remember, { passive: true })

  // Capture, so a link still counts even if something between it and the
  // window stops the bubble.
  window.addEventListener(
    'click',
    (event) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]')
      const href = link?.getAttribute('href')
      // A link to where you already are produces no `hashchange`, so a flag
      // set here would sit there and spend itself on the next press of Back.
      if (href && href !== window.location.hash) {
        remember()
        goingForward = true
      }
    },
    true,
  )

  window.addEventListener('hashchange', () => {
    currentHash = window.location.hash
    const forward = goingForward
    goingForward = false
    restore(forward ? 0 : (scrollPositions.get(currentHash) ?? 0))
  })
}

/** Replace rather than push, so "back" does not walk through a redirect. */
export function redirect(hash: string): void {
  // Forward for the reader even though it is a replace for `history`: saving
  // a form and landing on the plant is arriving somewhere new, and arriving
  // halfway down it because the form was long is the bug this flag fixes.
  remember()
  goingForward = true
  window.location.replace(`${window.location.pathname}${window.location.search}${hash}`)
}

/** The full URL to write onto a tag, which is also what "Copy link" copies. */
export function plantUrl(code: string): string {
  return `${window.location.origin}${window.location.pathname}#p=${code}`
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  )
  return parseRoute(hash)
}
