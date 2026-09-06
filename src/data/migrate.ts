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
 * Migration is a pure function of one record. Nothing here writes.
 */

import type { PlantEvent, VocabItem } from './types'

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
