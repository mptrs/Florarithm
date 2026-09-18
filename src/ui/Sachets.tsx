/**
 * The sachets of predatory mites, which hang through the whole collection and
 * stop working after four weeks.
 *
 * The one thing in the app that belongs to no plant: no plant code, no place,
 * nothing that has to be kept in step when a plant moves, dies or leaves. So
 * it is not an event and it is not in the log — it is a single record (see
 * `Sachets`) that the next batch overwrites, read back as a line on Today.
 *
 * Three readings of that one line — hanging, order, spent — and the switch
 * between them is date arithmetic in `data/sachets.ts` rather than a stored
 * flag. See `SachetReminder`.
 *
 * There is no prediction here and no notification. The four weeks are what the
 * packet claims, the way a watering day is what the calendar says — the app is
 * counting, not guessing.
 */

import { useState } from 'react'
import { hangSachets, useStore } from '~/data/store'
import {
  sachetDaysLeft,
  sachetOrderBy,
  sachetPhase,
  sachetRunOut,
} from '~/data/sachets'
import type { Sachets } from '~/data/types'
import {
  formatDate,
  formatWeekdayDayMonth,
  inputValueToISO,
  isoToInputValue,
  isoWeek,
  todayInputValue,
} from '~/lib/date'
import { plural } from '~/lib/format'
import { Banner } from './Banner'
import { Button, IconButton } from './Button'
import { DatePickerField } from './DatePicker'
import { NumberField } from './fields'
import { Icon } from './Icon'
import { Sheet } from './Sheet'
import { showToast } from './toast'

/** `5 days left`, `1 day left` — the quiet reading. */
function daysLeftLabel(left: number): string {
  return `${plural(left, 'day')} left`
}

/** `run out today`, `run out tomorrow`, `run out on Thu 17 Sep` — the date is
 *  the useful part once it is close, because it is what you order against. */
function runOutPhrase(sachets: Sachets): string {
  const left = sachetDaysLeft(sachets)
  if (left === 0) return 'run out today'
  if (left === 1) return 'run out tomorrow'
  if (left < 0) return `ran out ${plural(-left, 'day')} ago`
  return `run out on ${formatWeekdayDayMonth(sachetRunOut(sachets))}`
}

/**
 * The line on Today, in whichever of its three readings applies — and nothing
 * at all when none hang. A reminder about something you do not do is the
 * fastest way to stop reading reminders.
 *
 * - **Hanging:** a quiet fact — which week, how long left.
 * - **Order:** the neutral banner, from the last day an order still arrives
 *   in time. It asks for something to be done, but nothing has gone wrong yet,
 *   so it does not borrow the alarm colour.
 * - **Spent:** the ember banner. They have stopped working.
 *
 * Both banners carry the reset, because new sachets can arrive — and go up —
 * before the old ones run out.
 */
export function SachetReminder() {
  const { sachets } = useStore()
  const [open, setOpen] = useState(false)

  if (!sachets) return null

  const phase = sachetPhase(sachets)

  // A glyph rather than a word: "Hung" and "Replaced" both read oddly on a
  // line that has just said what to do. The label carries it for a screen
  // reader and, as a title, under a pointer.
  const reset = (
    <IconButton
      icon="replace"
      label="New sachets hung"
      variant={phase === 'spent' ? 'danger' : 'outline'}
      onClick={() => setOpen(true)}
    />
  )

  return (
    <>
      {phase === 'spent' ? (
        <Banner tone="warning" icon="pest" action={reset}>
          {`The sachets from week ${sachets.week} ${runOutPhrase(sachets)}. Hang the next ones.`}
        </Banner>
      ) : phase === 'order' ? (
        <Banner tone="info" icon="pest" action={reset}>
          {`Order new sachets: the ones from week ${sachets.week} ${runOutPhrase(sachets)}.`}
        </Banner>
      ) : (
        <p className="flex min-h-[1.875rem] items-center gap-2 text-[0.8125rem] text-ink-muted">
          <Icon name="pest" size={15} className="shrink-0 text-ink-faint" />
          <span>
            Sachets from week <span className="font-mono">{sachets.week}</span> ·{' '}
            {daysLeftLabel(sachetDaysLeft(sachets))}
          </span>
        </p>
      )}

      {/* From here it is always a new batch: the fields start on this week
          and today rather than on what is hanging, because what is hanging is
          the thing being replaced. */}
      <SachetSheet mode="hang" open={open} sachets={sachets} onClose={() => setOpen(false)} />
    </>
  )
}

/**
 * The whole of saying that new ones hang: the week printed on the packet and
 * the day it went up.
 *
 * Both start on the answer that is right nine times out of ten — this week,
 * today — so committing is one press. The week is asked for rather than taken
 * from the date because a packet that sat in a drawer says a week that has
 * already passed, and that number is the only way to tell one batch from the
 * next.
 */
export function SachetSheet({
  open,
  mode,
  sachets,
  onClose,
}: {
  open: boolean
  /** `hang` starts on this week and today, for a batch going up now; `correct`
   *  starts on what is written down, for fixing it. The two are the same two
   *  fields and the same record — only what they open on differs. */
  mode: 'hang' | 'correct'
  /** What hangs now, or `null` when none does. */
  sachets: Sachets | null
  onClose: () => void
}) {
  const [week, setWeek] = useState('')
  const [hungOn, setHungOn] = useState('')

  // Opening is what fills the fields, so a sheet closed and opened again does
  // not still hold what was typed into the last one and abandoned.
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      const start = mode === 'correct' ? sachets : null
      setWeek(String(start?.week ?? isoWeek()))
      setHungOn(start ? isoToInputValue(start.hungOn) : todayInputValue())
    }
  }

  if (!open) return null

  const parsedWeek = Number(week)
  const valid = Number.isInteger(parsedWeek) && parsedWeek >= 1 && parsedWeek <= 53 && hungOn !== ''

  const commit = async () => {
    const iso = inputValueToISO(hungOn)
    if (!valid || !iso) return
    await hangSachets({ week: parsedWeek, hungOn: iso })
    showToast(mode === 'correct' ? 'Saved' : `Sachets hung · week ${parsedWeek}`)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={mode === 'correct' ? 'These sachets' : 'New sachets'}>
      <div className="flex flex-col gap-6">
        <NumberField
          label="Week on the packet"
          value={week}
          min={1}
          max={53}
          step={1}
          onChange={(event) => setWeek(event.target.value)}
          hint={parsedWeek === isoWeek() ? 'This week.' : undefined}
        />

        <DatePickerField label="Hung on" value={hungOn} onChange={setHungOn} />

        <Button variant="solid" block disabled={!valid} onClick={() => void commit()}>
          {mode === 'correct' ? 'Save' : 'Hang them'}
        </Button>
      </div>
    </Sheet>
  )
}

/** `Hung on 20 Aug 2026 · order by Mon 14 Sep` — what the row in Settings says
 *  under the week, which is already the line above it. Before the order day it
 *  names the order day, because that is the date to act on; after it, the
 *  run-out. */
export function sachetSummary(sachets: Sachets): string {
  const status =
    sachetPhase(sachets) === 'hanging'
      ? `${daysLeftLabel(sachetDaysLeft(sachets))} · order by ${formatWeekdayDayMonth(sachetOrderBy(sachets))}`
      : runOutPhrase(sachets)
  return `Hung on ${formatDate(sachets.hungOn)} · ${status}`
}
