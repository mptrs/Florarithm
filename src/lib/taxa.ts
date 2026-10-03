/**
 * Plant names from outside the collection, from two services, each asked only
 * what it is good at.
 *
 * iNaturalist makes the lists. It ranks by how often a plant has been seen,
 * so Monstera comes before Monsonia, and it finds a plant by its common name —
 * "mini monstera" is Rhaphidophora tetrasperma. It does not forgive a typo:
 * "Anthurim" finds nothing at all.
 *
 * GBIF checks spelling. Its matcher is fuzzy, so "Anthurim" comes back as
 * Anthurium, but as a list it is useless: "Mons" puts Monsonia and a fossil
 * pollen genus before Monstera, and "Rhaphido" does not offer Rhaphidophora
 * at all.
 *
 * Both are free, need no key and answer a browser directly. Only the name
 * being looked up leaves the app — never a plant's own name, place or photos.
 * Offline, or when either is down, the answer is simply "nothing", and the
 * collection's own names carry on as they did before this existed.
 */

import { useEffect, useState } from 'react'

const INATURALIST = 'https://api.inaturalist.org/v1'
const GBIF = 'https://api.gbif.org/v1'
/** iNaturalist's Plantae, so "Mons" does not offer a moth. */
const PLANTS = 47126

/** A genus, or a species when `species` is set, with its common name if it has one. */
export type Taxon = { genus: string; species: string; common: string }

/** How GBIF spells what was asked about, and the family it files it under. */
export type Spelling = { genus: string; species: string; family: string }

type INaturalistTaxon = {
  name: string
  rank: string
  is_active?: boolean
  preferred_common_name?: string
}

/** What GBIF's matcher answers. `canonicalName` is the name as asked about,
 *  spelled right; `genus` is the accepted genus, which for a synonym is a
 *  different one — Sansevieria trifasciata is filed under Dracaena — and is
 *  therefore never what a spelling is read off. */
type GbifMatch = {
  canonicalName?: string
  rank?: string
  matchType?: 'EXACT' | 'FUZZY' | 'HIGHERRANK' | 'NONE'
  confidence?: number
  family?: string
}

/** Below this GBIF is guessing, and a guess presented as a spelling would
 *  rename plants after something they are not. */
const CONFIDENT = 80

/**
 * Genera and species whose name or common name starts like `query`, most seen
 * first. Sections, tribes and the like are left out: they are nothing a plant
 * on a windowsill is labelled with.
 */
export function searchTaxa(query: string): Promise<Taxon[]> {
  const q = query.trim()
  return remember(`search:${q.toLowerCase()}`, 0, async () => {
    const found = await ask<{ results: INaturalistTaxon[] }>(
      `${INATURALIST}/taxa/autocomplete?${new URLSearchParams({
        q,
        taxon_id: String(PLANTS),
        is_active: 'true',
        per_page: '15',
      })}`,
    )
    return found.results.flatMap(toTaxon).slice(0, 8)
  })
}

/** The species of a genus, most seen first. */
export function speciesOf(genus: string): Promise<Taxon[]> {
  const g = genus.trim()
  return remember(`species:${g.toLowerCase()}`, KEPT, async () => {
    const genera = await ask<{ results: (INaturalistTaxon & { id: number })[] }>(
      `${INATURALIST}/taxa?${new URLSearchParams({
        q: g,
        rank: 'genus',
        taxon_id: String(PLANTS),
        per_page: '5',
      })}`,
    )
    const match = genera.results.find((taxon) => taxon.name.toLowerCase() === g.toLowerCase())
    if (!match) return []

    // `taxon_id` takes in everything below, so a genus split into sections
    // still gives its species rather than the sections.
    const found = await ask<{ results: INaturalistTaxon[] }>(
      `${INATURALIST}/taxa?${new URLSearchParams({
        taxon_id: String(match.id),
        rank: 'species',
        is_active: 'true',
        order_by: 'observations_count',
        order: 'desc',
        per_page: '30',
      })}`,
    )
    return found.results.flatMap(toTaxon)
  })
}

/**
 * How GBIF spells a genus (`species` empty) or a species, when that is not
 * how it was typed — `null` when it is spelled right, or GBIF is not sure.
 * Capitals count: "anthurium" is answered with Anthurium.
 */
