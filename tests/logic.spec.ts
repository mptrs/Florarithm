/**
 * The rules that have to be right, tested without a browser.
 *
 * Plant codes go onto physical stickers and the backup file is the only safety
 * net there is until the sync lands — both are cheaper to get wrong than to
 * discover wrong.
 */

import { expect, test } from '@playwright/test'
import { codePrefix, generatePlantCode, isPlantCode } from '../src/lib/plantCode'
import { nextInLine, splitLineage } from '../src/lib/nameGenerator'
import { parseBackup, BackupParseError } from '../src/data/backup'
import { migrateEvent, migrateVocab } from '../src/data/migrate'
import { daysBetween, inputValueToISO, isoToInputValue } from '../src/lib/date'
import { toRoman, fromRoman } from '../src/lib/format'
import { parseRoute } from '../src/lib/router'

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
