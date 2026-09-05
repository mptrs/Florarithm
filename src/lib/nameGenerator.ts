/**
 * The dice button next to the name field.
 *
 * Two rules, and the second one is the point:
 *
 *  1. A name should fit the genus — not a random word, but what those plants
 *     are actually like. Anthurium is velvet and blood-red spathes, Monstera is
 *     holes and sheer size, Alocasia is drama and resurrection.
 *  2. **A cutting inherits its parent's stem.** Take a cutting off Fluweel and
 *     the generator offers Fluweel II, then Fluweel III. That makes the family
 *     tree readable without opening a diagram, which is the whole reason the
 *     rule exists.
 *
 * The names are Dutch while the interface is English, and that is deliberate:
 * the interface is the app talking, the names are the owner talking.
 *
 * The field stays a plain text input. This is an offer, never a decision.
 */

import { fromRoman, toRoman } from './format'

const BY_GENUS: Record<string, readonly string[]> = {
  anthurium: ['Fluweel', 'Kardinaal', 'Bordeaux', 'Vlam', 'Inkt'],
  monstera: ['Gruyère', 'Kolos', 'Zwitser', 'Titaan', 'Raam'],
  alocasia: ['Diva', 'Drakenkop', 'Feniks', 'Nukkig', 'Masker'],
  philodendron: ['Klimmer', 'Ranker', 'Slinger', 'Kabel', 'Touw'],
  hoya: ['Was', 'Kaars', 'Porselein', 'Traagaan', 'Kroonluchter'],
  scindapsus: ['Zilver', 'Spikkel', 'Maanlicht', 'Nevel', 'Taai'],
  epipremnum: ['Sliert', 'Wildgroei', 'Waterval', 'Onkruid'],
  rhaphidophora: ['Ladder', 'Sport', 'Kleine Kolos', 'Opstap'],
  syngonium: ['Pijlpunt', 'Speer', 'Weerhaak'],
  aglaonema: ['Penseel', 'Camouflage', 'Rouge'],
  dieffenbachia: ['Zwijger', 'Roomwit', 'Stomme'],
  spathiphyllum: ['Zwijm', 'Vaandel', 'Witte Vlag'],
  calathea: ['Bidder', 'Pauw', 'Zeurpiet', 'Waaier'],
  goeppertia: ['Bidder', 'Pauw', 'Waaier'],
  maranta: ['Vingers', 'Konijnenoor', 'Tikker'],
  ctenanthe: ['Penseelstreek', 'Visgraat'],
  ficus: ['Verhuisdoos', 'Kaalkop', 'Rubber', 'Vijg'],
  sansevieria: ['Bajonet', 'Zwaard', 'Paal'],
  dracaena: ['Bajonet', 'Zwaard', 'Onverwoestbaar', 'Mast'],
  zamioculcas: ['Glimmer', 'Vergeetput', 'Smaragd'],
  pilea: ['Muntje', 'Schotel', 'Pannenkoek'],
  peperomia: ['Knoop', 'Kussen', 'Druppel'],
  begonia: ['Spiraal', 'Schilderij', 'Vleugel'],
  chlorophytum: ['Spin', 'Broedsel', 'Nakomeling'],
  tradescantia: ['Paars', 'Haast', 'Woeker'],
  hedera: ['Klimop', 'Muur', 'Hardnekkig'],
  asplenium: ['Nest', 'Golf', 'Kroeskop'],
  nephrolepis: ['Pluim', 'Veder', 'Franje'],
  platycerium: ['Gewei', 'Hertshoorn', 'Schild'],
  ceropegia: ['Ketting', 'Hartje', 'Snoer'],
  dischidia: ['Munt', 'Blaas', 'Kralen'],
  senecio: ['Parels', 'Kralen', 'Erwtjes'],
  curio: ['Parels', 'Kralen', 'Erwtjes'],
  euphorbia: ['Stekel', 'Zuil', 'Doorn'],
  echeveria: ['Rozet', 'Steen', 'Dorst'],
  haworthia: ['Venster', 'Kiezel', 'Streep'],
  strelitzia: ['Peddel', 'Paradijs', 'Vaandel'],
  musa: ['Wapper', 'Scheur', 'Tros'],
  oxalis: ['Klaver', 'Vlinder', 'Nachtvlinder'],
  cissus: ['Wingerd', 'Rank', 'Druif'],
}

/** The net, for a genus with no list of its own. */
const GENERAL: readonly string[] = [
  'Buurman',
  'Reus',
  'Dwerg',
  'Sluiper',
  'Nieuwkomer',
  'Doorzetter',
  'Slome',
  'Bijdehand',
  'Stekel',
  'Kaskraker',
]

/** First word of the species, which is the genus. */
export function genusOf(species: string): string {
  return species.trim().split(/[\s.]+/)[0]?.toLowerCase() ?? ''
}

/**
 * Split `Fluweel III` into its stem and its position in the line. A name with
 * no numeral is the first, so its children start at II.
 */
export function splitLineage(name: string): { stem: string; index: number } {
  const match = name.trim().match(/^(.*?)\s+([IVX]+)$/)
  if (!match) return { stem: name.trim(), index: 1 }

  const index = fromRoman(match[2] as string)
  if (index === null) return { stem: name.trim(), index: 1 }

  return { stem: (match[1] as string).trim(), index }
}

/** The next free name in a parent's line: Fluweel → Fluweel II → Fluweel III. */
export function nextInLine(parentName: string, taken: ReadonlySet<string>): string {
  const { stem } = splitLineage(parentName)

  let highest = 1
  for (const name of taken) {
    const candidate = splitLineage(name)
    if (candidate.stem.toLowerCase() === stem.toLowerCase()) {
      highest = Math.max(highest, candidate.index)
    }
  }

  return `${stem} ${toRoman(highest + 1)}`
}

/**
 * Suggest a name.
 *
 * @param species    used to pick the word list
 * @param taken      names already in use, which are skipped
 * @param parentName when set, the suggestion continues that line instead
 */
export function suggestName(
  species: string,
  taken: ReadonlySet<string>,
  parentName?: string | null,
): string {
  if (parentName) return nextInLine(parentName, taken)

  const pool = BY_GENUS[genusOf(species)] ?? GENERAL
  const lowercased = new Set(Array.from(taken, (name) => name.toLowerCase()))

  const free = pool.filter((name) => !lowercased.has(name.toLowerCase()))
  if (free.length > 0) return pick(free)

  // Every word in the list is spoken for, so continue the line of one of them
  // rather than handing back a duplicate.
  return nextInLine(pick(pool), taken)
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)] as T
}
