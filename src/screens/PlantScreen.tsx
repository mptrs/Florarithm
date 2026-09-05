/**
 * The plant.
 *
 * This is where a sticker brings you, so it is the most important screen in the
 * app. The actions sit above everything else, because they are what you came
 * for: WATER is one tap, no confirmation, and always undoable.
 */

import { useState } from 'react'
import {
  childrenOf,
  daysSinceWater,
  eventsFor,
  findPlant,
  isThirsty,
  lastRepot,
  lastWaterAt,
  countThisYear,
  vocabName,
  waterRhythm,
} from '~/data/selectors'
import { describeEvent, logEvent, removeEvent, setTagWritten, useStore } from '~/data/store'
import { vocabOf } from '~/data/selectors'
import type { Plant, PlantEvent } from '~/data/types'
import { formatDate, formatDayMonth } from '~/lib/date'
import { formatPotSize, formatPrice, formatSpecies, label, plural } from '~/lib/format'
import { plantUrl, routes } from '~/lib/router'
import { Button, IconButton } from '~/ui/Button'
import { Icon } from '~/ui/Icon'
import {
  CodeBadge,
  EmptyState,
  FactList,
  FactRow,
  Rows,
  SectionHeading,
} from '~/ui/primitives'
import { Row } from '~/ui/rows'
import { offerUndo, withUndo } from '~/ui/undo'
import { PlantActionsSheet } from './PlantActionsSheet'

export function PlantScreen({ code }: { code: string }) {
  const state = useStore()
  const plant = findPlant(state, code)
  const [sheetOpen, setSheetOpen] = useState(false)

  if (!plant) return <UnknownPlant code={code} ready={state.status === 'ready'} />

  const place = vocabName(state, plant.locationId)
  const days = daysSinceWater(state, plant.code)
  const fertilizers = vocabOf(state, 'fertilizer')
  const history = eventsFor(state, plant.code)

  const logWater = async (fertilizerId: string | null) => {
    offerUndo(await logEvent({ type: 'water', plantCode: plant.code, fertilizerId, flushed: false }))
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-12">
      <div className="flex flex-col gap-5 md:w-[32rem] md:shrink-0">
        <div className="flex items-center justify-between gap-4">
          <BackButton />
          <CodeBadge
            code={plant.code}
            onClick={
              plant.wish || !plant.tagWritten
                ? undefined
                : () => void withUndo(() => setTagWritten(plant.code, false))
            }
            label={plant.tagWritten ? 'Tag not written after all — tap to fix' : undefined}
          />
        </div>

        <header className="flex flex-col gap-1">
          <h1 className="font-display text-[2.375rem] leading-[2.625rem] font-medium tracking-[-0.02em] md:text-[2.75rem] md:leading-[3rem]">
            {plant.name}
          </h1>
          {formatSpecies(plant) ? (
            <p className="text-[0.9375rem] text-ink-muted">{formatSpecies(plant)}</p>
          ) : null}
          <p className="text-[0.8125rem] text-ink-faint">
            {[place, label(plant.system), formatPotSize(plant.potSize)]
              .filter((part) => part && part !== '—')
              .join('  ·  ')}
          </p>
        </header>

        {plant.wish ? (
          <WishActions plant={plant} />
        ) : (
          <>
            {plant.tagWritten ? null : <StickerBlock plant={plant} />}

            <div className="flex flex-col gap-3">
              <Button variant="primary" size="lg" onClick={() => void logWater(null)}>
                WATER
              </Button>
              <div className="flex gap-3">
                {fertilizers[0] ? (
                  <Button
                    variant="outline"
                    block
                    onClick={() => void logWater(fertilizers[0]?.id ?? null)}
                  >
                    + {fertilizers[0].name}
                  </Button>
                ) : null}
                <Button variant="outline" block onClick={() => setSheetOpen(true)}>
                  More…
                </Button>
              </div>
            </div>
          </>
        )}

        <Facts plant={plant} days={days} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Family plant={plant} />
        <History events={history} />
      </div>

      <PlantActionsSheet plant={plant} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}

/** Back to wherever you came from — which after a scan is often nowhere. */
function BackButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) window.history.back()
        else window.location.assign(routes.today())
      }}
      className="-ml-2 inline-flex h-touch items-center gap-1 px-2 text-body font-medium text-leaf"
    >
      <Icon name="chevronLeft" />
      Back
    </button>
  )
}

