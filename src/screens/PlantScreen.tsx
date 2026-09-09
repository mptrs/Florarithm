/**
 * The plant.
 *
 * This is where a sticker brings you, so it is the most important screen in the
 * app. It answers two questions and defers everything else: what is this, and
 * when did it last get anything. Care and History are the two tabs; the facts
 * that never change moved to the desktop, where managing happens.
 *
 * The drop is fixed to the bottom right on a phone and never scrolls away;
 * tapping it fans out watered, fertilised, and a way to everything else. A
 * desktop has no thumb to reach a floating corner with, so the same three
 * things sit on a split button on the title row instead.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePhoto } from '~/data/photos'
import {
  childrenOf,
  countThisYear,
  currentPhotoEvent,
  daysSinceWater,
  eventsByMonth,
  eventsFor,
  findPlant,
  isThirsty,
  lastFertilisedAt,
  lastRepot,
  lastWaterAt,
  vocabName,
} from '~/data/selectors'
import { describeEvent, logEvent, removeEvent, useStore } from '~/data/store'
import type { Plant, PlantEvent } from '~/data/types'
import { daysSince, formatDate, formatDayMonth, formatMonthYear } from '~/lib/date'
import { formatPotSize, formatPrice, formatSpecies, label, plural } from '~/lib/format'
import { plantUrl, routes } from '~/lib/router'
import { cn } from '~/lib/cn'
import { BackButton, Button, IconButton } from '~/ui/Button'
import { ActionDial } from '~/ui/ActionDial'
import { SplitButton } from '~/ui/SplitButton'
import { Card, GroupLabel, IconChip, type ChipTone } from '~/ui/Card'
import { Chip } from '~/ui/Chip'
import { Icon, type IconName } from '~/ui/Icon'
import { showToast } from '~/ui/toast'
import { Plate } from '~/ui/Plate'
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
  const [showQr, setShowQr] = useState(false)

  // A tombstoned plant reads exactly like a code that never existed — the
  // lookup itself stays unfiltered so an old event can still name it.
  if (!plant || plant.deleted) return <UnknownPlant code={code} ready={state.status === 'ready'} />

  /* The link on the sticker. Copying it is the everyday job — it is how a tag
     gets made — so it is a button of its own rather than a step inside the QR.
     It confirms with a toast because that is what everything else that writes
     or copies does here; a word appearing beside the button was a second
     vocabulary for the same idea. The QR is the same address for a phone with
     no keyboard, and falls out of the failure path: a browser that refuses the
     clipboard still has it. */
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(plantUrl(plant.code))
      showToast('Tag link copied')
    } catch {
      setShowQr(true)
    }
  }

  /* The pour on the dial is the answer here, so there is no toast on top of
     it — a pill sliding up to say what you just watched happen is the boring
     half of the same sentence. The exception is where the pour never plays:
     with motion suppressed the animation is the part that is missing, and the
     words become the whole of the feedback rather than a duplicate of it. */
  const water = (fertilized: boolean) => {
    void logEvent({ type: 'water', plantCode: plant.code, fertilized })
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showToast(fertilized ? `${plant.name} watered with fertiliser` : `${plant.name} watered`)
    }
  }

  return (
    <div className="relative -mx-4 -mt-6 md:mx-0 md:mt-0">
      <Hero
        plant={plant}
        showQr={showQr}
        onShowQr={() => setShowQr(true)}
        onHideQr={() => setShowQr(false)}
      />

      {/* The sheet of content rides up over the bottom of the hero, and keeps
          going over it as the page scrolls. The padding at its foot is the
          drop's own footprint: without it the last row of the record sits
          under a button that never scrolls away.

          `z-30`, not `z-10`: this `relative` + explicit z-index makes the
          sheet its own stacking context, which caps everything nested inside
          it — including the split button's own click-outside overlay, at
          `z-40` — at this number, no matter how high THAT number is. Hero's
          own controls (Back, Edit) sit at `z-20`, one sibling context over; a
          rank of 10 here lost to them every time, so the overlay could never
          catch a click landing on Hero. 30 clears Hero's 20 and still loses
          cleanly to a real modal like Sheet or the toast, both `z-50`. */}
      <div className="relative z-30 -mt-6 rounded-t-[1.75rem] bg-paper px-4 pt-5 pb-14 md:mt-6 md:rounded-none md:px-0 md:pt-0 md:pb-0">
        {/* The link is the everyday half of the tag, so it rides the name's own
            line at the far edge of it. The QR is the other half and lives down
            on the photograph, next to the place. */}
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 font-display text-[2.5rem] leading-[2.6875rem] font-medium tracking-[-0.025em]">
            {plant.name}
          </h1>
          {plant.wish ? null : (
            <div className="flex shrink-0 items-center gap-2">
              <IconButton
                icon="link"
                label="Copy the tag link"
                variant="quiet"
                className="mt-0.5"
                onClick={() => void copyLink()}
              />
              {/* The fan does this on a phone. A desktop has no thumb to reach
                  with, so the same three things sit here instead, on the row
                  that already carries this plant's identity.

                  Visibility lives on this wrapper rather than on a className
                  handed to `SplitButton` itself: the button's own root is
                  already `inline-flex` for its two segments, and `hidden` on
                  the same element loses that fight regardless of breakpoint —
                  two unconditional display utilities on one element resolve by
                  their order in the generated stylesheet, not by which one is
                  meant to win. `md:contents` un-boxes the wrapper from `md` up,
                  so the button becomes a direct flex item of the row exactly
                  as if this div were never here. */}
              <div className="hidden md:contents">
                <SplitButton
                  onWater={() => water(false)}
                  onFertilise={() => water(true)}
                  onMore={() => setIntent({ kind: 'new' })}
                />
              </div>
            </div>
          )}
        </div>
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
            {/* The split waits for `lg`. The care column is a fixed 21rem, and
                from `md` the shell is already spending 15.5rem on the sidebar —
                so at 768px the record beside it was left with about 70px to set
                a date and a title in, and the two ran straight over each other.
                Everywhere else in the app the desktop layout starts at `lg`;
                this is the one place that started early. */}
            <div className="lg:flex lg:items-start lg:gap-8">
              <div
                className={cn(
                  'lg:order-2 lg:w-[21rem] lg:shrink-0',
                  tab === 'care' ? '' : 'hidden lg:block',
                )}
              >
                <Care plant={plant} />
                <Details plant={plant} />
                <Family plant={plant} />
              </div>
              <div
                className={cn(
                  'lg:order-1 lg:min-w-0 lg:flex-1',
                  tab === 'history' ? '' : 'hidden lg:block',
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

/** How much of the picture's height is slack for it to drift through, and how
 *  fast it drifts. The two are the same number on purpose: the photograph runs
 *  out of slack at exactly the point the sheet has covered it. */
const DRIFT = 0.3

/**
 * How far the page has been scrolled, for the photograph's drift.
 *
 * A scroll listener rather than a scroll-driven CSS animation, which Safari
 * only learned recently and this has to work on the phone in your hand today.
 * Reads are coalesced into one frame, and `prefers-reduced-motion` turns the
 * whole thing off rather than slowing it down — the point of that setting is
 * that nothing moves that did not have to.
 */
function useScrolled(): number {
  const [scrolled, setScrolled] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const read = () => {
      frame = 0
      setScrolled(window.scrollY)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    read()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return scrolled
}


/**
 * The photograph, or the drawn plate standing in for one.
 *
 * A plant with no photo gets the plate rather than a grey box with a camera in
 * it, so it still looks like it belongs in the book — and the hero is shorter
 * without a photo than with one, because a tall empty rectangle on every plant
 * is a worse answer than a short one.
 */
function Hero({
  plant,
  showQr,
  onShowQr,
  onHideQr,
}: {
  plant: Plant
  showQr: boolean
  onShowQr: () => void
  onHideQr: () => void
}) {
  const state = useStore()
  const photoEvent = currentPhotoEvent(state, plant.code)
  const photo = usePhoto(photoEvent?.id ?? null)
  const frame = useRef<HTMLDivElement>(null)
  const scrolled = useScrolled()
  const place = vocabName(state, plant.locationId)

  // A photograph belongs to an event; `photo` and `photoEvent` are read from
  // two different places and can go out of step for a render or two — most
  // often the moment an event carrying the plant's current photo is deleted,
  // where `photoEvent` clears immediately but the cached object URL for the
  // id it used to point at has not been evicted yet. Showing the plate for
  // that one frame beats reading `.date` off an event that is already gone.
  const shownPhoto = photoEvent ? photo : null

  // Both layers are the same box. The picture sticks to the top of the window
  // while the sheet below slides up over it; the controls sit in that same
  // space but scroll away with the page, so they never hang over the record.
  const box = shownPhoto ? 'h-[21.25rem] md:h-72' : 'h-[13.5rem] md:h-56'

  // Clamped to the slack the picture actually has, so its bottom edge never
  // lifts off the frame and shows the paper behind it.
  const slack = (frame.current?.offsetHeight ?? 0) * DRIFT
  const drift = Math.min(scrolled * DRIFT, slack)

  return (
    <>
      <div
        ref={frame}
        className={cn('sticky top-0 z-0 overflow-hidden bg-sunk md:static md:rounded-xl', box)}
      >
        {shownPhoto ? (
          // Taller than the frame it sits in, and pulled up through that slack
          // at a fraction of the page's speed: the sheet moves, the picture
          // drifts, and the gap between the two reads as depth.
          <img
            src={shownPhoto}
            alt={`${plant.name}, photographed ${formatDate(photoEvent!.date)}`}
            style={{ transform: `translate3d(0, ${-drift}px, 0)` }}
            className="h-[130%] w-full object-cover will-change-transform"
          />
        ) : (
          <Plate />
        )}
      </div>

      {/* Above the sheet rather than under it, so the overflow menu can open
          over the record instead of being clipped by the photograph's edge.
          Transparent, so only the controls themselves take a tap. */}
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 z-20', box)}>
        <div className="pointer-events-auto absolute inset-x-4 top-4 flex items-start justify-between">
        <BackButton />

        <div className="relative flex items-center gap-2">
          <a
            href={routes.edit(plant.code)}
            aria-label="Edit this plant"
            className="lift flex size-10 items-center justify-center rounded-full bg-floating text-ink shadow-md active:opacity-70 hover:bg-surface hover:shadow-lg"
          >
            <Icon name="edit" size={19} />
          </a>
        </div>
      </div>

      {/* One line at the foot of the photograph. A failed photo displaces the
          place, because they want the same line and only one of them is news.

          The two offsets are the same line in two different layouts. On a
          phone the sheet of content rides 24px up over the photograph, so
          anything sitting lower than that is behind paper — `bottom-9` clears
          the overlap and leaves the chip a margin. From `md` the sheet starts
          below the hero instead of over it, there is nothing to clear, and the
          chip can sit where it reads best: near the frame's own edge. */}
      {plant.wish ? null : (
        <div className="pointer-events-auto absolute inset-x-4 bottom-9 flex items-center gap-2 md:bottom-4">
          {/* The other half of the tag, kept next to the place because both are
              about the pot this plant is standing in. With no place recorded it
              is simply the first thing on the line, in the corner on its own. */}
          <button
            type="button"
            onClick={onShowQr}
            aria-label="Show the QR code"
            className="lift flex size-10 shrink-0 items-center justify-center rounded-full bg-floating text-ink shadow-md active:opacity-70 hover:bg-surface hover:shadow-lg"
          >
            <Icon name="qr" size={19} />
          </button>

          {place && place !== '—' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-floating px-3.5 py-2 text-[0.875rem] font-semibold text-ink shadow-md">
              <Icon name="place" size={16} className="text-leaf" />
              {place}
            </span>
          ) : null}
        </div>
      )}

      {showQr ? (
        <button
          type="button"
          aria-label="Hide the QR code"
          onClick={onHideQr}
          className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-3 bg-veil-strong"
        >
          <QrCodeBox value={plantUrl(plant.code)} size={112} />
          <span className="font-mono text-code tracking-[0.1em] text-ink-muted">{plant.code}</span>
        </button>
      ) : null}
      </div>
    </>
  )
}

// --- tabs -------------------------------------------------------------------

function Tabs({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div role="tablist" className="mt-5 flex border-b border-line lg:hidden">
      {(['care', 'history'] as const).map((key) => (
        <button
          key={key}
          role="tab"
          type="button"
          aria-selected={tab === key}
          onClick={() => onChange(key)}
          className={cn(
            'warm h-12 flex-1 border-b-2 text-body capitalize',
            tab === key
              ? 'border-leaf font-semibold text-leaf'
              : 'border-transparent font-medium text-ink-muted hover:border-line-strong hover:text-ink',
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
  const water = lastWaterAt(state, plant.code)
  const fertilised = lastFertilisedAt(state, plant.code)
  const repot = lastRepot(state, plant.code)

  return (
    <Card className="mt-3.5 px-4.5">
      <CareRow
        icon="droplet"
        tone="water"
        label="Last watered"
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

type Filter = 'all' | 'notable' | 'water' | 'photo'

const TONE: Record<PlantEvent['type'], ChipTone> = {
  water: 'water',
  repot: 'leaf',
  leaf: 'leaf',
  bloom: 'leaf',
  note: 'ink',
  photo: 'ink',
}

const GLYPH: Record<PlantEvent['type'], IconName> = {
  water: 'droplet',
  repot: 'pot',
  leaf: 'leaf',
  bloom: 'bloom',
  note: 'note',
  photo: 'image',
}

function History({ plant, onEdit }: { plant: Plant; onEdit: (event: PlantEvent) => void }) {
  const state = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const all = eventsFor(state, plant.code)

  const waterings = all.filter((event) => event.type === 'water').length
  const photos = all.filter((event) => event.photo).length
  const shown =
    filter === 'all'
      ? all
      : filter === 'water'
        ? all.filter((event) => event.type === 'water')
        : filter === 'photo'
          ? all.filter((event) => event.photo)
          : all.filter((event) => event.type !== 'water')

  if (all.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState
          title="Nothing logged yet"
          description="Every watering, leaf, bloom, repot, note and photograph shows up here, newest first."
        />
      </div>
    )
  }

  return (
    <section className="mt-4">
      <div className="flex gap-2 overflow-x-auto -mt-1 pt-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip selected={filter === 'all'} onClick={() => setFilter('all')} count={all.length}>
          Everything
        </Chip>
        <Chip selected={filter === 'notable'} onClick={() => setFilter('notable')}>
          Notable
        </Chip>
        <Chip
          selected={filter === 'water'}
          onClick={() => setFilter('water')}
          count={waterings}
        >
          Waterings
        </Chip>
        {/* The timeline, and deliberately not a separate screen: it is the same
            record, read through the entries that happen to have a picture. */}
        {photos > 0 ? (
          <Chip
            selected={filter === 'photo'}
            onClick={() => setFilter('photo')}
            count={photos}
          >
            Photos
          </Chip>
        ) : null}
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
        {event.photo ? (
          <EntryPhoto event={event} />
        ) : (
          <IconChip icon={GLYPH[event.type]} tone={TONE[event.type]} />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.9375rem] font-medium">{title}</div>
          {detail ? (
            <div className="mt-px truncate text-[0.8125rem] leading-[1.125rem] text-ink-muted">
              {detail}
            </div>
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

/**
 * The picture in place of the icon chip, at the same size, so a row with a
 * photograph is the same height as one without and the list does not jump about
 * as thumbnails arrive.
 *
 * A null url means the bytes are not here — most often an entry the other
 * device logged whose photograph this one has not pulled down yet. The icon
 * stands in until it does, rather than a broken frame.
 */
function EntryPhoto({ event }: { event: PlantEvent }) {
  const url = usePhoto(event.id)

  if (!url) return <IconChip icon={GLYPH[event.type]} tone={TONE[event.type]} />

  return (
    <img
      src={url}
      alt={`Photographed ${formatDayMonth(event.date)}`}
      // The chip's own 34, set the way it sets it, so the two are the same box.
      style={{ width: 34, height: 34 }}
      className="shrink-0 rounded-full object-cover"
    />
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
            className="warm flex min-h-touch items-center gap-3.5 border-b border-line py-3 last:border-b-0 hover:bg-sunk"
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
            className="warm flex min-h-touch items-center gap-3.5 border-b border-line py-3 last:border-b-0 hover:bg-sunk"
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
