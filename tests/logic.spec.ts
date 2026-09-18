/**
 * The rules that have to be right, tested without a browser.
 *
 * Plant codes go onto physical stickers and the backup file is the only safety
 * net there is until the sync lands — both are cheaper to get wrong than to
 * discover wrong.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { codePrefix, generatePlantCode, isPlantCode } from '../src/lib/plantCode'
import { nextInLine, splitLineage } from '../src/lib/nameGenerator'
import { parseBackup, BackupParseError } from '../src/data/backup'
import { migrateEvent, migratePlant, migrateVocab } from '../src/data/migrate'
import { daysBetween, inputValueToISO, isoToInputValue } from '../src/lib/date'
import { formatSpecies, normalizeCross, toRoman, fromRoman } from '../src/lib/format'
import { parseRoute } from '../src/lib/router'
import {
  ancestorsOf,
  childrenOf,
  currentPhotoEvent,
  descendantCodes,
  descendantsOf,
  lineageOf,
  milestonesOf,
} from '../src/data/selectors'
import type { State } from '../src/data/store'
import type { Plant, PlantEvent } from '../src/data/types'

test.describe('plant codes', () => {
  test('the prefix comes from the species, stripped and padded', () => {
    expect(codePrefix('Monstera deliciosa')).toBe('MON')
    expect(codePrefix('Anthurium')).toBe('ANT')
    // Diacritics are removed rather than dropped, so Gruyère is not GRU-Y.
    expect(codePrefix('Épipremnum')).toBe('EPI')
    // The Shortcut's bug: "A. crystallinum" must give A.C stripped to AC, not
    // the literal word its default replacement left behind.
    expect(codePrefix('A. crystallinum')).toBe('ACR')
    // Short names are padded, never truncated to something shorter than three.
    expect(codePrefix('Hoya')).toBe('HOY')
    expect(codePrefix('Zz')).toBe('ZZX')
    expect(codePrefix('')).toBe('XXX')
  })

  test('fifty plants get fifty different codes', async () => {
    const taken = new Set<string>()

    for (let i = 0; i < 50; i += 1) {
      const code = await generatePlantCode('Monstera deliciosa', 'Gruyère', taken)
      expect(taken.has(code), `${code} was handed out twice`).toBe(false)
      expect(isPlantCode(code)).toBe(true)
      taken.add(code)
    }

    expect(taken.size).toBe(50)
  })

  test('a taken code is drawn again rather than reused', async () => {
    // Half the suffix space is spoken for, so the first draw collides about
    // half the time and the retry is what makes this pass at all.
    const taken = new Set<string>()
    for (let i = 0; i < 0x8000; i += 1) {
      taken.add(`MON-${i.toString(16).toUpperCase().padStart(4, '0')}`)
    }

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = await generatePlantCode('Monstera', '', taken)
      expect(taken.has(code)).toBe(false)
      taken.add(code)
    }
  })

  test('an exhausted prefix fails loudly instead of looping forever', async () => {
    const taken = new Set<string>()
    for (let i = 0; i < 0x10000; i += 1) {
      taken.add(`MON-${i.toString(16).toUpperCase().padStart(4, '0')}`)
    }

    await expect(generatePlantCode('Monstera', '', taken)).rejects.toThrow(/free plant code/)
  })

  test('the name is the fallback when there is no species', async () => {
    const code = await generatePlantCode('', 'Fluweel', new Set())
    expect(code.startsWith('FLU-')).toBe(true)
  })
})

test.describe('names inherit down a line', () => {
  test('a plain name is the first in its line', () => {
    expect(splitLineage('Fluweel')).toEqual({ stem: 'Fluweel', index: 1 })
    expect(splitLineage('Fluweel III')).toEqual({ stem: 'Fluweel', index: 3 })
    // A name that merely ends in those letters is not a numeral.
    expect(splitLineage('Diva')).toEqual({ stem: 'Diva', index: 1 })
  })

  test('a cutting continues the parent line', () => {
    expect(nextInLine('Fluweel', new Set(['Fluweel']))).toBe('Fluweel II')
    expect(nextInLine('Fluweel', new Set(['Fluweel', 'Fluweel II']))).toBe('Fluweel III')
    // Taken from the child rather than the parent: still the next free one.
    expect(nextInLine('Fluweel II', new Set(['Fluweel', 'Fluweel II', 'Fluweel III']))).toBe(
      'Fluweel IV',
    )
  })

  test('roman numerals round-trip', () => {
    for (const n of [1, 2, 4, 9, 14, 19, 39]) expect(fromRoman(toRoman(n))).toBe(n)
  })
})

test.describe('backups', () => {
  const valid = {
    format: 'florarithm',
    version: 2,
    exportedAt: '2026-09-05T10:00:00.000Z',
    plants: [],
    events: [],
    vocab: [],
  }

  test('a well-formed file is accepted', () => {
    expect(parseBackup(JSON.stringify(valid)).format).toBe('florarithm')
  })

  test('anything else is refused, because importing replaces everything', () => {
    expect(() => parseBackup('not json')).toThrow(BackupParseError)
    expect(() => parseBackup('{"format":"something-else"}')).toThrow(BackupParseError)
    expect(() => parseBackup(JSON.stringify({ ...valid, version: 99 }))).toThrow(BackupParseError)
    expect(() => parseBackup(JSON.stringify({ ...valid, plants: undefined }))).toThrow(
      BackupParseError,
    )
  })
})

test.describe('reading version 2', () => {
  // The sync repository and every backup on disk are still version 2, so the
  // fertilizer brand has to survive being dropped rather than take the file
  // with it.
  const legacyWater = (extra: Record<string, unknown>) =>
    ({
      id: 'e1',
      plantCode: 'MON-0001',
      date: '2026-08-01T12:00:00.000Z',
      type: 'water',
      flushed: true,
      ...extra,
    }) as never

  test('a named fertilizer becomes a plain yes', () => {
    const migrated = migrateEvent(legacyWater({ fertilizerId: 'fert-1' })) as unknown as Record<
      string,
      unknown
    >
    expect(migrated.fertilized).toBe(true)
    expect(migrated.fertilizerId).toBeUndefined()
    expect(migrated.flushed).toBeUndefined()
  })

  test('a watering with no fertilizer becomes a plain no', () => {
    const migrated = migrateEvent(legacyWater({ fertilizerId: null })) as unknown as Record<
      string,
      unknown
    >
    expect(migrated.fertilized).toBe(false)
  })

  test('an event that is already version 3 is handed back untouched', () => {
    const current = {
      id: 'e2',
      plantCode: 'MON-0001',
      date: '2026-08-01T12:00:00.000Z',
      type: 'water',
      fertilized: true,
    } as never
    expect(migrateEvent(current)).toBe(current)
  })

  test('only the fertilizer list is dropped', () => {
    const vocab = [
      { id: '1', kind: 'location', name: 'Hallway' },
      { id: '2', kind: 'fertilizer', name: 'Plagron' },
      { id: '3', kind: 'medium', name: 'SYBAStones' },
    ] as never
    expect(migrateVocab(vocab).map((item) => item.id)).toEqual(['1', '3'])
  })

  test('a version 2 file is read rather than refused', () => {
    const file = {
      format: 'florarithm',
      version: 2,
      exportedAt: '2026-09-05T10:00:00.000Z',
      plants: [],
      events: [legacyWater({ fertilizerId: 'fert-1' })],
      vocab: [{ id: '2', kind: 'fertilizer', name: 'Plagron', createdAt: 'x' }],
    }
    const backup = parseBackup(JSON.stringify(file))
    expect(backup.version).toBe(3)
    expect(backup.vocab).toHaveLength(0)
    expect((backup.events[0] as unknown as Record<string, unknown>).fertilized).toBe(true)
  })
})

test.describe('hybrids', () => {
  // Most collector Anthuriums are a cross with no cultivar, and writing that
  // in the cultivar field would quote a variety nobody registered.
  test('a cross stands where the epithet would', () => {
    expect(
      formatSpecies({
        genus: 'Anthurium',
        species: '',
        cross: 'papillilaminum × crystallinum',
        cultivar: '',
      }),
    ).toBe('Anthurium papillilaminum × crystallinum')
  })

  test('a cultivar on a cross puts the parentage in brackets', () => {
    expect(
      formatSpecies({
        genus: 'Anthurium',
        species: '',
        cross: 'papillilaminum × crystallinum',
        cultivar: 'Dark Mama',
      }),
    ).toBe("Anthurium (papillilaminum × crystallinum) 'Dark Mama'")
  })

  test('the variegation still trails everything', () => {
    expect(
      formatSpecies({
        genus: 'Anthurium',
        species: '',
        cross: 'papillilaminum × crystallinum',
        cultivar: '',
        variegation: 'albo',
      }),
    ).toBe('Anthurium papillilaminum × crystallinum albo')
  })

  test('a plain species is written exactly as it was before the field existed', () => {
    expect(
      formatSpecies({ genus: 'Monstera', species: 'deliciosa', cultivar: 'Thai Constellation' }),
    ).toBe("Monstera deliciosa 'Thai Constellation'")
  })

  test('a lone x becomes a multiplication sign, inside a word it does not', () => {
    expect(normalizeCross('papillilaminum x crystallinum')).toBe('papillilaminum × crystallinum')
    expect(normalizeCross('luxurians x ')).toBe('luxurians × ')
    expect(normalizeCross('regale')).toBe('regale')
  })

  test('a plant stored before the field existed reads back with it empty', () => {
    const stored = {
      code: 'MON-0001',
      name: 'Bert',
      genus: 'Monstera',
      species: 'deliciosa',
      cultivar: '',
      variegation: '',
    } as unknown as Plant

    const migrated = migratePlant(stored)
    expect(migrated.cross).toBe('')
    expect(migrated.species).toBe('deliciosa')
    expect(formatSpecies(migrated)).toBe('Monstera deliciosa')
  })

  test('a plant that already has the field is handed back untouched', () => {
    const current = {
      code: 'ANT-0001',
      name: 'Vlek',
      genus: 'Anthurium',
      species: '',
      cross: 'papillilaminum × crystallinum',
      cultivar: '',
      variegation: '',
    } as unknown as Plant
    expect(migratePlant(current)).toBe(current)
  })
})

test.describe('dates', () => {
  test('days are counted by calendar day, not by elapsed hours', () => {
    // Watered late last night, looked at this morning: one day, not zero.
    expect(daysBetween('2026-09-04T23:30:00', '2026-09-05T07:00:00')).toBe(1)
    expect(daysBetween('2026-09-05T07:00:00', '2026-09-05T23:30:00')).toBe(0)
    expect(daysBetween('2026-08-22T12:00:00', '2026-09-05T12:00:00')).toBe(14)
  })

  test('a date input round-trips without slipping a day across a timezone', () => {
    const iso = inputValueToISO('2026-03-29')
    expect(iso).not.toBeNull()
    expect(isoToInputValue(iso as string)).toBe('2026-03-29')
  })
})

test.describe('routing', () => {
  test('the sticker shape wins, in any case', () => {
    expect(parseRoute('#p=MON-8F3A')).toEqual({ name: 'plant', code: 'MON-8F3A' })
    expect(parseRoute('#p=mon-8f3a')).toEqual({ name: 'plant', code: 'MON-8F3A' })
  })

  test('every other route parses, and nonsense lands on Today', () => {
    expect(parseRoute('#collection/wishlist')).toEqual({ name: 'collection', filter: 'wishlist' })
    expect(parseRoute('#collection/nonsense')).toEqual({ name: 'collection', filter: 'all' })
    expect(parseRoute('#new/wish')).toEqual({ name: 'new', wish: true, parentCode: null })
    expect(parseRoute('#have/MON-8F3A')).toEqual({
      name: 'edit',
      code: 'MON-8F3A',
      promote: true,
    })
    expect(parseRoute('#edit/MON-8F3A')).toEqual({
      name: 'edit',
      code: 'MON-8F3A',
      promote: false,
    })
    expect(parseRoute('')).toEqual({ name: 'today' })
    expect(parseRoute('#whatever')).toEqual({ name: 'today' })
  })
})

test.describe("the plant's picture", () => {
  const plant = (extra: Partial<Plant> = {}): Plant => ({
    code: 'MON-0001',
    name: 'Gruyère',
    genus: 'Monstera',
    species: '',
    cross: '',
    cultivar: '',
    variegation: '',
    locationId: null,
    system: 'soil',
    potSize: null,
    mediumId: null,
    origin: { type: null, from: '', date: null, price: null },
    parent: null,
    status: 'active',
    wish: false,
    wishNote: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  })

  const shot = (id: string, date: string, extra: Partial<PlantEvent> = {}): PlantEvent =>
    ({
      id,
      plantCode: 'MON-0001',
      type: 'photo',
      date,
      photo: { width: 4, height: 4 },
      ...extra,
    }) as PlantEvent

  const stateOf = (one: Plant, events: PlantEvent[]): State => ({
    status: 'ready',
    plants: [one],
    events,
    vocab: [],
    lastBackupAt: null,
  })

  const june = shot('june', '2026-06-01T00:00:00.000Z')
  const august = shot('august', '2026-08-01T00:00:00.000Z')

  test('is the newest photograph when nothing has been chosen', () => {
    const state = stateOf(plant(), [june, august])
    expect(currentPhotoEvent(state, 'MON-0001')?.id).toBe('august')
  })

  test('is the chosen one when there is a choice', () => {
    const state = stateOf(plant({ photoEventId: 'june' }), [june, august])
    expect(currentPhotoEvent(state, 'MON-0001')?.id).toBe('june')
  })

  test('falls back to the newest when the chosen entry is deleted', () => {
    // The choice is left pointing at nothing rather than rewritten on delete:
    // the fallback is what makes that safe, from either device's copy.
    const state = stateOf(plant({ photoEventId: 'june' }), [
      { ...june, deleted: true } as PlantEvent,
      august,
    ])
    expect(currentPhotoEvent(state, 'MON-0001')?.id).toBe('august')
  })

  test('is nothing at all when no entry carries a photograph', () => {
    const state = stateOf(plant({ photoEventId: 'gone' }), [])
    expect(currentPhotoEvent(state, 'MON-0001')).toBeNull()
  })
})

test.describe('the family', () => {
  /**
   * Ophelia — Marla — { Juno, Nova, Wilma }, and under Nova, Pim and Terra.
   * Four generations, a fork in the middle, and everything named once.
   */
  const kin = (code: string, parent: string | null, extra: Partial<Plant> = {}): Plant =>
    ({
      code,
      name: code,
      genus: 'Monstera',
      species: '',
      cultivar: '',
      variegation: '',
      locationId: null,
      system: 'soil',
      potSize: null,
      mediumId: null,
      origin: { type: null, from: '', date: null, price: null },
      parent: parent ? { code: parent, method: 'cutting' } : null,
      status: 'active',
      wish: false,
      wishNote: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...extra,
    }) as Plant

  const stateOf = (plants: Plant[]): State => ({
    status: 'ready',
    plants,
    events: [],
    vocab: [],
    lastBackupAt: null,
  })

  const family = stateOf([
    kin('OPH', null),
    kin('MAR', 'OPH'),
    kin('JUN', 'MAR', { createdAt: '2026-02-01T00:00:00.000Z' }),
    kin('NOV', 'MAR', { createdAt: '2026-03-01T00:00:00.000Z' }),
    kin('WIL', 'MAR', { createdAt: '2026-04-01T00:00:00.000Z' }),
    kin('PIM', 'NOV'),
    kin('TER', 'NOV'),
  ])

  test('the line above a plant reads oldest first', () => {
    expect(ancestorsOf(family, 'PIM').map((plant) => plant.code)).toEqual(['OPH', 'MAR', 'NOV'])
    expect(ancestorsOf(family, 'OPH')).toEqual([])
  })

  test('the line stops at a tombstone rather than walking through it', () => {
    const buried = stateOf([
      kin('OPH', null),
      kin('MAR', 'OPH', { deleted: true }),
      kin('NOV', 'MAR'),
    ])
    expect(ancestorsOf(buried, 'NOV')).toEqual([])
  })

  test('a plant that died is still where the cutting came from', () => {
    const gone = stateOf([kin('OPH', null, { status: 'died' }), kin('MAR', 'OPH')])
    expect(ancestorsOf(gone, 'MAR').map((plant) => plant.code)).toEqual(['OPH'])
  })

  test('the tree below a plant keeps its shape', () => {
    const below = descendantsOf(family, 'MAR')
    expect(below.map((node) => node.plant.code)).toEqual(['JUN', 'NOV', 'WIL'])
    expect(below[1]?.children.map((node) => node.plant.code)).toEqual(['PIM', 'TER'])
    expect(descendantsOf(family, 'PIM')).toEqual([])
  })

  test('cuttings read in the order they were taken', () => {
    expect(childrenOf(family, 'MAR').map((plant) => plant.code)).toEqual(['JUN', 'NOV', 'WIL'])
  })

  test('everything below a plant, flat, is what it may not descend from', () => {
    expect([...descendantCodes(family, 'MAR')].sort()).toEqual(['JUN', 'NOV', 'PIM', 'TER', 'WIL'])
    expect(descendantCodes(family, 'PIM').size).toBe(0)
  })

  test('the counts are the whole line, not the distance from the top', () => {
    for (const code of ['OPH', 'NOV', 'PIM']) {
      expect(lineageOf(family, code).generations).toBe(4)
    }
    expect(lineageOf(family, 'NOV').plants).toBe(5)
  })

  /**
   * Nothing in the record stops two plants naming each other, and nothing on
   * the page survives a walk that never ends. Both directions have to stop.
   */
  test('a loop stops rather than hanging the page', () => {
    const loop = stateOf([kin('AAA', 'BBB'), kin('BBB', 'AAA')])

    expect(ancestorsOf(loop, 'AAA').map((plant) => plant.code)).toEqual(['BBB'])
    expect(descendantsOf(loop, 'AAA').map((node) => node.plant.code)).toEqual(['BBB'])
    expect(descendantsOf(loop, 'AAA')[0]?.children).toEqual([])
    expect(descendantCodes(loop, 'AAA').has('BBB')).toBe(true)

    // Drawn, it is one plant in one place: whatever is already above you is
    // not also listed below you, so the rail never names the same plant twice.
    const drawn = lineageOf(loop, 'AAA')
    expect(drawn.descendants).toEqual([])
    expect(drawn.plants).toBe(2)
    expect(drawn.generations).toBe(2)
  })

  test('a plant that names itself is not its own parent', () => {
    const self = stateOf([kin('AAA', 'AAA')])

    expect(ancestorsOf(self, 'AAA')).toEqual([])
    expect(descendantsOf(self, 'AAA')).toEqual([])
    expect(descendantCodes(self, 'AAA').size).toBe(0)
  })
})