// --- facts ------------------------------------------------------------------

function Facts({ plant, days }: { plant: Plant; days: number | null }) {
  const state = useStore()
  const rhythm = waterRhythm(state, plant.code)
  const repot = lastRepot(state, plant.code)
  const last = lastWaterAt(state, plant.code)
  const leaves = countThisYear(state, plant.code, 'leaf')
  const blooms = countThisYear(state, plant.code, 'bloom')

  return (
    <FactList>
      {plant.wish ? null : (
        <FactRow label="Last water">
          {last === null ? (
            <span className="text-ink-faint">never logged</span>
          ) : (
            <span className={isThirsty(days) ? 'text-ember' : undefined}>
              <span className="font-mono">{days}</span> days ago · {formatDate(last)}
            </span>
          )}
        </FactRow>
      )}

      {plant.wish ? null : (
        <FactRow label="Rhythm">
          {rhythm ? (
            <span className="font-mono">
              every {rhythm.average} days ({rhythm.min}–{rhythm.max})
            </span>
          ) : (
            <span className="text-ink-faint">not enough beats yet</span>
          )}
        </FactRow>
      )}

      <FactRow label="Medium">{vocabName(state, plant.mediumId)}</FactRow>

      {repot ? (
        <FactRow label="Last repot">
          {formatDate(repot.date)}
          {repot.toSize ? ` · ${repot.fromSize ?? '?'} → ${repot.toSize} cm` : ''}
        </FactRow>
      ) : null}

      {leaves > 0 ? (
        <FactRow label="Leaves this year">
          <span className="font-mono">{leaves}</span>
        </FactRow>
      ) : null}

      {blooms > 0 ? (
        <FactRow label="Bloomed this year">
          <span className="font-mono">{blooms}</span>
        </FactRow>
      ) : null}

      <FactRow label="Came from">
        {[plant.origin.type ? label(plant.origin.type) : null, plant.origin.from]
          .filter(Boolean)
          .join(' · ') || <span className="text-ink-faint">unknown</span>}
        {plant.origin.price === null ? null : (
          <>
            {' · '}
            <span className="font-mono">{formatPrice(plant.origin.price)}</span>
          </>
        )}
      </FactRow>

      {plant.origin.date ? (
        <FactRow label="In the collection since">{formatDate(plant.origin.date)}</FactRow>
      ) : null}

      <FactRow label="Status">{label(plant.status)}</FactRow>

      <div className="pt-4">
        <Button variant="outline" onClick={() => window.location.assign(routes.edit(plant.code))}>
          Edit this plant
        </Button>
      </div>
    </FactList>
  )
}

// --- sticker ----------------------------------------------------------------

function StickerBlock({ plant }: { plant: Plant }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plantUrl(plant.code))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard access can be refused; the code is on screen either way.
      setCopied(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-md border border-leaf bg-leaf-tint p-4">
      <h2 className="text-label uppercase text-leaf">Tag not written yet</h2>
      <p className="font-mono text-[1.625rem] leading-8 tracking-[0.1em] text-ink">{plant.code}</p>
      <p className="text-[0.8125rem] leading-5 text-ink-muted text-pretty">
        Copy the link, paste it into NFC Tools, and write the sticker. Then put the code on the pot
        in marker too, for the day the sticker gives up.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="accent" icon={copied ? 'check' : 'link'} onClick={copy}>
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        <Button variant="outline" onClick={() => void withUndo(() => setTagWritten(plant.code, true))}>
          Tag is written
        </Button>
      </div>
    </section>
  )
}

