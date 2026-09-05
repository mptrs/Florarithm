/**
 * Plant codes: `MON-8F3A`.
 *
 * Ported from the Shortcut that did this before, step for step:
 *
 *  1. Take the *genus*, not the name. A code goes on a sticker and can never
 *     be changed, so it hangs off the most stable field — rename Gruyère and
 *     `MON-…` still reads true. No genus? Fall back to the name.
 *  2. Strip diacritics and everything non-alphanumeric, take the first three
 *     characters, uppercase, pad to three with `X`.
 *  3. SHA-256 of an ISO timestamp plus a random number, as uppercase hex.
 *  4. Prefix + `-` + the first four hex characters.
 *  5. Already taken? Draw again. Uniqueness is a guarantee, not a probability.
 */

const PREFIX_LENGTH = 3
const SUFFIX_LENGTH = 4
const PAD_CHARACTER = 'X'

/** Step 2. Exported so the New-plant screen can preview the prefix as you type. */
export function codePrefix(source: string): string {
  const flattened = source
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')

  return flattened.slice(0, PREFIX_LENGTH).toUpperCase().padEnd(PREFIX_LENGTH, PAD_CHARACTER)
}

/** Step 3. */
async function randomHex(): Promise<string> {
  const source = `${new Date().toISOString()}-${Math.floor(Math.random() * 1e9)}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/**
 * Draw a code that is not in `taken`.
 *
 * @param genus the plant's genus; falls back to `name` when empty
 * @param name  used only when there is no genus yet
 * @param taken every code already in the collection
 */
export async function generatePlantCode(
  genus: string,
  name: string,
  taken: ReadonlySet<string>,
): Promise<string> {
  const prefix = codePrefix(genus.trim() || name.trim())

  // Step 5. Bounded rather than recursive: 16^4 is 65k codes per prefix, so a
  // collision is already unlikely, but a loop that cannot end is worse than a
  // loop that gives up loudly.
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const hex = await randomHex()
    const code = `${prefix}-${hex.slice(0, SUFFIX_LENGTH)}`
    if (!taken.has(code)) return code
  }

  throw new Error(`Could not find a free plant code for prefix ${prefix}`)
}

/** Whether a string looks like a plant code, for parsing scanned URLs. */
export function isPlantCode(value: string): boolean {
  return /^[A-Z0-9]{3}-[0-9A-F]{4}$/.test(value)
}
