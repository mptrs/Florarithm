/**
 * The whole data model.
 *
 * Two kinds of thing: `Plant` records, which change, and `PlantEvent` records,
 * which never do. Anything you see on a screen — days since water, leaves this
 * year, collection value, average rhythm — is derived from these at render time
 * and stored nowhere. Never persist a derived value.
 *
 * Places and mediums are entities with ids rather than free text,
 * so renaming one moves every plant and every logged event with it instead of
 * leaving three spellings behind.
 */

export type Id = string

export type System = 'hydro' | 'semi-hydro' | 'soil'
export const SYSTEMS: readonly System[] = ['hydro', 'semi-hydro', 'soil']

/**
 * The trade terms a label actually carries.
 *
 * A plain select, because that is the control the rest of the app uses for a
 * short fixed set and a browser's own suggest popup is not that control. Six
 * covers the labels you meet; a plant already carrying something else keeps
 * it, and the field offers it back rather than quietly dropping it.
 */
export const VARIEGATIONS: readonly string[] = [
  'albo',
  'aurea',
  'mint',
  'variegata',
  'splash',
  'tricolor',
]

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
  /**
   * `albo`, `aurea`, `tricolor`. The bit that comes after the cultivar on the
   * label, unquoted, because it names a mutation rather than a bred variety.
   *
   * Its own field and not part of `cultivar` for two reasons. Quoting it would
   * be wrong — 'Ninja albo' is not the name of anything — and a collection full
   * of albos is a thing you look for, which a term buried in someone else's
   * spelling inside a free-text field can never answer.
   *
   * Where the line falls is a judgement the app does not make: 'Tricolor' is a
   * registered cultivar on a Hoya and a description on a Stromanthe, and no
   * rule tells the two apart. Whichever field it is typed into is the one it
   * belongs in.
   */
  variegation: string
  locationId: Id | null
  system: System
  /** Diameter in cm. */
  potSize: number | null
  mediumId: Id | null
  origin: Origin
  parent: Parent | null
  status: PlantStatus
  /**
   * Which photograph stands for the plant, by the id of the entry carrying it.
   *
   * Absent means "the newest one", which is the right answer almost always and
   * needs no upkeep. This is set only when you disagree with it — a close-up of
   * one leaf is a true record and a poor portrait. A choice, not a cached
   * value, which is why storing it does not break the rule next door: if the
   * entry it names is deleted, the newest picture quietly takes over again.
   */
  photoEventId?: Id | null
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

export type EventType = 'water' | 'repot' | 'leaf' | 'bloom' | 'note' | 'photo'
export const EVENT_TYPES: readonly EventType[] = [
  'water',
  'repot',
  'leaf',
  'bloom',
  'note',
  'photo',
]

/**
 * The mark left on an event by a photograph. Present means "there is a picture
 * for this entry"; the pixels themselves live in IndexedDB locally and, once
 * synced, as their own file in the repo — see `photoFilePath`.
 *
 * Only the shape is here, and only as a hint for reserving the right box before
 * the bytes arrive. Nothing is derived from it and nothing breaks if it turns
 * out to disagree with the file by a pixel.
 */
export type EventPhoto = {
  width: number
  height: number
}

type EventBase = {
  id: Id
  plantCode: string
  /** ISO timestamp. */
  date: string
  /** Set when a photograph was taken for this entry. Any kind of event can
   *  carry one: the new leaf you photographed, the note with a picture in it,
   *  the plant as it looked the day it was repotted. */
  photo?: EventPhoto
  /** Tombstone. Events are append-only, so a deletion is a flag and never a
   *  removal — otherwise a merge would resurrect it. */
  deleted?: boolean
}

export type WaterEvent = EventBase & {
  type: 'water'
  /** Whether fertiliser went in with the water. This used to be a reference to
   *  a named brand, plus a "flushed the pot first" flag. Both were written
   *  often and read back never, so they are one boolean now. */
  fertilized: boolean
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

/** Just a picture: nothing happened to the plant, this is what it looks like
 *  now. The one event type that is meaningless without its `photo`. */
export type PhotoEvent = EventBase & { type: 'photo' }

export type PlantEvent =
  | WaterEvent
  | RepotEvent
  | LeafEvent
  | BloomEvent
  | NoteEvent
  | PhotoEvent

export type VocabKind = 'location' | 'medium'
export const VOCAB_KINDS: readonly VocabKind[] = ['location', 'medium']

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

/**
 * What IndexedDB holds for one photograph, keyed by the id of the event it
 * belongs to.
 *
 * Local only. It is in neither `Backup` nor `plants.json`: the bytes travel to
 * the private repo as their own file, and the event's `photo` field is what
 * says the file should exist. That keeps a hundred megabytes of JPEG out of a
 * document that is read and rewritten in full on every sync.
 */
export type StoredPhoto = {
  eventId: Id
  /**
   * The JPEG's bytes, and not a `Blob`, which is what this obviously wants to
   * be. WebKit fails a `Blob` put into IndexedDB with "Error preparing
   * Blob/File data to be stored in object store" — a long-standing bug, and
   * WebKit is the engine this app has to work on. Bytes go in without
   * complaint, and a `Blob` is reassembled on the way out, where the mime type
   * below is what makes that lossless.
   */
  bytes: ArrayBuffer
  type: string
  width: number
  height: number
  /**
   * Whether the repo already has this file. `0`/`1` rather than a boolean
   * because IndexedDB will not index one: a boolean is not a valid key, and
   * this is indexed so the upload pass can find its work without reading every
   * photograph's bytes off disk to look at a flag.
   */
  synced: 0 | 1
}

/** The export file, and in M2 the shape that goes to the private repo. */
export type Backup = {
  format: 'florarithm'
  version: 3
  exportedAt: string
  plants: Plant[]
  events: PlantEvent[]
  vocab: VocabItem[]
}

export const BACKUP_FORMAT = 'florarithm' as const
/** Bumped when a plant's shape changes in a way that would corrupt an old
 *  file if it were read as the new shape — the genus/species/cultivar split
 *  being the reason for 2. */
export const BACKUP_VERSION = 3 as const
/** Versions this app can still read. A 2 is migrated on the way in — see
 *  `migrate.ts` — because the sync repo and every backup on disk are 2. */
export const READABLE_BACKUP_VERSIONS: readonly number[] = [2, 3]