// --- wishlist ---------------------------------------------------------------

function WishActions({ plant }: { plant: Plant }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <h2 className="text-label uppercase text-ink-muted">On the wishlist</h2>
      {plant.wishNote ? <p className="text-[0.9375rem] text-ink">{plant.wishNote}</p> : null}
      <Button variant="accent" onClick={() => window.location.assign(routes.have(plant.code))}>
        I have this now
      </Button>
    </section>
  )
}

// --- family -----------------------------------------------------------------

function Family({ plant }: { plant: Plant }) {
  const state = useStore()
  const parent = plant.parent ? findPlant(state, plant.parent.code) : null
  const children = childrenOf(state, plant.code)

  if (!parent && children.length === 0) return null

  return (
    <section className="flex flex-col gap-1">
      <SectionHeading>Family</SectionHeading>
      <Rows>
        {parent && plant.parent ? (
          <a href={routes.plant(parent.code)} className="flex min-h-touch items-center gap-2.5 border-b border-line py-3.5">
            <span className="w-4 font-mono text-[0.8125rem] text-ink-faint">↑</span>
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
            className="flex min-h-touch items-center gap-2.5 border-b border-line py-3.5 last:border-b-0"
          >
            <span className="w-4 font-mono text-[0.8125rem] text-ink-faint">└</span>
            <span className="flex-1 font-display text-[1.125rem] font-medium text-leaf">
              {child.name}
            </span>
            <span className="text-[0.8125rem] text-ink-muted">
              {child.parent?.method} · {formatDayMonth(child.createdAt)}
            </span>
          </a>
        ))}
      </Rows>
    </section>
  )
}

// --- history ----------------------------------------------------------------

function History({ events }: { events: readonly PlantEvent[] }) {
  const state = useStore()

  if (events.length === 0) {
    return (
      <EmptyState
        title="No history yet"
        description="Every watering, leaf, bloom, repot and note shows up here, newest first."
      />
    )
  }

  return (
    <section className="flex flex-col gap-1">
      <SectionHeading>{plural(events.length, 'entry', 'entries')}</SectionHeading>
      <Rows>
        {events.map((event) => (
          <Row key={event.id} className="gap-3">
            <span className="w-14 shrink-0 font-mono text-micro text-ink-faint">
              {formatDayMonth(event.date)}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <span
                className={
                  event.type === 'leaf' || event.type === 'bloom'
                    ? 'text-[0.9375rem] font-medium text-leaf'
                    : 'text-[0.9375rem]'
                }
              >
                {describeEvent(event)}
              </span>
              {detailOf(event, state) ? (
                <span className="truncate text-[0.8125rem] text-ink-muted">
                  {detailOf(event, state)}
                </span>
              ) : null}
            </div>

            <IconButton
              icon="close"
              label={`Delete ${describeEvent(event).toLowerCase()} of ${formatDayMonth(event.date)}`}
              variant="quiet"
              className="size-touch"
              onClick={() => void removeEvent(event.id).then(offerUndo)}
            />
          </Row>
        ))}
      </Rows>
    </section>
  )
}

function detailOf(event: PlantEvent, state: ReturnType<typeof useStore>): string {
  switch (event.type) {
    case 'water': {
      const parts = [
        event.fertilizerId ? vocabName(state, event.fertilizerId) : null,
        event.flushed ? 'flushed the pot first' : null,
      ].filter(Boolean)
      return parts.join(' · ')
    }
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

// --- a code that is not yours -----------------------------------------------

/** A scan that lands nowhere is the one moment this app can feel broken. It
 *  gets a real page with the code on it, not an empty list. */
function UnknownPlant({ code, ready }: { code: string; ready: boolean }) {
  if (!ready) return null

  return (
    <div className="flex flex-col gap-5">
      <BackButton />
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