export function respell(genus: string, species = ''): Promise<Spelling | null> {
  const g = genus.trim()
  const s = species.trim()
  const asked = s ? `${g} ${s}` : g
  // Written the way a name is written, or GBIF does not read it as one:
  // "anthurim" is matched to the plant kingdom, "Anthurim" to Anthurium.
  const written = [g.charAt(0).toUpperCase() + g.slice(1).toLowerCase(), s.toLowerCase()]
    .filter(Boolean)
    .join(' ')
  return remember(`spell:${asked}`, KEPT, async () => {
    const match = await ask<GbifMatch>(
      `${GBIF}/species/match?${new URLSearchParams({
        name: written,
        rank: s ? 'SPECIES' : 'GENUS',
        kingdom: 'Plantae',
      })}`,
    )
    if (match.matchType !== 'FUZZY' && match.matchType !== 'EXACT') return null
    if ((match.confidence ?? 0) < CONFIDENT) return null
    if (match.rank !== (s ? 'SPECIES' : 'GENUS') || !match.canonicalName) return null
    if (match.canonicalName === asked) return null

    const [genusSpelled = '', speciesSpelled = ''] = match.canonicalName.split(' ')
    return { genus: genusSpelled, species: speciesSpelled, family: match.family ?? '' }
  })
}

function toTaxon(taxon: INaturalistTaxon): Taxon[] {
  if (taxon.is_active === false) return []
  const common = taxon.preferred_common_name ?? ''
  const [genus = '', species = ''] = taxon.name.split(' ')
  if (taxon.rank === 'genus') return [{ genus, species: '', common }]
  // Two words exactly: an infraspecific name or a hybrid formula is not
  // something the species field holds.
  if (taxon.rank === 'species' && taxon.name.split(' ').length === 2) {
    return [{ genus, species, common }]
  }
  return []
}

// --- asking -----------------------------------------------------------------

/**
 * How long an answer is kept on the device. A name does not change its
 * spelling from one week to the next, so Settings asks GBIF only about names
 * it has not asked about this month — the first visit asks about every name
 * in the collection, the ones after only about what is new.
 */
const KEPT = 30 * 24 * 60 * 60 * 1000
const STORED = 'taxa:'

/** Answers for as long as the app is open, and — given `keep` — on the
 *  device for that long. A failure is forgotten, so it is asked again. */
const answers = new Map<string, Promise<unknown>>()

function remember<T>(key: string, keep: number, load: () => Promise<T>): Promise<T> {
  const known = answers.get(key)
  if (known) return known as Promise<T>

  const stored = keep ? readStored<T>(key, keep) : undefined
  const pending = stored ? Promise.resolve(stored.value) : load()
  answers.set(key, pending)
  pending.then(
    (value) => {
      if (keep && !stored) writeStored(key, value)
    },
    () => answers.delete(key),
  )
  return pending
}

function readStored<T>(key: string, keep: number): { value: T } | undefined {
  try {
    const raw = localStorage.getItem(STORED + key)
    if (!raw) return undefined
    const { at, value } = JSON.parse(raw) as { at: number; value: T }
    return Date.now() - at < keep ? { value } : undefined
  } catch {
    return undefined
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORED + key, JSON.stringify({ at: Date.now(), value }))
  } catch {
    // Full or refused: it is asked again next time, which is all this saves.
  }
}

/**
 * iNaturalist asks for about one request a second, and typing is quicker than
 * that. Each request waits for its turn; a slower older one is then simply
 * not shown, because `useLookup` only shows the answer to the latest key.
 */
const SPACING = 1000
let nextTurn = 0

async function ask<T>(url: string): Promise<T> {
  if (url.startsWith(INATURALIST)) {
    const wait = nextTurn - Date.now()
    nextTurn = Math.max(nextTurn, Date.now()) + SPACING
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  }
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`${response.status} from ${new URL(url).host}`)
  return (await response.json()) as T
}

/**
 * The answer to `load`, once `key` has held still for a moment — long enough
 * that a name typed at speed is asked about once, at the end; `undefined`
 * while there is nothing to ask, while it is being asked, and when it could
 * not be — offline included. A newer key always wins over a slower older one.
 */
export function useLookup<T>(key: string | null, load: () => Promise<T>): T | undefined {
  const [answer, setAnswer] = useState<{ key: string; value: T } | null>(null)

  useEffect(() => {
    if (key === null || !navigator.onLine) return
    let current = true
    const timer = setTimeout(() => {
      load().then(
        (value) => {
          if (current) setAnswer({ key, value })
        },
        () => {},
      )
    }, 400)
    return () => {
      current = false
      clearTimeout(timer)
    }
    // `load` is a fresh closure every render; the key says what it asks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return key !== null && answer?.key === key ? answer.value : undefined
}
