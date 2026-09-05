/** A random id for events and vocabulary entries. Plant codes are different —
 *  those come from `plantCode.ts`, because they end up on a physical sticker. */
export function newId(): string {
  return crypto.randomUUID()
}
