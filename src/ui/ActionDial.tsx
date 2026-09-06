/**
 * The drop, and the three things it opens onto.
 *
 * Tapping it fans two shortcuts and a way to everything else out on a quarter
 * arc *around* the button rather than stacking them above it. It is a phone
 * affordance: from `md` up the same actions live in the overflow menu. Sizes step down
 * so the order reads without being numbered, and there are no labels: colour
 * and glyph carry it, and three is few enough to learn once.
 *
 * The fan is `scale` and `translate` only — both compositor properties, so it
 * stays smooth on a phone — and it is skipped entirely under
 * `prefers-reduced-motion`.
 */

import { useEffect, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Icon, type IconName } from './Icon'

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
}

const OPTIONS = (water: () => void, feed: () => void, more: () => void): Option[] => [
  {
    icon: 'droplet',
    label: 'Watered',
    onClick: water,
    size: 58,
    x: 0,
    y: -100,
    className: 'bg-water text-on-accent',
  },
  {
    icon: 'fertilizer',
    label: 'Watered with fertiliser',
    onClick: feed,
    size: 52,
    x: -73,
    y: -68,
    className: 'bg-leaf text-on-accent',
  },
  {
    icon: 'more',
    label: 'Log something else',
    onClick: more,
    size: 46,
    x: -98,
    y: 2,
    className: 'bg-ink text-paper',
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

  const options = OPTIONS(onWater, onFertilise, onMore)

  return (
    <>
      {/* Paper rather than ink: the page behind stays legible, it just steps
          back. A darkroom scrim for three buttons is too much weather. */}
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={() => onToggle(false)}
        className={cn(
          'fixed inset-0 z-30 bg-paper/75 transition-opacity duration-200 motion-reduce:transition-none md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Phone only. A desktop has no thumb to reach with and puts the same
          three things in the overflow menu instead. */}
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
                option.onClick()
              }}
              style={{
                width: option.size,
                height: option.size,
                right: `${(64 - option.size) / 2 - option.x}px`,
                bottom: `${(64 - option.size) / 2 - option.y}px`,
                transform: open ? 'translate3d(0,0,0) scale(1)' : `translate3d(${option.x}px, ${option.y}px, 0) scale(0.2)`,
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

          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? 'Close' : 'Log activity'}
            onClick={() => onToggle(!open)}
            className={cn(
              'pointer-events-auto relative inline-flex size-primary items-center justify-center rounded-full',
              'bg-water text-on-accent shadow-lg transition-transform active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
            )}
          >
            <Swap show={!open}>
              <Icon name="droplet" size={30} />
            </Swap>
            <Swap show={open}>
              <Icon name="close" size={30} />
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
        'absolute inline-flex transition-[transform,opacity] duration-200 motion-reduce:transition-none',
        show ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0',
      )}
    >
      {children}
    </span>
  )
}
