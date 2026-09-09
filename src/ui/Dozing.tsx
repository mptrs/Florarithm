/**
 * The mark for a plant that is asleep.
 *
 * Dormant is not archived — a Caladium resting through the winter is still on
 * the shelf and still yours — so it needed something to wear in the list
 * rather than a drawer to be filed in. Lucide has no glyph for sleep that is
 * not an alarm clock or a moon, and a moon on a houseplant reads as night
 * rather than as rest, so this is three letters instead: the comic-strip
 * convention, which everyone already knows how to read.
 *
 * The z's are stacked smallest-first and rise in turn. They are sized in `em`
 * rather than `rem`, so one component serves a 40px plant name and a 40px
 * thumbnail alike — the caller sets a font size and the three z's keep their
 * proportions inside it. `aria-label` carries the word, since three z's are
 * not a word a screen reader should attempt.
 */

import { cn } from '~/lib/cn'

/** Smallest z leads, and each one lifts a beat after the one before it. */
const ZS = [
  { size: 'text-[0.55em]', delay: '0s' },
  { size: 'text-[0.75em]', delay: '0.35s' },
  { size: 'text-[1em]', delay: '0.7s' },
] as const

export function Dozing({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Dormant"
      title="Dormant — resting, and out of the watering list"
      className={cn(
        // `text-[0.8125rem]` is the default the callers mostly keep — a tile
        // corner and a table row want the same small mark. The plant page,
        // where it rides a 40px name, passes its own size instead.
        'inline-flex select-none items-end gap-px font-display text-[0.8125rem] leading-none text-ink-faint',
        className,
      )}
    >
      {ZS.map((z, index) => (
        <span
          key={index}
          aria-hidden
          className={cn('animate-doze inline-block', z.size)}
          style={{ animationDelay: z.delay }}
        >
          z
        </span>
      ))}
    </span>
  )
}
