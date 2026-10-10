/**
 * Everything Today asks of you besides the water: the cachepots, settling in,
 * and the sachets once they need ordering.
 *
 * Water is what Today is opened for, so it leads, and these stay out of its
 * way. On a phone each is a tile above the water — a count and a glyph — that
 * opens its rows in a sheet. On a desktop there is room for the rows
 * themselves, so the same chores sit open in a column beside the water. One
 * list of chores, two layouts by breakpoint.
 *
 * A tile is only ever something owed today. Nothing owed, no tile: the strip
 * is not a fixture, it is there on a day with work in it. Tiles share the
 * width equally. Once every one of them is done the strip folds to a single
 * quiet line, which opens again for the rest of the day in case a tick was a
 * mis-tap — rows that are done stay on, ticked, until the day ends.
 */

import { useState, type ReactNode } from 'react'
import { potsToEmpty } from '~/data/selectors'
import { doneToday, settlingToday } from '~/data/settling'
import { useStore } from '~/data/store'
import { cn } from '~/lib/cn'
import { AllEmptied, CachepotRows } from './EmptyPots'
import { Icon, type IconName } from './Icon'
import { SachetsDue, sachetsDue } from './Sachets'
import { AllSettled, SettlingRows, tickable } from './Settling'
import { Sheet } from './Sheet'

type ChoreKey = 'cachepots' | 'settling' | 'sachets'

type Chore = {
  key: ChoreKey
  icon: IconName
  /** The heading over its rows. */
  title: string
  /** What the tile says under its count. */
  label: string
  /** How many are still to do; 0 once they all are. */
  waiting: number
  /** Said in place of a count, for the one chore that is not a list. */
  word?: string
  warning?: boolean
  rows: ReactNode
  action?: ReactNode
}

function useChores(): Chore[] {
  const state = useStore()
  const chores: Chore[] = []

  const pots = potsToEmpty(state)
  if (pots.length > 0) {
    chores.push({
      key: 'cachepots',
      icon: 'drain',
      title: 'Empty the cachepots',
      label: pots.length === 1 ? 'cachepot' : 'cachepots',
      waiting: pots.filter((pot) => pot.emptied === null).length,
      rows: <CachepotRows />,
      action: <AllEmptied />,
    })
  }

  const settling = settlingToday(state)
  if (settling.length > 0) {
    chores.push({
      key: 'settling',
      icon: 'settle',
      title: 'Settling in',
      label: 'settling in',
      waiting: settling.filter((item) => !tickable(item) || !doneToday(item)).length,
      rows: <SettlingRows />,
      action: <AllSettled />,
    })
  }

  const due = sachetsDue(state.sachets)
  if (due) {
    chores.push({
      key: 'sachets',
      icon: 'pest',
      title: 'Sachets',
      label: due === 'spent' ? 'sachets run out' : 'sachets',
      waiting: 1,
      word: due === 'spent' ? 'Out' : 'Order',
      warning: due === 'spent',
      rows: <SachetsDue />,
    })
  }

  return chores
}

/** `Cachepots and settling in` — what the folded line says is done. */
function doneLine(chores: readonly Chore[]): string {
  const names = chores.map((chore) => (chore.key === 'cachepots' ? 'cachepots' : chore.label))
  const joined =
    names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names.at(-1)!}`
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)} done for today`
}

// --- the phone: a strip of tiles ---------------------------------------------

export function ChoresStrip({ className }: { className?: string }) {
  const chores = useChores()
  const [open, setOpen] = useState<ChoreKey | null>(null)
  const [unfolded, setUnfolded] = useState(false)

  if (chores.length === 0) return null

  const allDone = chores.every((chore) => chore.waiting === 0)
  const shown = chores.find((chore) => chore.key === open)

  return (
    <div className={className}>
      {allDone && !unfolded ? (
        <button
          type="button"
          onClick={() => setUnfolded(true)}
          className="flex min-h-[1.875rem] items-center gap-2 text-[0.8125rem] text-ink-muted hover:text-ink"
        >
          <Icon name="check" size={15} className="shrink-0 text-leaf" />
          <span>{doneLine(chores)}</span>
        </button>
      ) : (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${chores.length}, minmax(0, 1fr))` }}
        >
          {chores.map((chore) => (
            <Tile key={chore.key} chore={chore} onOpen={() => setOpen(chore.key)} />
          ))}
        </div>
      )}

      {shown ? (
        // The sheet carries the title; inside it, only the one-press-for-all
        // where there is one, and the rows.
        <Sheet open onClose={() => setOpen(null)} title={shown.title}>
          {shown.action ? <div className="flex justify-end">{shown.action}</div> : null}
          <div className="mt-2">{shown.rows}</div>
        </Sheet>
      ) : null}
    </div>
  )
}

function Tile({ chore, onOpen }: { chore: Chore; onOpen: () => void }) {
  const done = chore.waiting === 0

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${chore.title}: ${done ? 'done' : chore.word ?? `${chore.waiting} to do`}`}
      className={cn(
        'lift flex min-h-18 flex-col items-start justify-between gap-1 rounded-md border px-3 py-2 text-left active:opacity-70',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
        chore.warning
          ? 'border-transparent bg-ember-tint text-ember'
          : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-sunk',
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        {done ? (
          <Icon name="check" size={20} className="text-leaf" />
        ) : (
          <span className="font-mono text-[1.25rem] leading-6 font-medium">
            {chore.word ?? chore.waiting}
          </span>
        )}
        <Icon name={chore.icon} size={18} className={chore.warning ? '' : 'text-ink-faint'} />
      </span>
      <span
        className={cn(
          'text-[0.8125rem] leading-4',
          chore.warning ? '' : done ? 'text-ink-faint' : 'text-ink-muted',
        )}
      >
        {chore.label}
      </span>
    </button>
  )
}

// --- the desktop: a column beside the water ----------------------------------

export function ChoresColumn({ className }: { className?: string }) {
  const chores = useChores()
  if (chores.length === 0) return null

  return (
    <aside className={cn('flex-col gap-8', className)}>
      {chores.map((chore) => (
        <ColumnSection key={chore.key} chore={chore} />
      ))}
    </aside>
  )
}

/** One chore, open — until it is all done, when it folds to the same quiet
 *  line the strip does on a phone, and opens again for the rest of the day. */
function ColumnSection({ chore }: { chore: Chore }) {
  const [unfolded, setUnfolded] = useState(false)

  if (chore.waiting === 0 && !unfolded) {
    return (
      <button
        type="button"
        onClick={() => setUnfolded(true)}
        className="flex min-h-[1.875rem] items-center gap-2 self-start text-[0.8125rem] text-ink-muted hover:text-ink"
      >
        <Icon name="check" size={15} className="shrink-0 text-leaf" />
        <span>{doneLine([chore])}</span>
      </button>
    )
  }

  return (
    <section>
      <div className="flex min-h-touch items-center justify-between gap-3 border-b border-line-strong pb-2">
        <h2 className="flex items-center gap-2 font-display text-[1.125rem] leading-6 font-medium">
          <Icon name={chore.icon} size={18} className="text-ink-faint" />
          {chore.title}
          {chore.key === 'sachets' ? null : (
            <span className="font-mono text-[0.875rem] text-ink-muted">{chore.waiting || ''}</span>
          )}
        </h2>
        {chore.action}
      </div>
      <div className={chore.key === 'sachets' ? 'mt-3' : ''}>{chore.rows}</div>
    </section>
  )
}
