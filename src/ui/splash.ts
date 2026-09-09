/**
 * The impact a watering leaves behind.
 *
 * Shared between the phone's fan and the desktop split button, so the two
 * answer a press with the same gesture rather than two that happen to look
 * similar. Only the randomness and the colours live here — where the impact
 * is drawn relative to differs by control, since a fan option moves and a
 * split button's primary segment does not.
 */

export type SplashTone = 'water' | 'leaf'
export type Drop = { dx: number; dy: number; size: number; delay: number }
export type Splash = { key: number; tone: SplashTone; drops: Drop[] }

/**
 * Throw a fresh handful of water, in px from the point of impact.
 *
 * Drawn each time rather than listed once: a splash that lands identically on
 * every press stops being a splash and becomes an icon of one, and you press
 * this button every day. The randomness is bounded so it cannot produce a bad
 * one — every drop still clears a button's edge, and the angles are seeded
 * from an even spread so they scatter rather than clump.
 *
 * Weighted upward, because water thrown by an impact goes up before it goes
 * anywhere else: the higher a drop is aimed, the further it carries.
 */
export function throwWater(): Drop[] {
  const count = 9 + Math.floor(Math.random() * 3)

  return Array.from({ length: count }, (_, index) => {
    // An even share of the circle each, jittered inside its own slice, so the
    // set never clumps to one side and never reads as a clock face either.
    const share = (index + 0.2 + Math.random() * 0.6) / count
    const angle = share * Math.PI * 2 - Math.PI / 2
    const upward = Math.max(0, -Math.sin(angle))
    const distance = 26 + upward * 22 + Math.random() * 16

    return {
      dx: Math.round(Math.cos(angle) * distance),
      dy: Math.round(Math.sin(angle) * distance),
      size: 4 + Math.round(Math.random() * 7),
      delay: Math.round(Math.random() * 70),
    }
  })
}

/** Rings spread in the border colour, drops are filled discs. */
export const RIPPLE = { water: 'border-water', leaf: 'border-leaf' } as const
export const DROP = { water: 'bg-water', leaf: 'bg-leaf' } as const
