/**
 * The drop, and the three things it opens onto.
 *
 * Tapping it fans two shortcuts and a way to everything else out on a quarter
 * arc *around* the button rather than stacking them above it. Watering
 * holds the middle of the arc at the drop's own size, and the other two step
 * down on either side of it, so the order reads without being numbered. There
 * are no labels: colour and glyph carry it, and three is few enough to learn
 * once.
 *
 * The fan is `scale` and `translate` only — both compositor properties, so it
 * stays smooth on a phone — and it is skipped entirely under
 * `prefers-reduced-motion`.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Icon, type IconName } from './Icon'
import { DROP, RIPPLE, throwWater, type Drop } from './splash'

type Option = {
  icon: IconName
  label: string
  onClick: () => void
  /** Diameter, px. The order they are listed in is the order they matter. */
  size: number
  /** Offset from the main button's centre. */
  x: number
  y: number
  className: string
  /** What the pour is made of, or null for an option that opens something else
   *  rather than writing an entry — there is nothing to confirm yet. */
  tone: 'water' | 'leaf' | null
}

const OPTIONS = (water: () => void, feed: () => void, more: () => void): Option[] => [
  {
    icon: 'fertilizer',
    label: 'Watered with fertiliser',
    onClick: feed,
    size: 54,
    x: 0,
    y: -100,
    className: 'bg-leaf text-on-accent',
    tone: 'leaf',
  },
  {
    // The middle of the arc, at the drop's own 64: this is the action the drop
    // was put there for, so it is exactly as big as the button that opened it
    // and sits where the thumb already is. The other two step down around it.
    icon: 'droplet',
    label: 'Watered',
    onClick: water,
    size: 64,
    x: -73,
    y: -68,
    className: 'bg-water text-on-accent',
    tone: 'water',
  },
  {
    icon: 'more',
    label: 'Log something else',
    onClick: more,
    size: 46,
    x: -98,
    y: 2,
    className: 'bg-ink text-paper',
    tone: null,
  },
]

