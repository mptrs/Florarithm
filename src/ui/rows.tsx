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
        'flex min-h-touch items-center gap-4 border-b border-line py-2.5 lg:px-2.5',
        'warm active:bg-sunk hover:bg-sunk',
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

/**
 * A place, drawn as a drawer in a cabinet: the name, a hairline running out to
 * the count. No box — the label is doing the work.
 *
 * Shared, because Collection and Today cut the same plants into the same rooms
 * and a room that looked different on the two screens would read as a different
 * kind of thing.
 */
export function DrawerLabel({
  name,
  count,
  className,
}: {
  name: string
  count: number
  className?: string
}) {
  return (
    <div className={cn('mt-5 mb-2.5 flex items-center gap-2.5 lg:mt-6 lg:mb-1.5', className)}>
      <span className="text-label text-ink-faint uppercase">{name}</span>
      <span className="h-px flex-1 bg-line" />
      <span className="font-mono text-micro text-ink-faint">{count}</span>
    </div>
  )
}
