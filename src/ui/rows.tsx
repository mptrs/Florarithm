/**
 * Row building blocks.
 *
 * Today and Collection show the same plants very differently: a phone gets a
 * name, a place and a number, while a desktop gets a real table with species,
 * system, pot size and price side by side. Rather than one component with a
 * dozen flags, this module gives the parts — a row shell, a name, a column —
 * and each screen composes the table it actually needs.
 *
 * Columns collapse by breakpoint rather than by prop, so one piece of markup
 * serves both layouts and the two can never drift apart.
 */

import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'

/** The shell: a whole-row link, always at least a thumb tall. */
export function RowLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <a
      href={href}
      className={cn(
        'flex min-h-touch items-center gap-4 border-b border-line py-3.5',
        'transition-colors active:bg-sunk md:hover:bg-sunk',
        className,
      )}
    >
      {children}
    </a>
  )
}

/** A row that is not a link — the header of a table, or a row whose only
 *  action is a button inside it. */
export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-touch items-center gap-4 border-b border-line py-3.5', className)}>
      {children}
    </div>
  )
}

/**
 * The plant's identity: name in the serif, one muted line under it.
 *
 * On wide layouts the second line usually moves out into its own column, so it
 * takes a breakpoint at which to disappear.
 */
export function RowName({
  name,
  secondary,
  hideSecondaryFrom,
  className,
}: {
  name: string
  secondary?: string
  /** Tailwind breakpoint at which the second line is replaced by columns. */
  hideSecondaryFrom?: 'md' | 'lg'
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col gap-0.5', className)}>
      <span className="truncate font-display text-[1.1875rem] leading-6 font-medium">{name}</span>
      {secondary ? (
        <span
          className={cn(
            'truncate text-[0.8125rem] leading-[1.0625rem] text-ink-muted',
            hideSecondaryFrom === 'md' ? 'md:hidden' : '',
            hideSecondaryFrom === 'lg' ? 'lg:hidden' : '',
          )}
        >
          {secondary}
        </span>
      ) : null}
    </div>
  )
}

/**
 * One table column.
 *
 * `className` carries the width and the breakpoint it appears at — placement,
 * which is exactly what a passthrough class should be for.
 */
export function Cell({
  children,
  className,
  align = 'start',
  tone = 'muted',
  mono,
}: {
  children: ReactNode
  className?: string
  align?: 'start' | 'end'
  tone?: 'ink' | 'muted' | 'faint'
  mono?: boolean
}) {
  const tones = { ink: 'text-ink', muted: 'text-ink-muted', faint: 'text-ink-faint' } as const

  return (
    <span
      className={cn(
        'shrink-0 truncate text-[0.875rem]',
        align === 'end' ? 'text-right' : '',
        mono ? 'font-mono' : '',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** The uppercase label row above a desktop table. */
export function ColumnHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('shrink-0 text-label uppercase text-ink-muted', className)}>{children}</span>
  )
}
