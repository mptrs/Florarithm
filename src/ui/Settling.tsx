/**
 * Settling in, on screen: a card on the plant's own page for each of the few
 * weeks of different care it is in, and a block on Today for whatever of it
 * asks for something today. What each kind is and how long it runs is in
 * `settling.ts`; this is only how it reads.
 *
 * On Today it is a list cut from the same cloth as the cachepots: one round
 * button per row, and a second press on a row takes back the first. Its glyph is the thing being done — the lid
 * off is wind, a watering from the top is the drop — never the check, which on
 * Today already means watered.
 */

import {
  HARDEN_WEEKS,
  LONGER_DAYS,
  PON_EVERY_DAYS,
  doneToday,
  settlingOf,
  settlingToday,
  type Hardening,
  type IntoPon,
  type Quarantine,
  type Settling,
} from '~/data/settling'
import {
  airPlants,
  logEvent,
  removeEvent,
  settleLonger,
  skipHardening,
  startSettling,
  useStore,
} from '~/data/store'
import { addDays, formatDayMonth } from '~/lib/date'
import { cn } from '~/lib/cn'
import { formatSpecies, plural } from '~/lib/format'
import { navigate, routes } from '~/lib/router'
import { Button } from './Button'
import { Card, GroupLabel, IconChip } from './Card'
import { Icon, type IconName } from './Icon'
import { PlantThumb } from './plantPicture'
import { showToast } from './toast'
import { Rows } from './primitives'

// --- the plant page ---------------------------------------------------------

/** One card per kind the plant is in, leading Care while it lasts. */
export function SettlingCards({ code }: { code: string }) {
  const state = useStore()
  const items = settlingOf(state, code)
  if (items.length === 0) return null

  return (
    <>
      {items.map((item) =>
        item.kind === 'harden' ? (
          <HardeningCard key={item.kind} item={item} />
        ) : item.kind === 'pon' ? (
          <PonCard key={item.kind} item={item} />
        ) : (
          <QuarantineCard key={item.kind} item={item} />
        ),
      )}
    </>
  )
}

function CardHead({ title, item }: { title: string; item?: { day: number; length: number } }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <GroupLabel>{title}</GroupLabel>
      {item ? (
        <span className="text-[0.8125rem] text-ink-faint">
          day <span className="font-mono">{Math.min(item.day + 1, item.length)}</span> of{' '}
          <span className="font-mono">{item.length}</span>
        </span>
      ) : null}
    </div>
  )
}

/** A quiet, underlined press: offered rather than asked for. */
function QuietLink({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-touch shrink-0 text-[0.8125rem] text-ink-muted underline decoration-line-strong underline-offset-3 hover:text-ink hover:decoration-ink-faint"
    >
      {children}
    </button>
  )
}

function HardeningCard({ item }: { item: Hardening }) {
  const code = item.plant.code

  if (item.phase === 'waiting') {
    return (
      <section className="mt-8">
        <CardHead title="Hardening off" />
        <Card className="mt-2 flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[0.9375rem] font-medium">Not yet</div>
            <div className="text-[0.8125rem] text-ink-faint text-pretty">
              Start at its first leaf or good roots
            </div>
          </div>
          <Button variant="accent" size="sm" onClick={() => void startSettling(code, 'harden')}>
            Start today
          </Button>
        </Card>
        <QuietLink onClick={() => void skipHardening(code)}>Already used to the air</QuietLink>
      </section>
    )
  }

  const week = HARDEN_WEEKS[item.week]!
  const tickable = item.week < 3 || item.day === 21 || item.airedToday !== null
  const done = item.airedToday !== null

  return (
    <section className="mt-8">
      <CardHead title="Hardening off" item={item} />
      <Card className="mt-2 px-2 pt-2">
        <ol className="grid grid-cols-4 gap-1">
          {HARDEN_WEEKS.map((each, index) => {
            const passed = index < item.week
            const now = index === item.week
            return (
              <li
                key={each.name}
                aria-current={now ? 'step' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg pt-3 pb-3',
                  now ? 'bg-leaf-tint text-leaf' : 'text-ink-faint',
                )}
              >
                <span className="font-mono text-micro uppercase tracking-[0.06em]">
                  Week {index + 1}
                </span>
                <span
                  className={cn(
                    'font-display text-[1.1875rem] leading-6 font-medium',
                    passed ? 'text-ink-muted' : '',
                  )}
                >
                  {each.name}
                </span>
                <span className="flex h-4 items-center text-[0.6875rem]">
                  {passed ? (
                    <Icon name="check" size={14} className="text-leaf" />
                  ) : now ? (
                    'now'
                  ) : null}
                </span>
              </li>
            )
          })}
        </ol>
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-line px-2 py-3">
          <div className={cn('min-w-0', done ? 'text-ink-faint' : '')}>
            <div className="text-[0.9375rem] font-medium">{week.today}</div>
            <div className="text-[0.8125rem] text-ink-faint">
              {done ? 'done today' : `since ${formatDayMonth(item.start.date)}`}
            </div>
          </div>
          {/* Leaf rather than the water tint once pressed: this is the lid,
              not a watering. Same shape and floor as a small Button. */}
          {tickable ? (
            <button
              type="button"
              aria-pressed={done}
              title={done ? 'Done — press to take it back' : undefined}
              onClick={() =>
                void (item.airedToday ? removeEvent(item.airedToday.id) : airPlants([item.plant.code]))
              }
              className={cn(
                'lift inline-flex h-touch shrink-0 items-center gap-2 rounded-md px-4 text-[0.875rem] font-semibold active:opacity-70',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
                done
                  ? 'border border-transparent bg-leaf-tint text-leaf hover:text-leaf-deep'
                  : 'border border-line-strong text-ink hover:border-ink-faint hover:bg-sunk',
              )}
            >
              <Icon name="air" size={16} />
              Done
            </button>
          ) : null}
        </div>
      </Card>
    </section>
  )
}

