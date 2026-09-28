/**
 * Every photograph of one plant, one at a time.
 *
 * Reached by tapping the photograph on a phone, and by "All photos" under it
 * on a desktop. It takes the whole window, the tab bar and the sidebar
 * included: this is a place for looking, and everything that is not the
 * picture only competes with it.
 *
 * The filmstrip runs oldest to newest, so reading it left to right is watching
 * the plant grow — which is the reason to keep photographing one at all. The
 * one decision to make here is which photograph stands for the plant, and it
 * is made against the picture rather than against a row of thumbnails in the
 * edit form.
 *
 * Stepping replaces the address rather than pushing it, so Back — the button,
 * the swipe, Escape — leaves the photographs in one go, however many of them
 * were looked at on the way.
 */

import { useEffect, useRef } from 'react'
import { usePhoto } from '~/data/photos'
import { currentPhotoEvent, findPlant, photoEventsFor } from '~/data/selectors'
import { choosePhoto, describeEvent, useStore, type State } from '~/data/store'
import type { Plant, PlantEvent } from '~/data/types'
import { cn } from '~/lib/cn'
import { daysBetween, formatDayMonth, formatDate, formatLongDate, yearOf } from '~/lib/date'
import { plural } from '~/lib/format'
import { canGoBack, navigate, redirect, routes } from '~/lib/router'
import { Button } from '~/ui/Button'
import { Card, GroupLabel, IconChip } from '~/ui/Card'
import { Icon } from '~/ui/Icon'
import { GLYPH, TONE, detailOf, frameRatio } from './PlantScreen'

export function PhotoViewer({ code, eventId }: { code: string; eventId: string | null }) {
  const state = useStore()
  const plant = findPlant(state, code)
  // Oldest first: the filmstrip is a growth series, and "3 of 7" counts up
  // through the plant's life rather than back down it.
  const photos = plant && !plant.deleted ? [...photoEventsFor(state, code)].reverse() : []
  const standing = currentPhotoEvent(state, code)
  const found = photos.findIndex((event) => event.id === (eventId ?? standing?.id))
  const index = found === -1 ? photos.length - 1 : found
  const shown = photos[index]

  const close = () => {
    if (canGoBack()) window.history.back()
    else navigate(routes.plant(code))
  }
  const step = (by: number) => {
    const target = photos[index + by]
    if (target) redirect(routes.photos(code, target.id))
  }

  // Read through a ref so the listener is attached once, not once per photo.
  const keys = useRef({ close, step })
  keys.current = { close, step }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') keys.current.close()
      else if (event.key === 'ArrowLeft') keys.current.step(-1)
      else if (event.key === 'ArrowRight') keys.current.step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The last photograph deleted, or an address for a plant that is gone:
  // there is nothing here to look at, so go back to the plant it was about.
  const empty = state.status === 'ready' && !shown
  useEffect(() => {
    if (empty) redirect(routes.plant(code))
  }, [empty, code])

  if (!plant || !shown) return null

  // Every distance here is a step of the scale, for the role it plays (see
  // Spacing in DESIGN.md): the page edge is 16 on a phone and 48 from `md`,
  // the top is the shell's own 24 and 32, and the header, the picture, the
  // facts, their button and the filmstrip are blocks, 24 apart at every size.
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-paper lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-6 md:px-12 md:pt-8">
          {/* Outdented by the padding it carries, so the arrow sits on the
              page edge rather than a row step inside it. */}
          <a
            href={routes.plant(code)}
            onClick={(event) => {
              event.preventDefault()
              close()
            }}
            className="warm -ml-3 flex h-touch min-w-0 items-center gap-2 rounded-md px-3 text-ink hover:bg-sunk"
          >
            <Icon name="back" size={19} />
            {/* One line here, however long the name: it is the way back, and
                the count beside it has to keep its place. */}
            <span className="truncate font-display text-[1.25rem] font-medium">{plant.name}</span>
          </a>
          <Position index={index} total={photos.length} className="shrink-0 lg:hidden" />
        </header>

        <Stage
          event={shown}
          plant={plant}
          canEarlier={index > 0}
          canLater={index < photos.length - 1}
          onStep={step}
        />

        {/* Under the picture on a phone and on the in-between size, where
            there is no width to spare for a panel beside it. The button is
            the block that commits, 24 under the facts on a phone; from `md`
            it stands beside them instead, one column step away. */}
        <div className="mt-6 shrink-0 px-4 md:flex md:items-start md:justify-between md:gap-8 md:px-12 lg:hidden">
          <Facts plant={plant} event={shown} state={state} />
          <div className="mt-6 md:mt-0 md:shrink-0">
            <Choice plant={plant} event={shown} standing={standing} />
          </div>
        </div>

        <Filmstrip photos={photos} index={index} code={code} />
      </div>

      {/* A column beside the picture, so a column's step in from its hairline,
          and the shell's own 32 at top and foot so it starts level with the
          name across from it. */}
      <aside className="hidden w-80 shrink-0 flex-col border-l border-line bg-surface p-8 lg:flex">
        <Position index={index} total={photos.length} long />
        <div className="mt-2">
          <Facts plant={plant} event={shown} state={state} panel />
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-6">
          <Choice plant={plant} event={shown} standing={standing} block />
        </div>
        <p className="mt-auto text-[0.8125rem] leading-[1.125rem] text-ink-faint">
          <span className="font-mono">← →</span> step through ·{' '}
          <span className="font-mono">Esc</span> back to {plant.name}
        </p>
      </aside>
    </div>
  )
}

