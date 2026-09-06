/**
 * The whole data model.
 *
 * Two kinds of thing: `Plant` records, which change, and `PlantEvent` records,
 * which never do. Anything you see on a screen — days since water, leaves this
 * year, collection value, average rhythm — is derived from these at render time
 * and stored nowhere. Never persist a derived value.
 *
 * Places, mediums and fertilizers are entities with ids rather than free text,
 * so renaming one moves every plant and every logged event with it instead of
 * leaving three spellings behind.
 */

export type Id = string

export type System = 'hydro' | 'semi-hydro' | 'soil'
export const SYSTEMS: readonly System[] = ['hydro', 'semi-hydro', 'soil']

export type PlantStatus = 'active' | 'dormant' | 'died' | 'given-away'
export const PLANT_STATUSES: readonly PlantStatus[] = ['active', 'dormant', 'died', 'given-away']

export type PropagationMethod = 'cutting' | 'corm' | 'division' | 'seed'
export const PROPAGATION_METHODS: readonly PropagationMethod[] = [
  'cutting',
  'corm',
  'division',
  'seed',
]

export type OriginType = 'nursery' | 'shop' | 'trade' | 'own-cutting' | 'gift'
export const ORIGIN_TYPES: readonly OriginType[] = [
  'nursery',
  'shop',
  'trade',
  'own-cutting',
  'gift',
]

export type Origin = {
  type: OriginType | null
  /** Shop, nursery or person. Free text on purpose: it is a fact about one
   *  purchase, not a list you pick from twice. */
  from: string
  /** ISO date. When it entered the collection, not when the record was made. */
  date: string | null
  price: number | null
}

export type Parent = {
  code: string
  method: PropagationMethod
}

export type Plant = {
  /** `MON-8F3A`. The primary key, and the thing printed on the sticker. */
  code: string
  name: string
  /** Almost always present — it is what the plant code is drawn from. */
  genus: string
  /** The specific epithet alone, e.g. `deliciosa`. Often blank: not every
   *  plant on a windowsill has been identified past its genus. */
  species: string
  /** No quotes — those are added wherever this is displayed. */
  cultivar: string
  locationId: Id | null
  system: System
  /** Diameter in cm. */
  potSize: number | null
  mediumId: Id | null
  origin: Origin
  parent: Parent | null
  status: PlantStatus
  /** On the wishlist, not in your possession yet. A flag rather than a separate
   *  table, so "I have this now" is one field change and the record keeps its
   *  code, its name and its history. */
  wish: boolean
  wishNote: string
  createdAt: string
  /** Bumped on every write. Sync uses it to pick a winner between two devices. */
  updatedAt: string
  /** Tombstone, same reasoning as `PlantEvent.deleted`: a removed plant still
   *  has to be visible to a merge, or the other device just brings it back. */
  deleted?: boolean
}

export type EventType = 'water' | 'repot' | 'leaf' | 'bloom' | 'note'
export const EVENT_TYPES: readonly EventType[] = ['water', 'repot', 'leaf', 'bloom', 'note']

type EventBase = {
  id: Id
  plantCode: string
  /** ISO timestamp. */
  date: string
  /** Tombstone. Events are append-only, so a deletion is a flag and never a
   *  removal — otherwise a merge would resurrect it. */
  deleted?: boolean
}

export type WaterEvent = EventBase & {
  type: 'water'
  fertilizerId: Id | null
  flushed: boolean
}

export type RepotEvent = EventBase & {
  type: 'repot'
  fromSize: number | null
  toSize: number | null
  mediumId: Id | null
  reason: string
}

/** New leaf: the date and nothing else. Deliberate. */
export type LeafEvent = EventBase & { type: 'leaf' }

/** Blooming: one moment, same as a new leaf. */
export type BloomEvent = EventBase & { type: 'bloom' }

export type NoteEvent = EventBase & { type: 'note'; text: string }

export type PlantEvent = WaterEvent | RepotEvent | LeafEvent | BloomEvent | NoteEvent

export type VocabKind = 'location' | 'medium' | 'fertilizer'
export const VOCAB_KINDS: readonly VocabKind[] = ['location', 'medium', 'fertilizer']

/** A growing list: what you type once is there to pick the next time. Entries
 *  are archived, never deleted, so a reference from 2027 never dangles. */
export type VocabItem = {
  id: Id
  kind: VocabKind
  name: string
  archived: boolean
  createdAt: string
  /** Bumped on every write. Sync uses it to pick a winner between two devices. */
  updatedAt: string
}

/** The export file, and in M2 the shape that goes to the private repo. */
export type Backup = {
  format: 'florarithm'
  version: 2
  exportedAt: string
  plants: Plant[]
  events: PlantEvent[]
  vocab: VocabItem[]
}

export const BACKUP_FORMAT = 'florarithm' as const
/** Bumped when a plant's shape changes in a way that would corrupt an old
 *  file if it were read as the new shape — the genus/species/cultivar split
 *  being the reason for 2. */
export const BACKUP_VERSION = 2 as const
