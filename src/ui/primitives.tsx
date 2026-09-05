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
import { Icon } from './Icon'

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

  const shared = cn(
    'inline-flex shrink-0 items-center rounded-sm px-2.5 py-1 font-mono text-code',
    tones[tone],
    className,
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={label} className={cn(shared, 'active:opacity-70')}>
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
      <span className="font-display text-[0.875rem] italic text-ink-faint">never logged</span>
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

/** Label on the left, value on the right, hairline underneath. The plant
 *  screen's facts are a stack of these. */
export function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-3.5">
      <dt className="text-[0.9375rem] text-ink-muted">{label}</dt>
      <dd className="text-right text-[0.9375rem] text-ink">{children}</dd>
    </div>
  )
}

export function FactList({ children }: { children: ReactNode }) {
  return <dl className="border-t border-line-strong">{children}</dl>
}

/** A screen title, in the serif, with an optional line of counts beside it. */
export function ScreenHeader({
  title,
  meta,
  className,
}: {
  title: string
  meta?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4', className)}>
      <h1 className="font-display text-[2rem] leading-9 font-medium tracking-[-0.015em] md:text-[2.125rem]">
        {title}
      </h1>
      {meta ? <div className="text-[0.8125rem] text-ink-muted">{meta}</div> : null}
    </div>
  )
}

export function BackLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="-ml-2 inline-flex h-touch items-center gap-1 px-2 text-body font-medium text-leaf"
    >
      <Icon name="chevronLeft" />
      {label}
    </a>
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