function PonCard({ item }: { item: IntoPon }) {
  const next = item.wateredToday
    ? 'done today'
    : item.nextIn === 0
      ? 'today'
      : item.nextIn === 1
        ? 'tomorrow'
        : `in ${item.nextIn} days`

  return (
    <section className="mt-8">
      <CardHead title="Into pon" item={item} />
      <Card className="mt-2 px-4">
        <div className="flex items-center gap-3 py-3">
          <IconChip icon="droplet" tone="water" size={38} />
          <div className="min-w-0 flex-1">
            <div className="text-[0.9375rem] font-medium">Water from the top</div>
            <div className="text-[0.8125rem] text-ink-faint">
              every {PON_EVERY_DAYS} days, not the reservoir
            </div>
          </div>
          <div
            className={cn(
              'shrink-0 text-right text-[0.875rem]',
              item.due && !item.wateredToday ? 'font-semibold text-water' : 'font-mono text-ink-muted',
            )}
          >
            {next}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line py-1">
          <span className="min-w-0 truncate font-mono text-micro uppercase tracking-[0.04em] text-ink-muted">
            {item.waterings.length > 0
              ? item.waterings.map((event) => formatDayMonth(event.date)).join(' · ')
              : `since ${formatDayMonth(item.start.date)}`}
          </span>
          <Longer item={item} kind="pon" />
        </div>
      </Card>
    </section>
  )
}

function QuarantineCard({ item }: { item: Quarantine }) {
  const left = item.length - item.day

  return (
    <section className="mt-8">
      <CardHead title="Quarantine" item={item} />
      <Card className="mt-2 px-4">
        <div className="flex items-center gap-3 py-3">
          <IconChip icon="place" tone="ink" size={38} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.9375rem] font-medium">In {item.place.name}</div>
            <div className="text-[0.8125rem] text-ink-faint">
              since {formatDayMonth(item.since)}
            </div>
          </div>
          <div
            className={cn(
              'shrink-0 text-right text-[0.875rem]',
              left > 0 ? 'font-mono text-ink-muted' : 'font-semibold text-leaf',
            )}
          >
            {left > 0 ? `${plural(left, 'day')} to go` : 'can come down'}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-line py-1">
          <Longer item={item} kind="quarantine" />
        </div>
      </Card>
    </section>
  )
}

/**
 * Offered until it is pressed, and then not again while those two weeks run:
 * a second press on top of the first is more likely a mis-tap than a plan.
 * What stands in its place says it was done.
 */
function Longer({ item, kind }: { item: IntoPon | Quarantine; kind: 'pon' | 'quarantine' }) {
  if (item.extended) {
    return (
      <span className="flex min-h-touch shrink-0 items-center text-[0.8125rem] text-ink-faint">
        two weeks longer
      </span>
    )
  }
  return <QuietLink onClick={() => void longer(item, kind)}>2 weeks longer</QuietLink>
}

/** Two weeks more, said back with the new last day: the card only changes a
 *  number, which is easy to miss under a thumb. */
async function longer(item: IntoPon | Quarantine, kind: 'pon' | 'quarantine'): Promise<void> {
  await settleLonger(item.plant.code, kind)
  const left = item.length + LONGER_DAYS - item.day
  showToast(`Two weeks longer — until ${formatDayMonth(addDays(new Date(), left).toISOString())}`)
}

// --- Today ------------------------------------------------------------------