test.describe('milestones', () => {
  /**
   * Every line is read out of the log, so the only thing worth testing is the
   * reading: the order, the one figure each line is allowed to carry, and the
   * anniversary, which is the single value that changes without anything being
   * logged at all.
   */
  const ago = (years: number, months = 0): string => {
    const date = new Date()
    date.setFullYear(date.getFullYear() - years)
    date.setMonth(date.getMonth() - months)
    return date.toISOString()
  }

  const grown = (extra: Partial<Plant> = {}): Plant =>
    ({
      code: 'ANT-0001',
      name: 'Fluweel',
      genus: 'Anthurium',
      species: '',
      cross: '',
      cultivar: '',
      variegation: '',
      locationId: null,
      system: 'semi-hydro',
      potSize: 19,
      mediumId: null,
      origin: { type: 'nursery', from: '', date: ago(5, 1), price: null },
      parent: null,
      status: 'active',
      wish: false,
      wishNote: '',
      createdAt: ago(5, 1),
      updatedAt: ago(5, 1),
      ...extra,
    }) as Plant

  const log = (id: string, extra: Partial<PlantEvent>): PlantEvent =>
    ({ id, plantCode: 'ANT-0001', date: ago(4), ...extra }) as PlantEvent

  const stateOf = (one: Plant, events: PlantEvent[]): State => ({
    status: 'ready',
    plants: [one],
    events,
    vocab: [],
    lastBackupAt: null,
  })

  test('the chronicle runs oldest first and carries the wait it was told', () => {
    const state = stateOf(grown(), [
      log('note', { type: 'note', date: ago(5, 1), text: 'Finally.', fromWishlist: 214 }),
      log('leaf', { type: 'leaf', date: ago(5) }),
    ])

    const dated = milestonesOf(state, 'ANT-0001')
    expect(dated.map((item) => item.title)).toEqual([
      'Arrived',
      'First new leaf',
      'Five years here',
    ])
    expect(dated[0]?.detail).toBe('after 214 days on the wishlist')
    // The wait is the only figure the arrival carries: nothing here counts
    // something the log did not write down.
    expect(dated[1]?.detail).toBeNull()
  })

  test('the anniversary is the last one that passed, never the next one', () => {
    // Three years and eleven months in: the fourth year has not come round,
    // so the card must not round up to it.
    const justUnder = stateOf(grown({ origin: { type: null, from: '', date: ago(4, -1), price: null } }), [
      log('leaf', { type: 'leaf', date: ago(3) }),
    ])

    expect(milestonesOf(justUnder, 'ANT-0001').map((item) => item.title)).toEqual([
      'Arrived',
      'First new leaf',
      'Three years here',
    ])
  })

  test('a plant in its first year has no anniversary at all', () => {
    const fresh = stateOf(grown({ origin: { type: null, from: '', date: ago(0, 4), price: null } }), [])

    expect(milestonesOf(fresh, 'ANT-0001').map((item) => item.title)).toEqual(['Arrived'])
  })

  test('a first bloom says how long it took, a plant with no arrival says nothing', () => {
    const known = stateOf(grown(), [log('bloom', { type: 'bloom', date: ago(4, 1) })])
    expect(milestonesOf(known, 'ANT-0001')[1]?.detail).toBe('365 days after it arrived')

    const unknown = stateOf(grown({ origin: { type: null, from: '', date: null, price: null } }), [
      log('bloom', { type: 'bloom', date: ago(4, 1) }),
    ])
    const dated = milestonesOf(unknown, 'ANT-0001')
    expect(dated.map((item) => item.title)).toEqual(['First bloom'])
    expect(dated[0]?.detail).toBeNull()
  })

  test('the earliest of a kind is the one named, not the latest', () => {
    const first = ago(3)
    const state = stateOf(grown(), [
      log('late', { type: 'bloom', date: ago(1) }),
      log('early', { type: 'bloom', date: first }),
    ])

    const bloom = milestonesOf(state, 'ANT-0001').find((item) => item.title === 'First bloom')
    expect(bloom?.date).toBe(first)
  })

  test('a pot is a milestone from the second repot, with the sizes it climbed', () => {
    const once = stateOf(grown(), [
      log('a', { type: 'repot', date: ago(3), fromSize: 12, toSize: 15, mediumId: null, reason: '' }),
    ])
    // One repot is what Care's Last repot row already says.
    expect(milestonesOf(once, 'ANT-0001').some((item) => item.title.endsWith('pot'))).toBe(false)

    const last = ago(1)
    const twice = stateOf(grown(), [
      log('a', { type: 'repot', date: ago(3), fromSize: 12, toSize: 15, mediumId: null, reason: '' }),
      log('b', { type: 'repot', date: last, fromSize: 15, toSize: 19, mediumId: null, reason: '' }),
    ])
    const pot = milestonesOf(twice, 'ANT-0001').find((item) => item.title === 'Into its third pot')
    expect(pot?.date).toBe(last)
    expect(pot?.detail).toBe('12 → 15 → 19 cm')
  })

  test('a watering counts on the day it crossed the last round number', () => {
    const waterings = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        log(`w${index}`, {
          type: 'water',
          date: new Date(Date.UTC(2022, 0, 1 + index * 7)).toISOString(),
          fertilized: true,
        }),
      )
    const titles = (count: number) =>
      milestonesOf(stateOf(grown(), waterings(count)), 'ANT-0001').map((item) => item.title)

    expect(titles(49)).not.toContain('Watered for the 50th time')
    expect(titles(50)).toContain('Watered for the 50th time')

    // 214 waterings: the 200th, dated the day it happened — and only that one.
    const at214 = milestonesOf(stateOf(grown(), waterings(214)), 'ANT-0001')
    const watered = at214.filter((item) => item.title.startsWith('Watered'))
    expect(watered.map((item) => item.title)).toEqual(['Watered for the 200th time'])
    expect(watered[0]?.date).toBe(new Date(Date.UTC(2022, 0, 1 + 199 * 7)).toISOString())
  })

  test('a tombstoned entry is not a milestone', () => {
    const state = stateOf(grown(), [
      log('gone', { type: 'bloom', date: ago(4), deleted: true }),
      log('leaf', { type: 'leaf', date: ago(3) }),
    ])

    expect(milestonesOf(state, 'ANT-0001').map((item) => item.title)).toEqual([
      'Arrived',
      'First new leaf',
      'Five years here',
    ])
  })
})