function Position({
  index,
  total,
  long,
  className,
}: {
  index: number
  total: number
  long?: boolean
  className?: string
}) {
  return (
    <GroupLabel className={className}>
      {long ? 'Photo ' : ''}
      <span className="font-mono">{index + 1}</span> of <span className="font-mono">{total}</span>
    </GroupLabel>
  )
}

/**
 * The photograph as large as the window allows, in its own shape.
 *
 * `max-h-full max-w-full` on the picture itself rather than `object-contain`
 * in a fixed box: the rounded corners and the shadow then belong to the
 * photograph's own edges, not to an invisible frame around it.
 */
function Stage({
  event,
  plant,
  canEarlier,
  canLater,
  onStep,
}: {
  event: PlantEvent
  plant: Plant
  canEarlier: boolean
  canLater: boolean
  onStep: (by: number) => void
}) {
  const url = usePhoto(event.id)
  const touch = useRef<{ x: number; y: number } | null>(null)

  return (
    <div
      className="mt-6 flex min-h-0 flex-1 items-center gap-3 px-4 md:px-12"
      // A phone steps by swiping the picture. Only a mostly-sideways swipe
      // counts, so a vertical flick at the edge of the screen stays a flick.
      onTouchStart={(e) => {
        const point = e.touches[0]
        touch.current = point ? { x: point.clientX, y: point.clientY } : null
      }}
      onTouchEnd={(e) => {
        const start = touch.current
        const point = e.changedTouches[0]
        touch.current = null
        if (!start || !point) return
        const dx = point.clientX - start.x
        const dy = point.clientY - start.y
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) onStep(dx < 0 ? 1 : -1)
      }}
    >
      {/* Beside the picture rather than over it, a row step from its edge:
          the picture is the thing being looked at, and nothing sits on it. */}
      <StepButton direction="earlier" disabled={!canEarlier} onClick={() => onStep(-1)} />
      <div className="relative h-full min-w-0 flex-1">
        <div className="absolute inset-0 flex items-center justify-center">
          {url ? (
            <img
              src={url}
              alt={`${plant.name}, photographed ${formatDate(event.date)}`}
              className="max-h-full max-w-full rounded-xl md:shadow-lg"
            />
          ) : null}
        </div>
      </div>
      <StepButton direction="later" disabled={!canLater} onClick={() => onStep(1)} />
    </div>
  )
}

/** Only where there is a pointer and room beside the picture; a phone swipes. */
function StepButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'earlier' | 'later'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={direction === 'earlier' ? 'Earlier photo' : 'Later photo'}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'lift hidden size-10 shrink-0 items-center justify-center rounded-full bg-floating text-ink shadow-md md:flex',
        'hover:bg-surface hover:shadow-lg active:opacity-70 disabled:pointer-events-none disabled:opacity-35',
      )}
    >
      <Icon name={direction} size={19} />
    </button>
  )
}

/** When it was taken, how far into the plant's life that was, and the entry
 *  the photograph belongs to. */