/** The rows on Today that a single press ticks off, for All done. */
export function tickable(item: Settling): boolean {
  return (item.kind === 'harden' && item.phase === 'running') || item.kind === 'pon'
}

function tick(item: Settling): Promise<unknown> {
  if (item.kind === 'harden' && item.phase === 'running') {
    return item.airedToday ? removeEvent(item.airedToday.id) : airPlants([item.plant.code])
  }
  if (item.kind === 'pon') {
    return item.wateredToday
      ? removeEvent(item.wateredToday.id)
      : logEvent({ type: 'water', plantCode: item.plant.code, fertilized: true })
  }
  return Promise.resolve()
}

/** Whatever of settling in asks for something today — the rows only; see
 *  `Chores` for where they sit. */
export function SettlingRows() {
  const state = useStore()
  return (
    <Rows className="border-t-0">
      {settlingToday(state).map((item) => (
        <SettlingRow key={`${item.kind}-${item.plant.code}`} item={item} />
      ))}
    </Rows>
  )
}

/** Every tick still owed, in one press — only when there is more than one. */
export function AllSettled() {
  const state = useStore()
  const waiting = settlingToday(state).filter((item) => tickable(item) && !doneToday(item))
  if (waiting.length < 2) return null

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => void Promise.all(waiting.map((item) => tick(item)))}
    >
      All done
    </Button>
  )
}

function rowText(item: Settling): [string, string] {
  if (item.kind === 'harden') {
    if (item.phase === 'waiting') {
      return ['harden off?', `TC · ${Math.floor(item.daysIn / 7)} wk in`]
    }
    return [HARDEN_WEEKS[item.week]!.short, `week ${item.week + 1}`]
  }
  if (item.kind === 'pon') return ['from the top', `pon · week ${Math.floor(item.day / 7) + 1}`]
  return ['can come down', `${item.place.name} · ${Math.round(item.length / 7)} wk`]
}

const GLYPH: Record<'harden' | 'pon', IconName> = { harden: 'air', pon: 'droplet' }

function SettlingRow({ item }: { item: Settling }) {
  const done = doneToday(item)
  const species = formatSpecies(item.plant)
  const [what, meta] = rowText(item)
  const name = item.plant.name

  return (
    <div className="flex min-h-touch items-center gap-3 border-b border-line px-3 py-3">
      <PlantThumb plant={item.plant} />

      <a
        href={routes.plant(item.plant.code)}
        className={cn('flex min-w-0 flex-1 flex-col', done && 'text-ink-faint')}
      >
        <span className="truncate font-display text-[1.09375rem] leading-[1.375rem] font-medium">
          {name}
        </span>
        {species ? (
          <span
            className={cn(
              'truncate text-[0.8125rem] leading-[1.0625rem]',
              done ? 'text-ink-faint' : 'text-ink-muted',
            )}
          >
            {species}
          </span>
        ) : null}
      </a>

      <span
        className={cn(
          'shrink-0 text-right text-[0.8125rem] leading-[1.0625rem] whitespace-nowrap',
          done ? 'text-ink-faint' : 'text-ink-muted',
        )}
      >
        {done ? 'done' : what}
        <br />
        <span className="font-mono text-micro text-ink-faint">{meta}</span>
      </span>

      {item.kind === 'harden' && item.phase === 'waiting' ? (
        <Button
          size="sm"
          variant="accent"
          aria-label={`${name}: start hardening off`}
          onClick={() => void startSettling(item.plant.code, 'harden')}
          className="px-3"
        >
          Start
        </Button>
      ) : item.kind === 'quarantine' ? (
        <Button
          size="sm"
          variant="outline"
          aria-label={`${name}: move out of ${item.place.name}`}
          onClick={() => navigate(routes.edit(item.plant.code))}
          className="px-3"
        >
          Move
        </Button>
      ) : (
        <button
          type="button"
          aria-pressed={done}
          aria-label={
            item.kind === 'pon' ? `${name}: watered from the top` : `${name}: lid was off`
          }
          title={done ? 'Done — press to take it back' : undefined}
          onClick={() => void tick(item)}
          className={cn(
            'lift flex size-touch shrink-0 items-center justify-center rounded-full active:opacity-70',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
            done
              ? item.kind === 'pon'
                ? 'border border-transparent bg-water-tint text-water'
                : 'border border-transparent bg-leaf-tint text-leaf'
              : cn(
                  'border border-line-strong hover:border-ink-faint',
                  item.kind === 'pon' ? 'text-water' : 'text-ink-muted hover:text-ink',
                ),
          )}
        >
          <Icon name={GLYPH[item.kind]} size={20} />
        </button>
      )}
    </div>
  )
}