test.describe('spacing', () => {
  /**
   * The scale in `styles.css`, enforced. Tailwind will happily build `px-3.5`
   * or `mt-[13px]`, so the only way the eight steps stay the only eight is a
   * test that reads every class the app writes and refuses the rest — the
   * same reason the stock palette is cleared rather than merely avoided.
   */
  const STEPS = new Set(['0', 'px', '1', '2', '3', '4', '6', '8', '12', '16'])
  // Longest first, so `inset-x-0` is read as inset-x at 0 and not as inset at
  // something called `x-0`.
  const PROPS =
    '(?:space-x|space-y|inset-x|inset-y|gap-x|gap-y|inset|bottom|right|left|top|gap|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|p|m)'
  // Numbers and arbitrary values only: a word after the dash is either a named
  // token or not a class at all (`right-aligned` in a comment).
  const CLASS = new RegExp(`(?<![\\w-])-?${PROPS}-(\\d+(?:\\.\\d+)?|px|\\[[^\\]]+\\])(?![\\w.\\[-])`, 'g')

  const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? sources(join(dir, entry.name))
        : entry.name.endsWith('.tsx')
          ? [join(dir, entry.name)]
          : [],
    )

  /** An arbitrary value is allowed when every length in it comes from the
   *  scale: `--spacing(n)` on a step, the safe area, a token, or a hairline. */
  const derived = (value: string): boolean => {
    const steps = [...value.matchAll(/--spacing\(([\d.]+)\)/g)].map((match) => match[1] ?? '')
    if (steps.some((step) => !STEPS.has(step))) return false
    const rest = value
      .replace(/--spacing\([\d.]+\)/g, '')
      .replace(/env\([^)]*\)/g, '')
      .replace(/var\(--[\w-]+\)/g, '')
    return [...rest.matchAll(/(\d*\.?\d+)(px|rem|em)/g)].every(
      ([, number, unit]) => unit === 'px' && Number(number) <= 1,
    )
  }

  test('every gap, padding, margin and offset is a step of the scale', () => {
    const strays: string[] = []

    for (const file of sources('src')) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          for (const match of line.matchAll(CLASS)) {
            const value = match[1] ?? ''
            const ok = value.startsWith('[') ? derived(value.slice(1, -1)) : STEPS.has(value)
            if (!ok) strays.push(`${file}:${index + 1}  ${match[0]}`)
          }
        })
    }

    expect(strays, 'off the spacing scale — see Spacing in DESIGN.md').toEqual([])
  })
})
