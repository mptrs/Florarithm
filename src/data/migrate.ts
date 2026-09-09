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

  return typeof withVariegation.cross === 'string'
    ? withVariegation
    : { ...withVariegation, cross: '' }
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
export function migrateEvent(event: PlantEvent): PlantEvent {
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

/** The fertilizer list itself goes; places and mediums are untouched. */
export function migrateVocab(vocab: readonly VocabItem[]): VocabItem[] {
  return vocab.filter((item) => item.kind === 'location' || item.kind === 'medium')
}

/** Whether anything in this snapshot actually needs writing back. */
export function needsMigration(events: readonly PlantEvent[], vocab: readonly VocabItem[]): boolean {
  return (
    vocab.length !== migrateVocab(vocab).length ||
    events.some((event) => migrateEvent(event) !== event)
  )
}
