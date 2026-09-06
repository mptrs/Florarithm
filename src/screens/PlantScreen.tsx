/**
 * The plant.
 *
 * This is where a sticker brings you, so it is the most important screen in the
 * app. It answers two questions and defers everything else: what is this, and
 * when did it last get anything. Care and History are the two tabs; the facts
 * that never change moved to the desktop, where managing happens.
 *
 * The drop is fixed to the bottom right and never scrolls away. Tapping it fans
 * out watered, fertilised, and a way to everything else.
 */

import { useState, type ReactNode } from 'react'
import {
  childrenOf,
  countThisYear,
  daysSinceWater,
  eventsByMonth,
  eventsFor,
  findPlant,
  isThirsty,
  lastFertilisedAt,
  lastRepot,
  lastWaterAt,
  vocabName,
  waterRhythm,
} from '~/data/selectors'
import { describeEvent, logEvent, removeEvent, useStore } from '~/data/store'
import type { Plant, PlantEvent } from '~/data/types'
import { daysSince, formatDate, formatDayMonth, formatMonthYear } from '~/lib/date'
import { formatPotSize, formatPrice, formatSpecies, label, plural } from '~/lib/format'
import { plantUrl, routes } from '~/lib/router'
import { cn } from '~/lib/cn'
import { Button } from '~/ui/Button'
import { ActionDial } from '~/ui/ActionDial'
import { Card, GroupLabel, IconChip, type ChipTone } from '~/ui/Card'
import { Icon, type IconName } from '~/ui/Icon'
import { Menu, MenuItem } from '~/ui/Menu'
import { EmptyState } from '~/ui/primitives'
import { QrCodeBox } from '~/ui/QrCode'
import { RowActions, SwipeRow } from '~/ui/SwipeRow'
import { LogSheet, type LogIntent } from './LogSheet'

type Tab = 'care' | 'history'

export function PlantScreen({ code }: { code: string }) {
  const state = useStore()
  const plant = findPlant(state, code)
  const [tab, setTab] = useState<Tab>('care')
  const [intent, setIntent] = useState<LogIntent | null>(null)
  const [dialOpen, setDialOpen] = useState(false)

  // A tombstoned plant reads exactly like a code that never existed — the
  // lookup itself stays unfiltered so an old event can still name it.
  if (!plant || plant.deleted) return <UnknownPlant code={code} ready={state.status === 'ready'} />

  const water = (fertilized: boolean) => {
    void logEvent({ type: 'water', plantCode: plant.code, fertilized })
  }

  return (
    <div className="-mx-4 -mt-6 md:mx-0 md:mt-0">
      <Hero plant={plant} onLog={() => setIntent({ kind: 'new' })} />

      {/* The sheet of content rides up over the bottom of the hero. */}
      <div className="relative -mt-6 rounded-t-[1.75rem] bg-paper px-4 pt-5 md:mt-6 md:rounded-none md:px-0 md:pt-0">
        <h1 className="font-display text-[2.5rem] leading-[2.6875rem] font-medium tracking-[-0.025em]">
          {plant.name}
        </h1>
        {formatSpecies(plant) ? (
          <p className="mt-1.5 text-[1.0625rem] leading-6 text-ink-muted">{formatSpecies(plant)}</p>
        ) : null}

        {plant.wish ? (
          <WishActions plant={plant} />
        ) : (
          <>
            {/* Two layouts, one markup. A phone tabs between the state and the
                record because there is room for one of them; a desktop shows
                both, with the facts you only ever manage sitting beside them. */}
            <Tabs tab={tab} onChange={setTab} />
            <div className="md:flex md:items-start md:gap-8">
              <div
                className={cn(
                  'md:order-2 md:w-[21rem] md:shrink-0',
                  tab === 'care' ? '' : 'hidden md:block',
                )}
              >
                <Care plant={plant} />
                <Details plant={plant} />
                <Family plant={plant} />
              </div>
              <div
                className={cn(
                  'md:order-1 md:min-w-0 md:flex-1',
                  tab === 'history' ? '' : 'hidden md:block',
                )}
              >
                <History plant={plant} onEdit={(event) => setIntent({ kind: 'edit', event })} />
              </div>
            </div>
          </>
        )}
      </div>

      {plant.wish ? null : (
        <ActionDial
          open={dialOpen}
          onToggle={setDialOpen}
          onWater={() => water(false)}
          onFertilise={() => water(true)}
          onMore={() => setIntent({ kind: 'new' })}
        />
      )}

      <LogSheet plant={plant} intent={intent} onClose={() => setIntent(null)} />
    </div>
  )
}

