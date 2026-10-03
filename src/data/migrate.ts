/**
 * Reading version 2 data.
 *
 * A watering used to carry the *brand* of fertilizer as a vocab reference, plus
 * a `flushed` flag. Both were written often and read back never, so version 3
 * replaced them with one boolean. Version 2 is still what sits in the sync
 * repository and in every backup file already on disk, so it is migrated on the
 * way in rather than refused — from three directions: IndexedDB at boot, an
 * imported backup, and a pull from the remote.
 *
 * A plant is patched the same way: fields added after the fact (`variegation`,
 * `cross`) are absent rather than wrong on an older record, so reading one fills
 * them with the empty string it always meant. Every way a plant gets in — the
 * database at boot, an imported backup, a pull from the remote — goes through
 * `migratePlant`, so no screen ever has to ask whether a field is there.
 *
 * Text is tidied the same way: spaces before or after a typed value are never
 * part of it, so every record comes in with them gone — see `tidyPlant`.
 *
 * Migration is a pure function of one record. Nothing here writes.
 */

import type { Plant, PlantEvent, VocabItem } from './types'

/**
 * Everything a stored plant might be missing, filled in on read and written
 * straight back, so the collection never needs a dedicated migration step.
 */
export function migratePlant(plant: Plant): Plant {
  const withSpecies = migrateLegacySpecies(plant)
  // Both added after the fact, and absent means only "never typed" — so an
  // empty string is the whole migration, and the backup format stays at 3. A
  // plant written before the field existed reads back exactly as it was, and
  // is written straight back with the field present.
  const withVariegation =
    typeof withSpecies.variegation === 'string'
      ? withSpecies
      : { ...withSpecies, variegation: '' }

  const withCross =
    typeof withVariegation.cross === 'string'
      ? withVariegation
      : { ...withVariegation, cross: '' }

  // "Own cutting" said twice what `parent` already says once. Where the parent
  // is on record it goes; where it is not, it is the only trace of where the
  // plant came from, so it stays.
  const withOrigin =
    withCross.parent && withCross.origin.type === 'own-cutting'
      ? { ...withCross, origin: { ...withCross.origin, type: null } }
      : withCross

  return tidyPlant(withOrigin)
}

/**
 * Every typed field of a plant without spaces before or after it. "Monstera "
 * and "Monstera" are one genus, and a stray space turns them into two in every
 * list that groups or matches on it. Hands back the very same record when
 * there was nothing to tidy, so callers can tell a change by identity.
 */
export function tidyPlant<T extends Partial<Plant>>(plant: T): T {
  let tidy = trimFields(plant, PLANT_TEXT)
  const origin = plant.origin
  if (origin && typeof origin.from === 'string' && origin.from !== origin.from.trim()) {
    tidy = { ...tidy, origin: { ...origin, from: origin.from.trim() } }
  }
  return tidy
}

const PLANT_TEXT = ['name', 'genus', 'species', 'cross', 'cultivar', 'variegation', 'wishNote'] as const

/** The named string fields of `record`, trimmed. Anything absent or not a
 *  string is left exactly as it is, and so is the record when nothing moved. */
function trimFields<T extends object>(record: T, keys: readonly string[]): T {
  let tidy = record
  for (const key of keys) {
    const value = (tidy as Record<string, unknown>)[key]
    if (typeof value === 'string' && value !== value.trim()) tidy = { ...tidy, [key]: value.trim() }
  }
  return tidy
}

/** A note's text and a repot's reason, trimmed; the same record if neither
 *  needed it. */
export function tidyEvent<T extends Partial<PlantEvent>>(event: T): T {
  return trimFields(event, ['text', 'reason'])
}

/**
 * Plants written before the genus/species/cultivar split had one free-text
 * `species` field, e.g. `Monstera deliciosa 'Thai Constellation'`. Split it
 * once, on read.
 */
function migrateLegacySpecies(plant: Plant): Plant {
  if (typeof (plant as unknown as Record<string, unknown>).genus === 'string') return plant

  const legacy = String((plant as unknown as { species?: unknown }).species ?? '')
  const cultivarMatch = legacy.match(/['"‘’“”]([^'"‘’“”]+)['"‘’“”]/)
  const cultivar = cultivarMatch?.[1]?.trim() ?? ''
  const withoutCultivar = (cultivarMatch ? legacy.slice(0, cultivarMatch.index) : legacy).trim()
  const [genus = '', species = ''] = withoutCultivar.split(/\s+/)

  return { ...plant, genus, species, cultivar }
}

type LegacyWater = {
  type: 'water'
  fertilizerId?: string | null
  flushed?: boolean
  fertilized?: boolean
}

/**
 * A watering from before the split. `fertilizerId` pointing at anything at all
 * means fertilizer went in; which one it was is the part being dropped.
 */
export function migrateEvent(stored: PlantEvent): PlantEvent {
  const event = tidyEvent(stored)
  if (event.type !== 'water') return event

  const legacy = event as PlantEvent & LegacyWater
  if (typeof legacy.fertilized === 'boolean' && legacy.fertilizerId === undefined) return event

  const { fertilizerId, flushed, ...rest } = legacy
  void flushed
  return { ...rest, fertilized: legacy.fertilized ?? fertilizerId != null } as PlantEvent
}

export function migrateEvents(events: readonly PlantEvent[]): PlantEvent[] {
  return events.map(migrateEvent)
}

/** The fertilizer list itself goes; places and mediums keep their names, minus
 *  any spaces around them. */
export function migrateVocab(vocab: readonly VocabItem[]): VocabItem[] {
  return vocab
    .filter((item) => item.kind === 'location' || item.kind === 'medium')
    .map((item) => (item.name === item.name.trim() ? item : { ...item, name: item.name.trim() }))
}

/** Whether anything in this snapshot actually needs writing back. */
export function needsMigration(events: readonly PlantEvent[], vocab: readonly VocabItem[]): boolean {
  const kept = migrateVocab(vocab)
  return (
    vocab.length !== kept.length ||
    kept.some((item) => !vocab.includes(item)) ||
    events.some((event) => migrateEvent(event) !== event)
  )
}
