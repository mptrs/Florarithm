/**
 * The small shared pieces every screen is built from.
 *
 * These carry the two rules that make the whole thing read as one system:
 * names are set in the serif like a specimen label, and anything a machine
 * produced — codes, dates, day counts — is set in mono so it lines up down a
 * column.
 */

import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Icon, type IconName } from './Icon'

/** The accession number. Tracked out so you can read it off a pot without
 *  second-guessing an 8 for a B. */
export function CodeBadge({
  code,
  tone = 'outline',
  className,
  onClick,
  label,
}: {
  code: string
  tone?: 'outline' | 'quiet' | 'tinted'
  className?: string
  onClick?: () => void
  label?: string
}) {
  const tones = {
    outline: 'border border-line-strong text-ink-muted',
    quiet: 'text-ink-faint',
    tinted: 'bg-leaf-tint text-leaf',
  } as const

  /** One per tone, because fading the code out on hover — which is what this
   *  did — is the one thing a number you are about to read must not do. */
  const hovers = {
    outline: 'hover:border-ink-faint hover:text-ink',
    quiet: 'hover:bg-sunk hover:text-ink-muted',
    tinted: 'hover:text-leaf-deep',
  } as const

  const shared = cn(
    'inline-flex shrink-0 items-center rounded-sm px-2.5 py-1 font-mono text-code',
    tones[tone],
    className,
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(shared, 'lift active:opacity-70', hovers[tone])}
      >
        {code}
      </button>
    )
  }

  return <span className={shared}>{code}</span>
}

/**
 * The number of days since a plant last had water.
 *
 * Thirst is carried by colour and weight — no badge, no bar, no stripe down the
 * side. A plant that has never been logged says so in words, because a zero
 * there would be a lie.
 *
 * A plant watered today gets a mark instead of a nought. A column of figures
 * with a few zeroes in it still has to be read; a mark is seen — which is the
 * whole point on the one screen you scan while walking a room. `leaf` because
 * the system already spends it on checkmarks.
 */
export function DaysSinceWater({
  days,
  thirsty,
  align = 'end',
}: {
  days: number | null
  thirsty: boolean
  align?: 'start' | 'end'
}) {
  if (days === null) {
    return (
      <span className="font-display text-[0.875rem] whitespace-nowrap italic text-ink-faint">
        never logged
      </span>
    )
  }

  // The same height as the figure and its unit, so a mixed column keeps one
  // baseline rather than jumping wherever a plant has just had water.
  if (days === 0) {
    return (
      <span
        className={cn(
          'flex h-[2.3125rem] items-center text-leaf',
          align === 'end' ? 'justify-end' : '',
        )}
      >
        <Icon name="check" size={20} />
        <span className="sr-only">watered today</span>
      </span>
    )
  }

  return (
    <div className={cn('flex flex-col gap-px', align === 'end' ? 'items-end' : 'items-start')}>
      <span
        className={cn(
          'font-mono text-metric',
          thirsty ? 'font-semibold text-ember' : 'text-ink',
        )}
      >
        {days}
      </span>
      <span className={cn('text-[0.6875rem] leading-3', thirsty ? 'text-ember' : 'text-ink-faint')}>
        days
      </span>
    </div>
  )
}

/**
 * A named run of fields — or of anything else a screen groups.
 *
 * Set in the serif, at the size the sheets set their titles. It has to be a
 * different *kind* of type from the labels under it, not a heavier weight of
 * the same one — a heading in `text-label uppercase` sitting directly above
 * more `text-label uppercase` is a heading you have to work out rather than
 * see.
 *
 * The glyph is a plain faint icon rather than a tinted chip on purpose: chips
 * mark a row you can act on, and a heading is not one. The hairline does the
 * separating, so the groups read apart without boxing their contents inside a
 * card the same colour as what's in it.
 */
/** The two rhythms a `Section` body actually uses — a lookup, not a passed-in
 *  gap class, so it can't collide with the base `flex flex-col` the way a
 *  bare `className="gap-8"` would (`cn` joins rather than merges; see
 *  `lib/cn.ts`). */
const SECTION_GAPS = { fields: 'gap-5', groups: 'gap-8' } as const

export function Section({
  icon,
  title,
  children,
  gap = 'fields',
  className,
}: {
  icon: IconName
  title: string
  children: ReactNode
  /** `fields` (20px) for a run of fields; `groups` (32px) for a run of
   *  sub-sections, each with its own heading. */
  gap?: keyof typeof SECTION_GAPS
  className?: string
}) {
  return (
    <section className={cn('flex flex-col', SECTION_GAPS[gap], className)}>
      <div className="flex items-center gap-2.5 border-b border-line pb-2.5">
        <Icon name={icon} size={19} className="text-ink-faint" />
        <h2 className="font-display text-[1.3125rem] leading-7 font-medium">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export function SectionHeading({
  children,
  className,
  action,
}: {
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4', className)}>
      <h2 className="text-label uppercase text-ink-muted">{children}</h2>
      {action}
    </div>
  )
}

/**
 * A screen title, in the serif, with either a line of counts or one control
 * beside it.
 *
 * Counts sit on the title's baseline; a control sits on its centre, because a
 * 36px chip hung from a baseline reads as having slipped.
 */
export function ScreenHeader({
  title,
  meta,
  action,
  className,
}: {
  title: string
  meta?: ReactNode
  /** A control in the slot the counts would use. Wins over `meta`. */
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex justify-between gap-4',
        action ? 'items-center' : 'items-baseline',
        className,
      )}
    >
      <h1 className="font-display text-[2rem] leading-9 font-medium tracking-[-0.015em] md:text-[2.125rem]">
        {title}
      </h1>
      {action ?? (meta ? <div className="text-[0.8125rem] text-ink-muted">{meta}</div> : null)}
    </div>
  )
}

/**
 * What a screen shows when it has nothing to show. Never a blank page: an empty
 * collection is a state, not an error, and it should say what to do next.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-line bg-surface px-5 py-7">
      <h2 className="font-display text-title">{title}</h2>
      <p className="max-w-prose text-[0.9375rem] leading-6 text-ink-muted text-pretty">
        {description}
      </p>
      {action}
    </div>
  )
}

/** A hairline-separated list. Rows supply their own padding. */
export function Rows({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('border-t border-line', className)}>{children}</div>
}
