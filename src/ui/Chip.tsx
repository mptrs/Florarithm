/**
 * Chips — the only round thing in the system.
 *
 * Two kinds, and the difference is not decoration:
 *
 *  - `filter` narrows a list. It is 36px, below the reach floor, because a
 *    mis-tap changes what you are looking at and nothing else.
 *  - `choice` picks a value that gets written down — which fertilizer, how it
 *    was propagated. It writes data, so it obeys the floor like everything
 *    else that does.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '~/lib/cn'

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: 'filter' | 'choice'
  selected?: boolean
  /** A count shown after the label, e.g. the number of wishes. */
  count?: number
  children: ReactNode
}

export function Chip({
  kind = 'filter',
  selected = false,
  count,
  className,
  type = 'button',
  children,
  ...rest
}: ChipProps) {
  const isChoice = kind === 'choice'

  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-full font-ui whitespace-nowrap',
        'transition-opacity active:opacity-70',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
        isChoice ? 'h-touch px-4 text-[0.9375rem]' : 'h-9 px-3.5 text-[0.875rem]',
        selected
          ? isChoice
            ? 'bg-water text-on-accent font-semibold'
            : 'bg-ink text-paper font-semibold'
          : 'border border-line-strong text-ink-muted font-medium',
        className,
      )}
      {...rest}
    >
      {children}
      {count === undefined ? null : (
        <span className={cn('font-mono text-micro', selected ? 'opacity-70' : 'text-ink-faint')}>
          {count}
        </span>
      )}
    </button>
  )
}

/**
 * A horizontally scrolling strip of chips. Scrolls rather than wraps, so the
 * list below never jumps down a row when a filter is added.
 */
export function ChipStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {children}
    </div>
  )
}