function Facts({
  plant,
  event,
  state,
  panel,
}: {
  plant: Plant
  event: PlantEvent
  state: State
  panel?: boolean
}) {
  const age = sinceArrival(plant.origin.date ?? plant.createdAt, event.date)
  const detail = detailOf(event, state)

  const entry = (
    <div className="flex min-w-0 items-center gap-3">
      <IconChip icon={GLYPH[event.type]} tone={TONE[event.type]} />
      <div className="min-w-0">
        <div className="truncate text-[0.9375rem] font-medium">{describeEvent(event)}</div>
        {detail ? (
          <div className="truncate text-[0.8125rem] leading-[1.125rem] text-ink-muted">{detail}</div>
        ) : null}
      </div>
    </div>
  )

  return (
    <div className="min-w-0">
      <h2
        className={cn(
          'font-display font-medium tracking-[-0.015em]',
          panel ? 'text-[1.875rem] leading-[2.125rem]' : 'text-[1.625rem] leading-[1.875rem]',
        )}
      >
        {formatLongDate(event.date)}
      </h2>
      {/* The age is the date's second line, on its own leading. The entry is
          what the date heads: 8 under it in a row, or — in the panel, where
          it is a card — a block, 24. */}
      {age ? <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">{age}</p> : null}
      {panel ? <Card className="mt-6 px-4 py-3">{entry}</Card> : <div className="mt-2">{entry}</div>}
    </div>
  )
}

/**
 * The one decision this screen is for.
 *
 * The photograph that already stands for the plant says so rather than
 * offering a button that would do nothing — including when it stands there by
 * default, as the newest, with nothing ever chosen.
 */
function Choice({
  plant,
  event,
  standing,
  block,
}: {
  plant: Plant
  event: PlantEvent
  standing: PlantEvent | null
  block?: boolean
}) {
  if (standing?.id === event.id) {
    return (
      // The button's own height, so choosing a photograph does not move the
      // filmstrip under your thumb.
      <p className="flex h-control items-center gap-2 text-[0.9375rem] font-semibold text-leaf">
        <Icon name="check" size={18} />
        The plant’s photo
      </p>
    )
  }

  return (
    <Button
      icon="image"
      block={block}
      className={block ? '' : 'w-full md:w-auto'}
      onClick={() => void choosePhoto(plant.code, event.id)}
    >
      Use as the plant’s photo
    </Button>
  )
}

/**
 * All of them, oldest first, a year to a group.
 *
 * Each thumbnail keeps the photograph's own shape, within the same bounds as
 * the plant page's frame, so a landscape reads as a landscape at a glance.
 * The one being looked at is kept in view as you step past the edge.
 */
function Filmstrip({ photos, index, code }: { photos: PlantEvent[]; index: number; code: string }) {
  const years: Array<[number, PlantEvent[]]> = []
  for (const event of photos) {
    const year = yearOf(event.date)
    const group = years.at(-1)
    if (group && group[0] === year) group[1].push(event)
    else years.push([year, [event]])
  }

  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    strip.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [index])

  // A bar at the foot like the tab bar: a row's padding, plus the safe area
  // under it. The page edge at its sides, a year's label 8 over its photos,
  // photos a row step apart as equals, and the years a column step apart.
  return (
    <div
      ref={strip}
      className="mt-6 flex shrink-0 gap-8 overflow-x-auto border-t border-line bg-surface px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(3))] [scrollbar-width:none] md:px-12 lg:bg-paper [&::-webkit-scrollbar]:hidden"
    >
      {years.map(([year, events]) => (
        <div key={year} className="flex shrink-0 flex-col gap-2">
          <GroupLabel>{year}</GroupLabel>
          <div className="flex items-end gap-3">
            {events.map((event) => (
              <Thumb
                key={event.id}
                event={event}
                code={code}
                current={photos[index]?.id === event.id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Thumb({ event, code, current }: { event: PlantEvent; code: string; current: boolean }) {
  const url = usePhoto(event.id)
  const height = 56

  return (
    <button
      type="button"
      aria-label={`Photographed ${formatDate(event.date)}`}
      aria-current={current}
      onClick={() => redirect(routes.photos(code, event.id))}
      className="group flex shrink-0 flex-col items-center gap-2"
    >
      <span
        className={cn(
          'block rounded-lg border-2 p-px transition-colors',
          current ? 'border-leaf' : 'border-transparent group-hover:border-line-strong',
        )}
      >
        <span
          className="block overflow-hidden rounded-md bg-sunk"
          style={{ height, width: Math.round(height * frameRatio(event.photo)) }}
        >
          {url ? <img src={url} alt="" className="size-full object-cover" /> : null}
        </span>
      </span>
      <span
        className={cn(
          'font-mono text-[0.6875rem] leading-[0.875rem]',
          current ? 'text-ink' : 'text-ink-faint',
        )}
      >
        {formatDayMonth(event.date)}
      </span>
    </button>
  )
}

/** `1 year, 4 months after it arrived`. Calendar months, so a photograph taken
 *  on the same date a year on reads as exactly a year. Nothing for a picture
 *  dated before the plant arrived: there is no honest way to say that. */
function sinceArrival(arrived: string, taken: string): string | null {
  const days = daysBetween(arrived, taken)
  if (days < 0) return null
  if (days === 0) return 'The day it arrived'

  const from = new Date(arrived)
  const to = new Date(taken)
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) -
    (to.getDate() < from.getDate() ? 1 : 0)
  if (months < 1) return `${plural(days, 'day')} after it arrived`

  const years = Math.floor(months / 12)
  const rest = months % 12
  const span = [years ? plural(years, 'year') : '', rest ? plural(rest, 'month') : '']
    .filter(Boolean)
    .join(', ')
  return `${span} after it arrived`
}