// --- the hero ---------------------------------------------------------------

/**
 * Photographs arrive in M3. Until they do this is a drawn plate rather than a
 * grey box with a camera in it — a plant with no photo still looks like it
 * belongs in the book — and it is shorter than the full hero will be, because
 * a tall empty rectangle on every plant is a worse answer than a short one.
 */
function Hero({ plant, onLog }: { plant: Plant; onLog: () => void }) {
  const state = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const place = vocabName(state, plant.locationId)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(plantUrl(plant.code))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be refused; the QR is the other way to the same link.
      setShowQr(true)
    }
  }

  return (
    <div className="relative h-[13.5rem] overflow-hidden bg-sunk md:h-56 md:rounded-xl">
      <Plate />

      <div className="absolute inset-x-4 top-4 flex items-start justify-between">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) window.history.back()
            else window.location.assign(routes.today())
          }}
          aria-label="Back"
          className="flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-md active:opacity-70"
        >
          <Icon name="back" size={19} />
        </button>

        <div className="relative flex items-center gap-2">
          {copied ? (
            <span className="rounded-full bg-surface/90 px-3 py-1.5 text-[0.8125rem] font-medium text-leaf shadow-md">
              Copied
            </span>
          ) : null}
          {/* A desktop keeps everything behind the ellipsis — there is room
              for a menu there, and the page is for managing rather than for
              one-handed reach. */}
          <a
            href={routes.edit(plant.code)}
            aria-label="Edit this plant"
            className="flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-md active:opacity-70 md:hidden"
          >
            <Icon name="edit" size={19} />
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="More"
            aria-haspopup="menu"
            className="flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-md active:opacity-70"
          >
            <Icon name="more" size={19} />
          </button>

          <Menu open={menuOpen} onClose={() => setMenuOpen(false)} label={plant.name}>
            <MenuItem
              icon="plus"
              label="Log activity"
              className="hidden md:flex"
              onClick={() => {
                setMenuOpen(false)
                onLog()
              }}
            />
            <MenuItem
              icon="link"
              label="Copy the tag link"
              onClick={() => {
                setMenuOpen(false)
                void copyLink()
              }}
            />
            <MenuItem
              icon="qr"
              label="Show the QR code"
              onClick={() => {
                setMenuOpen(false)
                setShowQr(true)
              }}
            />
            <MenuItem
              icon="edit"
              label="Edit this plant"
              onClick={() => window.location.assign(routes.edit(plant.code))}
            />
          </Menu>
        </div>
      </div>

      {place && place !== '—' ? (
        <div className="absolute inset-x-4 bottom-9">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3.5 py-2 text-[0.875rem] font-semibold text-ink shadow-md">
            <Icon name="place" size={16} className="text-leaf" />
            {place}
          </span>
        </div>
      ) : null}

      {showQr ? (
        <button
          type="button"
          aria-label="Hide the QR code"
          onClick={() => setShowQr(false)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-paper/95"
        >
          <QrCodeBox value={plantUrl(plant.code)} size={112} />
          <span className="font-mono text-code tracking-[0.1em] text-ink-muted">{plant.code}</span>
        </button>
      ) : null}
    </div>
  )
}

/** The stand-in, drawn rather than photographed. */
function Plate() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 160"
      preserveAspectRatio="xMidYMid slice"
      className="size-full text-line-strong"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5">
        <path d="M120 148c-26 0-46-22-46-52 0-34 22-62 46-84 24 22 46 50 46 84 0 30-20 52-46 52Z" />
        <path d="M120 148V22" />
        <path d="M120 60c-10-6-20-10-32-11M120 60c10-6 20-10 32-11" />
        <path d="M120 92c-13-7-26-11-40-12M120 92c13-7 26-11 40-12" />
        <path d="M120 124c-11-6-22-9-34-10M120 124c11-6 22-9 34-10" />
      </g>
    </svg>
  )
}

// --- tabs -------------------------------------------------------------------

