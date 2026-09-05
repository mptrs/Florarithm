/**
 * The lineage rule behind the dice button next to the name field.
 *
 * A cutting inherits its parent's stem. Take a cutting off Fluweel and the
 * next suggestion is Fluweel II, then Fluweel III. That makes the family
 * tree readable without opening a diagram, which is the whole reason the
 * rule exists.
 *
 * This is bookkeeping, not a creative task, so it stays deterministic —
 * unlike the genus-fitting part of the suggestion, which is `aiNameGenerator.ts`'s
 * job.
 */

import { fromRoman, toRoman } from './format'

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
