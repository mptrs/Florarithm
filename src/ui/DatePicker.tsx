/**
 * When did it happen?
 *
 * Every quick action would otherwise stamp the entry `now`, and the watering
 * you did on Tuesday and remembered on Thursday could never be recorded
 * truthfully. Two thirds of that problem is Today and Yesterday, so those are
 * shortcuts; the rest is a month grid.
 *
 * You cannot log forwards. Future days are shown but not reachable — greying
 * them says "not this" far better than a month that simply stops.
 *
 * One calendar, two ways in: a chip in the log sheet, a field on the plant
 * form. Both open this, so a date is picked the same way wherever you are —
 * the form used to hand that job to `<input type="date">` and the operating
 * system, which looked like nothing else in the app.
 */

import { useId, useState, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { isoToInputValue, inputValueToISO, nowISO } from '~/lib/date'
import { Button } from './Button'
import { Chip } from './Chip'
import { CONTROL, Field } from './fields'
import { Sheet } from './Sheet'
import { Icon } from './Icon'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTH_YEAR = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })

/** Monday-first weeks, padded with nulls so the grid always starts on Monday. */
function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
}

function atMidday(year: number, month: number, day: number): string {
  return new Date(year, month, day, 12).toISOString()
}

export function DatePicker({
  value,
  onChange,
  onDone,
}: {
  /** ISO timestamp of the entry being dated. */
  value: string
  onChange: (iso: string) => void
  onDone: () => void
}) {
  const selected = new Date(value)
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))

  const today = new Date()
  const todayValue = isoToInputValue(nowISO())
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const selectedValue = isoToInputValue(value)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  // Nothing after this month is reachable, so neither is the arrow to it.
  const atLatest = year === today.getFullYear() && month === today.getMonth()

  const pick = (day: number) => onChange(atMidday(year, month, day))
  const shortcut = (date: Date) =>
    onChange(atMidday(date.getFullYear(), date.getMonth(), date.getDate()))

  return (
    <div className="pt-1">
      {/* Today and Yesterday, which between them cover most back-dating.
          These were a local button drawn to the filter chip's exact
          measurements — the same thing twice, which is how one of them ends
          up with a hover state and the other does not. */}
      <div className="flex justify-center gap-2">
        <Chip selected={selectedValue === todayValue} onClick={() => shortcut(today)}>
          Today
        </Chip>
        <Chip
          selected={selectedValue === isoToInputValue(yesterday.toISOString())}
          onClick={() => shortcut(yesterday)}
        >
          Yesterday
        </Chip>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="warm -ml-2 flex size-touch items-center justify-center rounded-full text-ink-muted active:opacity-70 hover:bg-sunk hover:text-ink"
        >
          <Icon name="chevronLeft" size={21} />
        </button>
        <span className="font-display text-[1.1875rem] font-medium">
          {MONTH_YEAR.format(cursor)}
        </span>
        <button
          type="button"
          aria-label="Next month"
          disabled={atLatest}
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="warm -mr-2 flex size-touch items-center justify-center rounded-full text-ink-muted disabled:opacity-30 active:opacity-70 enabled:hover:bg-sunk enabled:hover:text-ink"
        >
          <Icon name="chevronRight" size={21} />
        </button>
      </div>

      <div className="mt-1 grid grid-cols-7">
        {WEEKDAYS.map((day, index) => (
          <div
            key={index}
            aria-hidden
            className="py-1.5 text-center font-mono text-[0.6875rem] tracking-[0.06em] text-ink-faint"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {monthGrid(year, month).map((day, index) => {
          if (day === null) return <span key={index} />

          const iso = atMidday(year, month, day)
          const value = isoToInputValue(iso)
          const isFuture = inputValueToISO(value)! > inputValueToISO(todayValue)!
          const isSelected = value === selectedValue

          return (
            <button
              key={index}
              type="button"
              disabled={isFuture}
              onClick={() => pick(day)}
              aria-current={isSelected ? 'date' : undefined}
              className={cn(
                'warm flex h-10 items-center justify-center rounded-lg font-mono text-[0.9375rem]',
                isSelected
                  ? 'bg-ink font-semibold text-paper hover:bg-ink-deep'
                  : isFuture
                    ? 'text-ink-faint opacity-40'
                    : 'text-ink active:bg-sunk hover:bg-sunk',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>

      <Button variant="solid" block onClick={onDone} className="mt-4">
        Use this date
      </Button>
    </div>
  )
}

const DAY_MONTH_YEAR = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** How a held date reads on the control that opens the picker. Shared, so the
 *  chip in the log sheet and the field on the plant form never word the same
 *  day two different ways. */
function dateLabel(iso: string): string {
  return isoToInputValue(iso) === isoToInputValue(nowISO())
    ? 'Today'
    : DAY_MONTH_YEAR.format(new Date(iso))
}

/** The chip that opens the picker, showing the date it currently holds. */
export function DateChip({ value, onClick }: { value: string; onClick: () => void }) {
  const label = dateLabel(value)

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={onClick}
        className="lift inline-flex h-9 items-center gap-2 rounded-full border border-line bg-sunk px-4 text-[0.875rem] font-medium text-ink active:opacity-70 hover:border-line-strong"
      >
        <Icon name="calendar" size={16} className="text-ink-muted" />
        {label}
        <Icon name="chevronDown" size={16} className="text-ink-muted" />
      </button>
    </div>
  )
}

/**
 * The picker as a form field.
 *
 * Same calendar as the log sheet — same shortcuts, same mono numerals, same
 * refusal to date something forwards — reached through a control that is drawn
 * exactly like the text fields either side of it. It used to be
 * `<input type="date">`, which meant the two places you pick a date in this app
 * looked nothing alike and one of them was the operating system's.
 *
 * It speaks `yyyy-mm-dd` rather than ISO, because that is the shape a form
 * holds a date in; the picker's own ISO is converted at this boundary.
 */
export function DatePickerField({
  label,
  hint,
  value,
  onChange,
  fieldClassName,
}: {
  label: string
  hint?: ReactNode
  /** `yyyy-mm-dd`. */
  value: string
  onChange: (value: string) => void
  /** Placement only. */
  fieldClassName?: string
}) {
  const id = useId()
  const labelId = `${id}-label`
  const [open, setOpen] = useState(false)

  // Held here rather than pushed straight out, so leaving the sheet by the
  // scrim or Escape leaves the field on the date it had. `Use this date` is
  // what commits it.
  const [draft, setDraft] = useState(nowISO)

  const iso = inputValueToISO(value) ?? nowISO()

  return (
    <Field label={label} labelId={labelId} hint={hint} className={fieldClassName}>
      <button
        id={id}
        type="button"
        aria-labelledby={`${labelId} ${id}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setDraft(iso)
          setOpen(true)
        }}
        className={cn(
          CONTROL,
          'warm flex items-center gap-2.5 text-left font-mono active:opacity-70 hover:bg-sunk',
        )}
      >
        <Icon name="calendar" size={17} className="shrink-0 text-ink-muted" />
        <span className="flex-1">{dateLabel(iso)}</span>
        <Icon name="chevronDown" size={17} className="shrink-0 text-ink-muted" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="When?">
        <DatePicker
          value={draft}
          onChange={setDraft}
          onDone={() => {
            onChange(isoToInputValue(draft))
            setOpen(false)
          }}
        />
      </Sheet>
    </Field>
  )
}