function Tabs({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div role="tablist" className="mt-5 flex border-b border-line md:hidden">
      {(['care', 'history'] as const).map((key) => (
        <button
          key={key}
          role="tab"
          type="button"
          aria-selected={tab === key}
          onClick={() => onChange(key)}
          className={cn(
            'h-12 flex-1 border-b-2 text-body capitalize',
            tab === key
              ? 'border-leaf font-semibold text-leaf'
              : 'border-transparent font-medium text-ink-muted',
          )}
        >
          {key}
        </button>
      ))}
    </div>
  )
}

// --- care -------------------------------------------------------------------

function Care({ plant }: { plant: Plant }) {
  const state = useStore()
  const days = daysSinceWater(state, plant.code)
  const rhythm = waterRhythm(state, plant.code)
  const water = lastWaterAt(state, plant.code)
  const fertilised = lastFertilisedAt(state, plant.code)
  const repot = lastRepot(state, plant.code)

  return (
    <Card className="mt-3.5 px-4.5">
      <CareRow
        icon="droplet"
        tone="water"
        label="Last watered"
        detail={rhythm ? `every ${rhythm.average} days · ${rhythm.min}–${rhythm.max}` : null}
        value={water === null ? 'never' : ago(days)}
        alert={isThirsty(days)}
      />
      <CareRow
        icon="fertilizer"
        tone="leaf"
        label="Last fertilised"
        value={fertilised === null ? 'never' : ago(daysSince(fertilised))}
      />
      <CareRow
        icon="pot"
        tone="leaf"
        label="Last repot"
        detail={repot?.toSize ? `${repot.fromSize ?? '?'} → ${repot.toSize} cm` : null}
        value={repot ? formatDate(repot.date) : 'never'}
        last
      />
    </Card>
  )
}

