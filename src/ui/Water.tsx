/**
 * Watering, in one press.
 *
 * Fertiliser always goes in with the water, so there is only one kind of
 * watering left to choose — and a fan or a caret with one thing behind it is
 * a question with one answer. The drop waters on a tap; everything else is
 * Log, in the tab bar's centre.
 *
 * `WaterDrop` is the phone's: fixed in the corner a thumb rests in, above the
 * tab bar. It answers a press with a splash and flips to the check for as
 * long as that lasts, so a second press reads as a second press rather than as
 * nothing. From `md` a plant is watered from the menu on its photograph
 * instead — see `PlantMenu`.
 *
 * There is no undo. A watering pressed by mistake is swiped out of the history,
 * and pressing again the same day folds into the entry already there — see
 * `logEvent` — so a mis-tap can never leave more than the one row.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Icon } from './Icon'
import { DaysSinceWater } from './primitives'
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

/**
 * Today's figure, pressed to water.
 *
 * The days since water is the control, so a row gains no chrome of its own:
 * the figure turns to the check that already meant "watered today", and that
 * check is the one mark for it — a filled button beside it would say the same
 * fact twice. A faint drop in front of the figure is the only hint it presses.
 *
 * A second press takes the day's watering back, the way a cachepot's tick
 * does: the correction is made on the row where the mistake shows.
 */
export function WaterFigure({
  name,
  days,
  thirsty,
  watered,
  onWater,
  onTakeBack,
  className,
}: {
  name: string
  days: number | null
  thirsty: boolean
  watered: boolean
  onWater: () => void
  onTakeBack: () => void
  className?: string
}) {
  const [splash, setSplash] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const press = () => {
    if (timer.current) clearTimeout(timer.current)
    if (watered) {
      setSplash(null)
      onTakeBack()
      return
    }
    setSplash(Date.now())
    timer.current = setTimeout(() => setSplash(null), 800)
    onWater()
  }

  return (
    <button
      type="button"
      onClick={press}
      aria-pressed={watered}
      aria-label={`${name}: watered today`}
      title={watered ? 'Watered today. Press to take it back' : 'Watered'}
      className={cn(
        'warm relative flex min-h-14 shrink-0 items-center justify-end gap-2 rounded-md py-2 pr-3 pl-2',
        // The row's hover shades the whole line; the control steps one shade
        // darker under the pointer, so it still reads as the part that presses.
        'group/water hover:bg-line active:opacity-70',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
        className,
      )}
    >
      {watered ? null : (
        <Icon name="droplet" size={14} className="shrink-0 text-ink-faint opacity-70 transition-opacity group-hover/water:text-ink-muted group-hover/water:opacity-100" />
      )}
      <DaysSinceWater days={watered ? 0 : days} thirsty={thirsty} />
      {/* One ring, centred on the check: the pour on a plant's page, at the
          size of a figure in a list. */}
      {splash ? (
        <span
          key={splash}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 flex w-11 items-center justify-center motion-reduce:hidden"
        >
          <span className={cn('size-5 rounded-full border-2 animate-ripple', RIPPLE.water)} />
        </span>
      ) : null}
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
