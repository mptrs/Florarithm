/**
 * Watering, in one press.
 *
 * Fertiliser always goes in with the water, so there is only one kind of
 * watering left to choose — and a fan or a caret with one thing behind it is
 * a question with one answer. The drop waters on a tap; everything else is
 * the "Log activity" button beside the plant's name.
 *
 * `WaterDrop` is the phone's: fixed in the corner a thumb rests in, above the
 * tab bar. `WaterButton` is the desktop's, on the title row, where a corner
 * button would drift away from the record as the window widens. Both answer a
 * press with the same splash, and both flip to the check for as long as it
 * lasts, so a second press reads as a second press rather than as nothing.
 *
 * There is no undo. A watering pressed by mistake is swiped out of the history,
 * and pressing again the same day folds into the entry already there — see
 * `logEvent` — so a mis-tap can never leave more than the one row.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Icon } from './Icon'
import { DROP, RIPPLE, throwWater, type Splash } from './splash'

/** The splash state, and a press that starts a fresh one every time. */
function useSplash(onWater: () => void) {
  const [splash, setSplash] = useState<Splash | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const press = () => {
    if (timer.current) clearTimeout(timer.current)
    // Keyed, because tapping twice in a row has to replay the animation rather
    // than let the first one finish quietly.
    setSplash({ key: Date.now(), tone: 'water', drops: throwWater() })
    timer.current = setTimeout(() => setSplash(null), 1000)
    onWater()
  }

  return [splash, press] as const
}

export function WaterDrop({ onWater }: { onWater: () => void }) {
  const [splash, press] = useSplash(onWater)

  return (
    // Phone only. The desktop waters from the title row instead.
    <div className="safe-bottom pointer-events-none fixed right-4 bottom-over-bar z-40 flex md:hidden">
      <button
        type="button"
        aria-label="Water"
        onClick={press}
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
        <Swap show={!splash}>
          <Icon name="droplet" size={30} />
        </Swap>
        <Swap show={!!splash}>
          <Icon name="check" size={30} className="stroke-[2.4]" />
        </Swap>
        {splash ? <SplashMark splash={splash} ring="size-full" /> : null}
      </button>
    </div>
  )
}

export function WaterButton({ onWater }: { onWater: () => void }) {
  const [splash, press] = useSplash(onWater)

  return (
    <button
      type="button"
      onClick={press}
      className={cn(
        'relative inline-flex h-control shrink-0 items-center justify-center gap-2 rounded-md px-4 font-ui',
        'lift text-body font-medium text-on-accent shadow-md active:opacity-70',
        'transition-[background-color] duration-200 ease-grow',
        splash ? 'bg-leaf' : 'bg-water hover:bg-water-deep',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
      )}
    >
      <Icon name={splash ? 'check' : 'droplet'} size={20} />
      Water
      {/* A circle sized to the button's height rather than stretched to its
          width, which would draw an ellipse. */}
      {splash ? <SplashMark splash={splash} ring="size-12" /> : null}
    </button>
  )
}

/** Cross-fade with a quarter turn, so the drop becomes the check. */
function Swap({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        // `rotate-*` sets the standalone `rotate` property, so a transition
        // naming `transform` would animate nothing.
        'absolute inline-flex transition-[rotate,opacity] duration-200 ease-grow motion-reduce:transition-none',
        show ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0',
      )}
    >
      {children}
    </span>
  )
}

/** Drops thrown from the centre of whatever positioned box holds it, and one ring. */
function SplashMark({ splash, ring }: { splash: Splash; ring: string }) {
  return (
    <span key={splash.key} aria-hidden className="pointer-events-none absolute inset-0 motion-reduce:hidden">
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
      <span className="absolute inset-0 flex items-center justify-center">
        <span className={cn('rounded-full border-2 animate-ripple', ring, RIPPLE[splash.tone])} />
      </span>
    </span>
  )
}