/** `8 days ago`, `today`, `yesterday` — the shapes a person actually says. */
function ago(days: number | null): string {
  if (days === null) return 'never'
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function CareRow({
  icon,
  tone,
  label,
  detail,
  value,
  alert = false,
  last = false,
}: {
  icon: IconName
  tone: ChipTone
  label: string
  detail?: string | null
  value: string
  alert?: boolean
  last?: boolean
}) {
  return (
    <div
      className={cn('flex items-center gap-3.5 py-3.5', last ? '' : 'border-b border-line')}
    >
      <IconChip icon={icon} tone={tone} size={38} />
      <div className="min-w-0 flex-1">
        <div className="text-[0.9375rem] font-medium">{label}</div>
        {detail ? <div className="mt-px text-[0.8125rem] text-ink-faint">{detail}</div> : null}
      </div>
      <div
        className={cn(
          'shrink-0 text-right font-mono text-[0.875rem]',
          alert ? 'font-semibold text-ember' : 'text-ink-muted',
        )}
      >
        {value}
      </div>
    </div>
  )
}

// --- details ----------------------------------------------------------------

/**
 * Everything about the plant that is not its state.
 *
 * Desktop only, deliberately. On a phone you are stood in front of the plant
 * and want to know one thing; this is the reading you do at a desk, which is
 * also where you would change any of it.
 */
function Details({ plant }: { plant: Plant }) {
  const state = useStore()
  const leaves = countThisYear(state, plant.code, 'leaf')
  const blooms = countThisYear(state, plant.code, 'bloom')
  const medium = vocabName(state, plant.mediumId)
  const origin = [plant.origin.type ? label(plant.origin.type) : null, plant.origin.from]
    .filter(Boolean)
    .join(' · ')

  const rows: { icon: IconName; value: ReactNode }[] = []
  if (medium && medium !== '—') rows.push({ icon: 'medium', value: medium })
  rows.push({
    icon: 'ruler',
    value: [formatPotSize(plant.potSize), label(plant.system)].filter((part) => part && part !== '—').join(' · '),
  })
  if (leaves + blooms > 0) {
    rows.push({
      icon: 'leaf',
      value: [
        leaves > 0 ? plural(leaves, 'leaf', 'leaves') : null,
        blooms > 0 ? plural(blooms, 'bloom') : null,
      ]
        .filter(Boolean)
        .join(' and ') + ' this year',
    })
  }
  if (origin || plant.origin.price !== null) {
    rows.push({
      icon: 'receipt',
      value: [origin, plant.origin.price === null ? null : formatPrice(plant.origin.price)]
        .filter(Boolean)
        .join(' · '),
    })
  }
  if (plant.origin.date) {
    rows.push({ icon: 'calendar', value: `In the collection since ${formatDate(plant.origin.date)}` })
  }

  if (rows.length === 0) return null

  return (
    <section className="mt-7 hidden md:block">
      <GroupLabel>Details</GroupLabel>
      <Card className="mt-2 px-4.5">
        {rows.map((row, index) => (
          <div
            key={row.icon}
            className={cn(
              'flex items-center gap-3.5 py-3',
              index === rows.length - 1 ? '' : 'border-b border-line',
            )}
          >
            <Icon name={row.icon} size={19} className="text-ink-faint" />
            <span className="text-[0.9375rem] leading-5">{row.value}</span>
          </div>
        ))}
      </Card>
    </section>
  )
}

// --- history ----------------------------------------------------------------

type Filter = 'all' | 'notable' | 'water'

const TONE: Record<PlantEvent['type'], ChipTone> = {
  water: 'water',
  repot: 'leaf',
  leaf: 'leaf',
  bloom: 'leaf',
  note: 'ink',
}

const GLYPH: Record<PlantEvent['type'], IconName> = {
  water: 'droplet',
  repot: 'pot',
  leaf: 'leaf',
  bloom: 'bloom',
  note: 'note',
}

function History({ plant, onEdit }: { plant: Plant; onEdit: (event: PlantEvent) => void }) {
  const state = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const all = eventsFor(state, plant.code)

  const waterings = all.filter((event) => event.type === 'water').length
  const shown =
    filter === 'all'
      ? all
      : filter === 'water'
        ? all.filter((event) => event.type === 'water')
        : all.filter((event) => event.type !== 'water')

  if (all.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState
          title="Nothing logged yet"
          description="Every watering, leaf, bloom, repot and note shows up here, newest first."
        />
      </div>
    )
  }

  return (
    <section className="mt-4">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip selected={filter === 'all'} onClick={() => setFilter('all')} count={all.length}>
          Everything
        </FilterChip>
        <FilterChip selected={filter === 'notable'} onClick={() => setFilter('notable')}>
          Notable
        </FilterChip>
        <FilterChip
          selected={filter === 'water'}
          onClick={() => setFilter('water')}
          count={waterings}
        >
          Waterings
        </FilterChip>
      </div>

      {eventsByMonth(shown).map(([key, events]) => (
        <div key={key}>
          <GroupLabel className="mt-5">{formatMonthYear(events[0]!.date)}</GroupLabel>
          <Card className="mt-2 overflow-hidden">
            {events.map((event, index) => (
              <EntryRow
                key={event.id}
                event={event}
                last={index === events.length - 1}
                onEdit={onEdit}
              />
            ))}
          </Card>
        </div>
      ))}

      <p className="mt-4 px-0.5 text-[0.8125rem] leading-[1.125rem] text-ink-faint text-pretty">
        {plural(shown.length, 'entry', 'entries')} — drag one left to remove it, right to change it.
      </p>
    </section>
  )
}

function FilterChip({
  selected,
  onClick,
  count,
  children,
}: {
  selected: boolean
  onClick: () => void
  count?: number
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[0.875rem] whitespace-nowrap',
        selected
          ? 'bg-ink font-semibold text-paper'
          : 'border border-line-strong font-medium text-ink-muted',
      )}
    >
      {children}
      {count === undefined ? null : (
        <span className={cn('font-mono text-micro', selected ? 'opacity-70' : 'text-ink-faint')}>
          {count}
        </span>
      )}
    </button>
  )
}

/** A note or a repot can be rewritten; a watering is a moment, and there is
 *  nothing in it to correct except the fact that it happened. */
function isEditable(event: PlantEvent): boolean {
  return event.type === 'note' || event.type === 'repot'
}

