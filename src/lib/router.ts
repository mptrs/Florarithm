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
  window.location.hash = hash
}

/** Replace rather than push, so "back" does not walk through a redirect. */
export function redirect(hash: string): void {
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
