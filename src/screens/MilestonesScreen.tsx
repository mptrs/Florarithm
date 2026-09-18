/**
 * The collection's milestones, one level under Collection.
 *
 * A page of its own rather than a card at the foot of the grid, because a
 * collection of three hundred plants would bury anything placed after it. The
 * way in is the counts in Collection's header, which are always at the top.
 *
 * The chronicle first — the latest of each kind of moment, oldest first, in
 * the same card as a plant's — then each year the log has something in, looked
 * back on. A desktop sets the two side by side as the plant page sets its
 * columns; a phone stacks them.
 */

import { collectionCounts, collectionMilestones, yearsInReview } from '~/data/selectors'
import { useStore } from '~/data/store'
import { cn } from '~/lib/cn'
import { BackButton } from '~/ui/Button'
import { Card, GroupLabel } from '~/ui/Card'
import { MilestoneCard } from '~/ui/MilestoneCard'
import { EmptyState } from '~/ui/primitives'

export function MilestonesScreen() {
  const state = useStore()
  const counts = collectionCounts(state)
  const dated = collectionMilestones(state)
  const years = yearsInReview(state)
  const thisYear = new Date().getFullYear()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-2">
        <BackButton variant="bare" className="-ml-3" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[2rem] leading-9 font-medium tracking-[-0.015em] md:text-[2.125rem]">
            Milestones
          </h1>
          <p className="text-[0.8125rem] text-ink-muted">
            <span className="font-mono">{counts.plants}</span>{' '}
            {counts.plants === 1 ? 'plant' : 'plants'} ·{' '}
            <span className="font-mono">{counts.grown}</span> grown here ·{' '}
            <span className="font-mono">{counts.genera}</span>{' '}
            {counts.genera === 1 ? 'genus' : 'genera'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <section className="min-w-0 lg:flex-1">
          <GroupLabel>Milestones</GroupLabel>
          {dated.length > 0 ? (
            <MilestoneCard items={dated} className="mt-2" />
          ) : (
            <div className="mt-2">
              <EmptyState
                title="Nothing marked yet"
                description="Milestones appear here as the log grows, each one read straight out of it."
              />
            </div>
          )}
        </section>

        {years.length > 0 ? (
          <div className="flex flex-col gap-8 lg:w-[21rem] lg:shrink-0">
            {years.map((year) => (
              <section key={year.year}>
                <div className="flex items-baseline justify-between gap-3">
                  <GroupLabel>{year.year}</GroupLabel>
                  {year.year === thisYear ? (
                    <span className="text-[0.8125rem] text-ink-faint">the year so far</span>
                  ) : null}
                </div>
                <Card className="mt-2 px-4">
                  <Figure label="New leaves" value={year.leaves} />
                  <Figure label="Blooms" value={year.blooms} />
                  <Figure
                    label="Plants added"
                    value={year.added}
                    extra={year.grown > 0 ? `${year.grown} grown here` : null}
                    last
                  />
                </Card>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** One of a year's figures: what it counts, and the count in mono. */
function Figure({
  label,
  value,
  extra = null,
  last = false,
}: {
  label: string
  value: number
  extra?: string | null
  last?: boolean
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-3', last ? '' : 'border-b border-line')}>
      <span className="text-[0.9375rem] leading-5">{label}</span>
      <span className="shrink-0 font-mono text-[0.875rem] text-ink-muted">
        {value}
        {extra ? ` · ${extra}` : null}
      </span>
    </div>
  )
}
