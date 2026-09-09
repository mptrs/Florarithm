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
        isChoice ? 'h-touch px-4 text-[0.9375rem]' : 'h-9 px-3.5 text-[0.875rem]',
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

/**
 * A horizontally scrolling strip of chips. Scrolls rather than wraps, so the
 * list below never jumps down a row when a filter is added.
 */
export function ChipStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto -mt-1 pt-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {children}
    </div>
  )
}

export type SortOption<T extends string> = { readonly value: T; readonly label: string }

/**
 * The word for what the chips do, and the chips.
 *
 * Collection and Today sort the same plants, and a switch that looked different
 * on the two screens would read as two different controls. Today puts it on the
 * title row, where at 390px the word runs the header to within a hair of the
 * margin and the two chips say what they do without it — hence `labelFrom`,
 * which is visibility rather than look.
 */
export function SortSwitch<T extends string>({
  value,
  options,
  onChange,
  labelFrom,
  className,
}: {
  value: T
  options: readonly SortOption<T>[]
  onChange: (value: T) => void
  /** Breakpoint from which the word "Sort" appears. Always, when omitted. */
  labelFrom?: 'lg'
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'text-label uppercase text-ink-faint',
          labelFrom === 'lg' ? 'hidden lg:inline' : '',
        )}
      >
        Sort
      </span>
      {options.map((option) => (
        <Chip
          key={option.value}
          selected={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  )
}
