/**
 * A chronicle in a card: the plant page's Milestones and the collection's.
 *
 * The event leads, alone on the left edge, because it is the news; the date is
 * reference and sits in the line under it, in front of the one figure that
 * makes it mean something. That is how Family already writes a plant — a
 * name, then a line of facts joined by `·` — so a chronicle brings no pattern
 * of its own.
 *
 * No icons, deliberately. The title already names the thing, half the lines
 * (an arrival, an anniversary, a fiftieth plant) have no glyph that is not
 * invented, and a disc per line is how a cabinet of badges looks.
 */

import type { Milestone } from '~/data/selectors'
import { cn } from '~/lib/cn'
import { formatDate } from '~/lib/date'
import { Card } from './Card'

export function MilestoneCard({ items, className }: { items: readonly Milestone[]; className?: string }) {
  return (
    <Card className={cn('px-4', className)}>
      {items.map((item, index) => (
        <div
          key={`${item.title}:${item.date}`}
          className={cn('py-3', index === items.length - 1 ? '' : 'border-b border-line')}
        >
          <div className="text-[0.9375rem] leading-5 font-medium">{item.title}</div>
          <div className="text-[0.8125rem] leading-[1.125rem] text-ink-faint">
            <span className="font-mono text-micro">{formatDate(item.date)}</span>
            {item.detail ? ` · ${item.detail}` : null}
          </div>
        </div>
      ))}
    </Card>
  )
}
