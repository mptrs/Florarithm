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
        // `transition-opacity` was the whole transition, so the hover ground
        // it was given arrived in one frame — the only unanimated hover left
        // in the app.
        'lift active:opacity-70',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
        isChoice ? 'h-touch px-4 text-[0.9375rem]' : 'h-9 px-4 text-[0.875rem]',
        selected
          ? isChoice
            ? 'bg-water text-on-accent font-semibold hover:bg-water-deep'
            : 'bg-ink text-paper font-semibold hover:bg-ink-deep'
          : 'border border-line-strong text-ink-muted font-medium hover:bg-sunk hover:text-ink',
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
