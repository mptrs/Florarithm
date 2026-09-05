/**
 * Join class names, dropping anything falsy.
 *
 * Deliberately not `tailwind-merge`. Conflicts between utilities are resolved
 * by CSS order, not by the order of the class attribute, so a passthrough
 * `className` cannot reliably override a component's own styling anyway. The
 * convention that keeps that from mattering:
 *
 *   - a component's own look is chosen with **variant props**, never by passing
 *     colour or size utilities from outside;
 *   - `className` is for **placement only** — margin, width, grid position,
 *     `hidden md:block`. Those never collide with what the component sets.
 *
 * Follow that and a 6-line helper is all this needs.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
