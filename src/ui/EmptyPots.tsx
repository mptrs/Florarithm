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
import { DrawerLabel } from './rows'

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
 * The pots still to empty, cut into rooms — the rows only. Where they sit is
 * Today's business: a sheet behind a tile on a phone, a section in the column
 * beside the water on a desktop. See `Chores`.
 */
export function CachepotRows() {
  const state = useStore()
  const pots = potsToEmpty(state)

  return (
    <>
      {potsByPlace(state, pots).map(([place, members]) => (
        <div key={place} className="mt-4 first:mt-2">
          <DrawerLabel name={place} count={members.length} />
          <Rows className="border-t-0">
            {members.map((pot) => (
              <PotRow key={pot.plant.code} pot={pot} />
            ))}
          </Rows>
        </div>
      ))}
    </>
  )
}

/** Every pot still owed, in one press — only when there is more than one,
 *  since for a single pot it is the same press as the row's own. */
export function AllEmptied() {
  const state = useStore()
  const waiting = potsToEmpty(state).filter((pot) => pot.emptied === null)
  if (waiting.length < 2) return null

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => void emptyPots(waiting.map((pot) => pot.plant.code))}
    >
      All emptied
    </Button>
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
          'shrink-0 text-right text-[0.8125rem] whitespace-nowrap',
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
