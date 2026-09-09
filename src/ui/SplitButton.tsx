/**
 * The drop's desktop answer: one main action with two variants, on the
 * title row rather than floating over the record.
 *
 * The fan is a phone affordance — a thumb rests near a screen's own corner,
 * so the reach it needs is the reach it opens with. A desktop has no thumb,
 * and a button pinned to a corner of the window drifts away from the record
 * it belongs to as the window widens. This is the pattern the desktop web
 * already has for "one action, a couple of variants": GitHub, Linear, Jira
 * and Stripe all put the primary action of a detail page top-right of its
 * title, and a caret beside it drops the rest. One click waters; the caret
 * reaches fertiliser and everything else.
 *
 * The two segments do not rise together the way `lift` normally answers a
 * hover — they are drawn as one pill, and half a pill lifting while the
 * other half stays down would read as broken rather than as two buttons.
 * The whole control rises as one piece instead: `lift` sits on the inner
 * pill, whose own `:hover` already fires whenever the pointer is over either
 * segment, and each segment still deepens its own colour independently.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '~/lib/cn'
import { Icon } from './Icon'
import { DROP, RIPPLE, throwWater, type Splash, type SplashTone } from './splash'

export function SplitButton({
  onWater,
  onFertilise,
  onMore,
}: {
  onWater: () => void
  onFertilise: () => void
  onMore: () => void
}) {
  const [open, setOpen] = useState(false)
  const [splash, setSplash] = useState<Splash | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // Escape closes it, the same as tapping the scrim.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const land = (tone: SplashTone) => {
    if (timer.current) clearTimeout(timer.current)
    setSplash({ key: Date.now(), tone, drops: throwWater() })
    timer.current = setTimeout(() => setSplash(null), 1000)
  }

  return (
    // `lift`'s hover rise sets a `transform`, and a `transform` on an ancestor
    // of a `position: fixed` element becomes that element's containing block —
    // the fixed overlay below would then size itself to THIS box instead of
    // the viewport, the moment the pointer is anywhere over the pill (and for
    // as long as the hover transition is still animating after it leaves). An
    // overlay clipped to the button's own footprint cannot catch a click
    // anywhere else, so the menu would never close. `lift` stays on the inner
    // pill; this outer box only anchors the menu and never itself receives a
    // transform.
    <div className="relative inline-flex h-control shrink-0">
      <div className="inline-flex h-control shrink-0 rounded-md lift">
        <button
          type="button"
          onClick={() => {
            land('water')
            onWater()
          }}
          className={cn(
            'relative warm flex items-center gap-2 rounded-l-md bg-water pl-4 pr-3.5',
            'text-body font-medium text-on-accent hover:bg-water-deep active:opacity-70',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
          )}
        >
          <Icon name="droplet" size={20} />
          Water
          {splash ? <SplashMark splash={splash} /> : null}
        </button>

        {/* A hairline in the button's own deepened tone — the same seam
            `SegmentedField` draws between its options, coloured for this one. */}
        <span className="w-px shrink-0 bg-water-deep" aria-hidden />

        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="More ways to log"
          onClick={() => setOpen((was) => !was)}
          className={cn(
            'warm flex w-10 items-center justify-center rounded-r-md bg-water',
            'text-on-accent hover:bg-water-deep active:opacity-70',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
          )}
        >
          <Icon
            name="chevronDown"
            size={18}
            className={cn('transition-[rotate] duration-200 ease-grow', open ? 'rotate-180' : '')}
          />
        </button>
      </div>

      {open ? (
        <>
          {/* Invisible: this is only how a click outside closes the menu, not
              a scrim. The other menus and sheets in the app dim the page
              because they cover it — a two-item caret drop next to the button
              that opened it does not, and dimming the whole record to show two
              lines of text next to it would be weather this one does not need.

              `cursor-default` overrides the app's own `button { cursor:
              pointer }` rule — without it, this invisible button turns the
              pointer into a hand over the *entire* page for as long as the
              menu is open, which reads as "something here is clickable"
              everywhere at once rather than nowhere in particular. */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            aria-label="More ways to log"
            className={cn(
              'absolute top-full right-0 z-50 mt-1.5 w-60 overflow-hidden',
              'rounded-xl border border-line bg-surface shadow-xl',
              'origin-top-right animate-panel-in motion-reduce:animate-none',
            )}
          >
            <MenuItem
              icon="fertilizer"
              label="Watered with fertiliser"
              onClick={() => {
                setOpen(false)
                land('leaf')
                onFertilise()
              }}
            />
            <MenuItem
              icon="plus"
              label="Log something else"
              onClick={() => {
                setOpen(false)
                onMore()
              }}
              last
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  last = false,
}: {
  icon: 'fertilizer' | 'plus'
  label: string
  onClick: () => void
  last?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'warm flex h-13 w-full items-center gap-3 border-b border-line px-4 text-left',
        'text-[0.9375rem] font-medium text-ink active:opacity-70 hover:bg-sunk',
        last ? 'border-b-0' : '',
      )}
    >
      <Icon name={icon} size={19} />
      {label}
    </button>
  )
}

/**
 * Centred on whatever positioned box it is placed in — the primary segment
 * does not move or resize the way a fan option does, so this needs none of
 * the fan's placement maths, only a box to fill.
 */
function SplashMark({ splash }: { splash: Splash }) {
  return (
    <span
      key={splash.key}
      aria-hidden
      className="pointer-events-none absolute inset-0 motion-reduce:hidden"
    >
      {splash.drops.map((drop, index) => (
        <span
          key={index}
          style={
            {
              '--dx': `${drop.dx}px`,
              '--dy': `${drop.dy}px`,
              width: drop.size,
              height: drop.size,
              animationDelay: `${drop.delay}ms`,
            } as CSSProperties
          }
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'rounded-full animate-splash',
            DROP[splash.tone],
          )}
        />
      ))}

      {/* A circle, centred on the button regardless of its own rectangular
          shape — sized to the button's own height, the way the ring on the
          phone's round drop is sized to it. Stretching the ring to the
          button's full width would draw an ellipse, which reads as a stray
          shape rather than as this control's own impact. */}
      <span className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn('size-12 rounded-full border-2 animate-ripple', RIPPLE[splash.tone])}
        />
      </span>
    </span>
  )
}