function EntryRow({
  event,
  last,
  onEdit,
}: {
  event: PlantEvent
  last: boolean
  onEdit: (event: PlantEvent) => void
}) {
  const state = useStore()
  const title = describeEvent(event)
  const detail = detailOf(event, state)
  const edit = isEditable(event) ? () => onEdit(event) : undefined
  const remove = () => void removeEvent(event.id)
  const editLabel = `Change ${title.toLowerCase()} of ${formatDayMonth(event.date)}`
  const deleteLabel = `Delete ${title.toLowerCase()} of ${formatDayMonth(event.date)}`

  return (
    <SwipeRow
      onEdit={edit}
      onDelete={remove}
      editLabel={editLabel}
      deleteLabel={deleteLabel}
      className={cn('group', last ? '' : 'border-b border-line')}
    >
      <div className="flex items-center gap-3.5 px-4.5 py-3">
        <IconChip icon={GLYPH[event.type]} tone={TONE[event.type]} />
        <div className="min-w-0 flex-1">
          <div className="text-[0.9375rem] font-medium">{title}</div>
          {detail ? (
            <div className="mt-px text-[0.8125rem] leading-[1.125rem] text-ink-muted">{detail}</div>
          ) : null}
        </div>
        <span className="shrink-0 font-mono text-micro text-ink-faint group-hover:md:hidden">
          {formatDayMonth(event.date)}
        </span>
        <RowActions
          onEdit={edit}
          onDelete={remove}
          editLabel={editLabel}
          deleteLabel={deleteLabel}
        />
      </div>
    </SwipeRow>
  )
}

function detailOf(event: PlantEvent, state: ReturnType<typeof useStore>): string {
  switch (event.type) {
    case 'water':
      return event.fertilized ? 'with fertiliser' : ''
    case 'repot': {
      const size = event.toSize ? `${event.fromSize ?? '?'} → ${event.toSize} cm` : ''
      const medium = event.mediumId ? vocabName(state, event.mediumId) : ''
      return [size, medium, event.reason].filter(Boolean).join(' · ')
    }
    case 'note':
      return event.text
    default:
      return ''
  }
}

// --- family -----------------------------------------------------------------

function Family({ plant }: { plant: Plant }) {
  const state = useStore()
  const parent = plant.parent ? findPlant(state, plant.parent.code) : null
  const children = childrenOf(state, plant.code)

  if (!parent && children.length === 0) return null

  return (
    <section className="mt-7">
      <GroupLabel>Family</GroupLabel>
      <Card className="mt-2 px-4.5">
        {parent && plant.parent ? (
          <a
            href={routes.plant(parent.code)}
            className="flex min-h-touch items-center gap-3.5 border-b border-line py-3 last:border-b-0"
          >
            <Icon name="scissors" size={19} className="text-ink-faint" />
            <span className="flex-1 font-display text-[1.125rem] font-medium text-leaf">
              {parent.name}
            </span>
            <span className="text-[0.8125rem] text-ink-muted">
              grown from a {plant.parent.method}
            </span>
          </a>
        ) : null}

        {children.map((child) => (
          <a
            key={child.code}
            href={routes.plant(child.code)}
            className="flex min-h-touch items-center gap-3.5 border-b border-line py-3 last:border-b-0"
          >
            <Icon name="scissors" size={19} className="text-ink-faint" />
            <span className="flex-1 font-display text-[1.125rem] font-medium text-leaf">
              {child.name}
            </span>
            <span className="text-[0.8125rem] text-ink-muted">
              {child.parent?.method} · {formatDayMonth(child.createdAt)}
            </span>
          </a>
        ))}
      </Card>
    </section>
  )
}

// --- wishlist ---------------------------------------------------------------

function WishActions({ plant }: { plant: Plant }) {
  return (
    <Card className="mt-5 flex flex-col gap-3 p-4">
      <GroupLabel>On the wishlist</GroupLabel>
      {plant.wishNote ? <p className="text-[0.9375rem] text-ink">{plant.wishNote}</p> : null}
      <Button variant="accent" onClick={() => window.location.assign(routes.have(plant.code))}>
        I have this now
      </Button>
    </Card>
  )
}

// --- a code that is not yours -----------------------------------------------

/** A scan that lands nowhere is the one moment this app can feel broken. It
 *  gets a real page with the code on it, not an empty list. */
function UnknownPlant({ code, ready }: { code: string; ready: boolean }) {
  if (!ready) return null

  return (
    <div className="flex flex-col gap-5">
      <p className="font-mono text-[1.625rem] tracking-[0.1em]">{code}</p>
      <EmptyState
        title="No plant with this code"
        description="Either this sticker belongs to someone else, or you have not added this one yet."
        action={
          <Button variant="accent" onClick={() => window.location.assign(routes.new())}>
            Add a plant
          </Button>
        }
      />
    </div>
  )
}
