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

/**
 * The shell: a whole-row link, always at least a thumb tall.
 *
 * `trailing` is a control at the row's end that is not part of the link — a
 * button cannot sit inside an anchor. The two then answer the pointer
 * separately, so a press on either one shows which of the two it was.
 */
export function RowLink({
  href,
  children,
  className,
  trailing,
}: {
  href: string
  children: ReactNode
  className?: string
  trailing?: ReactNode
}) {
  const link = (
    <a
      href={href}
      className={cn(
        'flex min-h-touch items-center gap-3 px-3 py-3',
        trailing ? 'min-w-0 flex-1' : 'border-b border-line',
        'warm active:bg-sunk hover:bg-sunk',
        className,
      )}
    >
      {children}
    </a>
  )

  if (!trailing) return link

  return (
    <div className="flex items-center border-b border-line">
      {link}
      {trailing}
    </div>
  )
}

/** A row that is not a link — the header of a table, or a row whose only
 *  action is a button inside it. */
export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-touch items-center gap-3 border-b border-line py-3', className)}>
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
  action,
  className,
}: {
  name: string
  count: number
  /** A control after the count. Passing `null` keeps the room for one, so a
   *  label whose action comes and goes does not move the rows under it. */
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-2 flex items-center gap-2',
        action !== undefined && 'min-h-touch',
        className,
      )}
    >
      <span className="text-label text-ink-faint uppercase">{name}</span>
      <span className="h-px flex-1 bg-line" />
      <span className="font-mono text-micro text-ink-faint">{count}</span>
      {action}
    </div>
  )
}
