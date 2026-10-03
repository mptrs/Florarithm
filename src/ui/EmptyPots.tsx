/**
 * The cachepots to empty — every plant on soil, the day after it had water.
 *
 * A round of the house with the pots tipped over the sink one after another,
 * and walking back to each sticker to say so would turn a two-minute chore
 * into a second round. The watering it follows is ticked off the same way, on
 * the ledger below: one round, one list.
 *
 * Whether a pot is on the list is read out of the log by `potsToEmpty`, so
 * there is nothing to clear: an emptied pot is simply no longer owed. A tick
 * stays on its row for the rest of the day, so pressing it again takes the
 * entry back out — the same correction-where-you-see-it rule as the history,
 * without a history row to do it from.
 *
 * Not the check mark. On Today a check already means watered, and the two
 * would read as one fact in two places. The glyph is a pot tipped over.
 */

import { useState } from 'react'
import { emptyPots, removeEvent, useStore, type State } from '~/data/store'
import {
  groupByPlace,
  potsToEmpty,
  UNEMPTIED_AFTER_DAYS,
  type PotToEmpty,
} from '~/data/selectors'
import { daysSince } from '~/lib/date'
import { cn } from '~/lib/cn'
import { formatSpecies, plural } from '~/lib/format'
import { Button } from './Button'
import { Icon } from './Icon'
import { PlantThumb } from './plantPicture'
import { Rows } from './primitives'
import { ColumnHeader, DrawerLabel } from './rows'

/**
 * The pots cut into rooms by the ledger's own `groupByPlace` — because emptying
 * is a round of the house, and a round goes room by room. Grouping keeps the
 * order it is given, so a room stays longest-waiting first.
 */
function potsByPlace(state: State, pots: readonly PotToEmpty[]): [string, PotToEmpty[]][] {
  const byCode = new Map(pots.map((pot) => [pot.plant.code, pot]))
  return groupByPlace(
    state,
    pots.map((pot) => pot.plant),
  ).map(([place, plants]) => [place, plants.map((plant) => byCode.get(plant.code)!)])
}

/**
 * The block on Today, and nothing at all when no pot is owed — the same rule as
 * the sachets: a reminder that is always there is a reminder nobody reads.
 *
 * Once every pot on it is emptied it folds to a single quiet line, which opens
 * again for as long as the day lasts, in case one of those ticks was a mis-tap.
 */
export function EmptyPotsReminder() {
  const state = useStore()
  const pots = potsToEmpty(state)
  const [opened, setOpened] = useState(false)

  if (pots.length === 0) return null

  const waiting = pots.filter((pot) => pot.emptied === null)

  if (waiting.length === 0 && !opened) {
    return (
      <button
        type="button"
        onClick={() => setOpened(true)}
        className="flex min-h-[1.875rem] items-center gap-2 self-start text-[0.8125rem] text-ink-muted hover:text-ink"
      >
        <Icon name="drain" size={15} className="shrink-0 text-ink-faint" />
        <span>
          {pots.length === 1 ? 'Cachepot emptied' : `${plural(pots.length, 'cachepot')} emptied`}
        </span>
      </button>
    )
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-touch items-center justify-between gap-3 border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <Icon name="drain" size={19} className="text-ink-faint" />
          <h2 className="font-display text-[1.3125rem] leading-7 font-medium">Empty the cachepots</h2>
        </div>
        {/* Only when there is more than one left: for a single pot it is the
            same press as the row's own, said twice. */}
        {waiting.length > 1 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void emptyPots(waiting.map((pot) => pot.plant.code))}
          >
            All emptied
          </Button>
        ) : null}
      </div>

      {/* The same table head as the ledger below, so the two lists read as one
          kind of list. Only from `lg`, where there are columns to head. */}
      <div className="hidden items-center gap-3 border-b border-line-strong px-3 pb-2 lg:flex">
        <span className="w-10 shrink-0" />
        <ColumnHeader className="flex-1">Plant</ColumnHeader>
        <ColumnHeader className="w-28 text-right">Watered</ColumnHeader>
        <span className="w-touch shrink-0" />
      </div>

      {potsByPlace(state, pots).map(([place, members]) => (
        <div key={place} className="mt-4 first:mt-2 lg:first:mt-4">
          <DrawerLabel name={place} count={members.length} />
          <Rows className="border-t-0">
            {members.map((pot) => (
              <PotRow key={pot.plant.code} pot={pot} />
            ))}
          </Rows>
        </div>
      ))}
    </section>
  )
}

/** `yesterday`, `3 days ago` — counted from the watering that filled the pot. */
function wateredPhrase(days: number): string {
  return days === 1 ? 'yesterday' : `${plural(days, 'day')} ago`
}

function PotRow({ pot }: { pot: PotToEmpty }) {
  const days = daysSince(pot.wateredAt)
  const emptied = pot.emptied !== null
  const late = !emptied && days >= UNEMPTIED_AFTER_DAYS
  const species = formatSpecies(pot.plant)

  return (
    <div className="flex min-h-touch items-center gap-3 border-b border-line px-3 py-3">
      <PlantThumb plant={pot.plant} />

      <div className={cn('flex min-w-0 flex-1 flex-col', emptied && 'text-ink-faint')}>
        <span className="truncate font-display text-[1.09375rem] leading-[1.375rem] font-medium">
          {pot.plant.name}
        </span>
        {/* The species, as on every other row; the room is the drawer label. */}
        {species ? (
          <span
            className={cn(
              'truncate text-[0.8125rem] leading-[1.0625rem]',
              emptied ? 'text-ink-faint' : 'text-ink-muted',
            )}
          >
            {species}
          </span>
        ) : null}
      </div>

      {/* Since the watering, in ember once it has been forgotten rather than
          put off. A column from `lg`, under the head that names it. */}
      <span
        className={cn(
          'shrink-0 text-right text-[0.8125rem] whitespace-nowrap lg:w-28 lg:text-[0.875rem]',
          emptied ? 'text-ink-faint' : late ? 'font-semibold text-ember' : 'text-ink-muted',
        )}
      >
        {emptied ? 'emptied' : wateredPhrase(days)}
      </span>

      {/* Round because it is an icon alone; outlined while owed and filled
          with the water tint once done, the way the drop on a plant's page
          holds its ground after a press. */}
      <button
        type="button"
        aria-pressed={emptied}
        aria-label={`${pot.plant.name}: cachepot emptied`}
        title={emptied ? 'Emptied — press to take it back' : 'Emptied'}
        onClick={() =>
          void (pot.emptied ? removeEvent(pot.emptied.id) : emptyPots([pot.plant.code]))
        }
        className={cn(
          'lift flex size-touch shrink-0 items-center justify-center rounded-full active:opacity-70',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
          emptied
            ? 'border border-transparent bg-water-tint text-water'
            : 'border border-line-strong text-ink-muted hover:border-ink-faint hover:text-ink',
        )}
      >
        <Icon name="drain" size={20} />
      </button>
    </div>
  )
}