export function ActionDial({
  open,
  onToggle,
  onWater,
  onFertilise,
  onMore,
}: {
  open: boolean
  onToggle: (open: boolean) => void
  onWater: () => void
  onFertilise: () => void
  onMore: () => void
}) {
  // Escape closes it, the same as tapping the scrim.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onToggle(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onToggle])

  /* The drop that just landed. Keyed, because tapping water twice in a row has
     to replay the animation rather than let the first one finish quietly — a
     second entry that looks like nothing happened is the bug this fixes. */
  const [splash, setSplash] = useState<
    { key: number; tone: 'water' | 'leaf'; size: number; x: number; y: number; drops: Drop[] } | null
  >(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const land = (option: Option) => {
    if (!option.tone) return
    if (timer.current) clearTimeout(timer.current)
    setSplash({
      key: Date.now(),
      tone: option.tone,
      size: option.size,
      x: option.x,
      y: option.y,
      drops: throwWater(),
    })
    timer.current = setTimeout(() => setSplash(null), 1000)
  }

  const options = OPTIONS(onWater, onFertilise, onMore)

  return (
    <>
      {/* The same scrim the sheet and the menu put up. It used to be a paler,
          paper-coloured one on the argument that three buttons do not need
          weather — but two kinds of dimming in one app reads as two kinds of
          modal, and the fan is as modal as either of them. */}
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={() => onToggle(false)}
        className={cn(
          // Over the tab bar, which is also `z-30` and would otherwise stay lit
          // and tappable through the scrim. The fan's own layer is declared
          // after this one, so it still sits above it. Phone only: the drop
          // itself is `md:hidden` now, so a desktop window has no fan to dim
          // for — see the split button on the title row instead.
          'fixed inset-0 z-40 bg-scrim backdrop-blur-sm md:hidden',
          'transition-opacity duration-200 ease-grow motion-reduce:transition-none',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Phone only, in the corner a thumb rests in. A desktop has no thumb to
          reach with and puts the same three things on a split button in the
          title row instead — see `SplitButton.tsx`. */}
      <div className="safe-bottom pointer-events-none fixed right-4 bottom-[5.875rem] z-40 md:hidden">
        <div className="relative">
          {options.map((option, index) => (

            <button
              key={option.label}
              type="button"
              aria-label={option.label}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                onToggle(false)
                land(option)
                option.onClick()
              }}
              style={{
                width: option.size,
                height: option.size,
                right: `${(64 - option.size) / 2 - option.x}px`,
                bottom: `${(64 - option.size) / 2 - option.y}px`,
                // Closed, each option sits on the drop itself. Its resting
                // place is already `(-x, -y)` from the button via `right` and
                // `bottom`, so travelling back onto it means translating by
                // `(-x, -y)` again — the sign used to be positive, which threw
                // them the opposite way and made them arrive out of empty
                // space instead of out of the button.
                transform: open
                  ? 'translate3d(0,0,0) scale(1)'
                  : `translate3d(${-option.x}px, ${-option.y}px, 0) scale(0.2)`,
                transitionDelay: `${open ? index * 45 : (options.length - 1 - index) * 30}ms`,
              }}
              className={cn(
                'pointer-events-auto absolute inline-flex items-center justify-center rounded-full shadow-lg',
                'transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
                option.className,
                open ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <Icon name={option.icon} size={Math.round(option.size * 0.46)} />
            </button>
          ))}

          {/* Where the thumb actually landed, not on the main button: the
              option is already collapsing back into the drop by now, and a
              splash that opens somewhere other than where you pressed reads as
              a separate event rather than as the press answering. Same
              placement maths as the options themselves. */}
          {splash ? (
            <span
              key={splash.key}
              aria-hidden
              style={{
                width: splash.size,
                height: splash.size,
                right: `${(64 - splash.size) / 2 - splash.x}px`,
                bottom: `${(64 - splash.size) / 2 - splash.y}px`,
              }}
              className="pointer-events-none absolute motion-reduce:hidden"
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

              {/* One ring. There were three, staggered, and the later ones
                  read as a second animation starting rather than as the same
                  surface still moving — the drops already carry the impact, so
                  the ring only has to mark where it happened. */}
              <span
                className={cn(
                  'absolute inset-0 rounded-full border-2 animate-ripple',
                  RIPPLE[splash.tone],
                )}
              />
            </span>
          ) : null}

          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? 'Close' : 'Log activity'}
            onClick={() => onToggle(!open)}
            className={cn(
              'pointer-events-auto relative inline-flex size-primary items-center justify-center rounded-full',
              'text-on-accent shadow-lg',
              // `scale` rather than `transform`: `active:scale-95` writes the
              // standalone property, and naming only `transform` here would
              // animate nothing.
              'transition-[scale,background-color] duration-200 ease-grow active:scale-95',
              // Leaf for as long as the mark is up. The system already spends
              // leaf on the checkmark that means "watered today", so the drop
              // going green says the same thing the record will.
              splash ? 'bg-leaf' : 'bg-water',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
            )}
          >
            {/* Three states through the one cross-fade the drop already had:
                the drop, the close, and — for as long as the rings last — the
                mark that says it went in. */}
            <Swap show={!open && !splash}>
              <Icon name="droplet" size={30} />
            </Swap>
            <Swap show={open && !splash}>
              <Icon name="close" size={30} />
            </Swap>
            <Swap show={!!splash}>
              <Icon name="check" size={30} className="stroke-[2.4]" />
            </Swap>
              </button>
        </div>
      </div>
    </>
  )
}

/** Cross-fade with a quarter turn, so the drop becomes the close. */
function Swap({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        // `rotate-*` sets the standalone `rotate` property, so a transition
        // naming `transform` animated nothing and the quarter turn arrived in
        // one frame while only the fade played.
        'absolute inline-flex transition-[rotate,opacity] duration-200 ease-grow motion-reduce:transition-none',
        show ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0',
      )}
    >
      {children}
    </span>
  )
}
