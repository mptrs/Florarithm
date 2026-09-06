/**
 * The card, and the tinted icon chip that leads a row inside one.
 *
 * The plant page groups by card rather than by hairline: a run of label/value
 * rows all weighing the same was the thing that made it unreadable.
 */

import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Icon, type IconName } from './Icon'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-line bg-surface', className)}>{children}</div>
  )
}

/**
 * One colour per meaning, in two renderings.
 *
 * `water` is the watering action, `leaf` is the plant itself, `ink` is
 * bookkeeping. Filled is for anything you press; tinted is for the same idea
 * sitting in a list, where a row of saturated circles would shout.
 */
export type ChipTone = 'water' | 'leaf' | 'ink'

const TINTED: Record<ChipTone, string> = {
  water: 'bg-water-tint text-water',
  leaf: 'bg-leaf-tint text-leaf',
  ink: 'bg-sunk text-ink-muted',
}

const FILLED: Record<ChipTone, string> = {
  water: 'bg-water text-on-accent',
  leaf: 'bg-leaf text-on-accent',
  ink: 'bg-ink text-paper',
}

export function IconChip({
  icon,
  tone,
  filled = false,
  size = 34,
  className,
}: {
  icon: IconName
  tone: ChipTone
  filled?: boolean
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        filled ? FILLED[tone] : TINTED[tone],
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </span>
  )
}

/** The small tracked-out heading above a card. */
export function GroupLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('text-label uppercase text-ink-faint', className)}>{children}</div>
}
