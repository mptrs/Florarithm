/**
 * The sachets of predatory mites, which hang through the whole collection and
 * stop working after four weeks.
 *
 * The one thing in the app that belongs to no plant: no plant code, no place,
 * nothing that has to be kept in step when a plant moves, dies or leaves. So
 * it is not an event and it is not in the log — it is a single record (see
 * `Sachets`) that the next batch overwrites, read back as a line on Today.
 *
 * Two readings of that one line, and the switch between them is a date
 * subtraction rather than a stored flag:
 *
 * - **Inside the four weeks** it is a fact, in the voice the plant rows use —
 *   no colour, no button. It says which week is hanging and how long it has
 *   left.
 * - **Past them** it is the `Banner` this app already owns for something that
 *   has to be done and stays until it is: ember, not dismissible, with the one
 *   action that ends it.
 *
 * There is no prediction here and no notification. The four weeks are what the
 * packet claims, the way a watering day is what the calendar says — the app is
 * counting, not guessing.
 */

import { useState } from 'react'
import { hangSachets, useStore } from '~/data/store'
import { SACHET_DAYS, type Sachets } from '~/data/types'
import { daysSince, formatDate, inputValueToISO, isoToInputValue, isoWeek, todayInputValue } from '~/lib/date'
import { plural } from '~/lib/format'
import { Banner } from './Banner'
import { Button, IconButton } from './Button'
import { DatePickerField } from './DatePicker'
import { NumberField } from './fields'
import { Icon } from './Icon'
import { Sheet } from './Sheet'
import { showToast } from './toast'

/** Whole days since they went up. */
export function sachetDays(sachets: Sachets): number {
  return daysSince(sachets.hungOn)
}

/** Days until they stop releasing: 0 on the day they run out, negative once
 *  they have. Counted down rather than up, because "5 days left" is the
 *  question you have in front of the plants and "day 23 of 28" makes you do
 *  the subtraction. */
export function sachetDaysLeft(sachets: Sachets): number {
  return SACHET_DAYS - sachetDays(sachets)
}

export function sachetsAreSpent(sachets: Sachets): boolean {
  return sachetDaysLeft(sachets) <= 0
}

/** `5 days left`, `1 day left` — the quiet reading. */
function daysLeftLabel(left: number): string {
  return `${plural(left, 'day')} left`
}

/** What the banner says once they are spent: the day they run out, and then
 *  how long ago that was — an overdue count, not an age. */
function spentSentence(sachets: Sachets): string {
  const over = -sachetDaysLeft(sachets)
  const when = over === 0 ? 'run out today' : `ran out ${plural(over, 'day')} ago`
  return `The sachets from week ${sachets.week} ${when}. Hang the next ones.`
}

/**
 * The line on Today, in whichever of its two readings applies — and nothing at
 * all when none hang. A reminder about something you do not do is the fastest
 * way to stop reading reminders.
 */
export function SachetReminder() {
  const { sachets } = useStore()
  const [open, setOpen] = useState(false)

  if (!sachets) return null

  return (
    <>
      {sachetsAreSpent(sachets) ? (
        <Banner
          tone="warning"
          icon="pest"
          action={
            // A glyph rather than a word: "Hung" and "Replaced" both read
            // oddly on a line that has just said what to do. The label
            // carries it for a screen reader and, as a title, under a pointer.
            <IconButton
              icon="replace"
              label="New sachets hung"
              variant="danger"
              onClick={() => setOpen(true)}
            />
          }
        >
          {spentSentence(sachets)}
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

/** `Hung on 20 Aug 2026 · 5 days left` — what the row in Settings says under
 *  the week, which is already the line above it. */
export function sachetSummary(sachets: Sachets): string {
  const left = sachetDaysLeft(sachets)
  const status =
    left > 0 ? daysLeftLabel(left) : left === 0 ? 'run out today' : `ran out ${plural(-left, 'day')} ago`
  return `Hung on ${formatDate(sachets.hungOn)} · ${status}`
}
