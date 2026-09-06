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
 */

import { useState } from 'react'
import { cn } from '~/lib/cn'
import { isoToInputValue, inputValueToISO, nowISO } from '~/lib/date'
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
      <div className="flex justify-center gap-2">
        <Quick
          label="Today"
          selected={selectedValue === todayValue}
          onClick={() => shortcut(today)}
        />
        <Quick
          label="Yesterday"
          selected={selectedValue === isoToInputValue(yesterday.toISOString())}
          onClick={() => shortcut(yesterday)}
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="-ml-2 flex size-touch items-center justify-center text-ink-muted active:opacity-70"
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
          className="-mr-2 flex size-touch items-center justify-center text-ink-muted disabled:opacity-30 active:opacity-70"
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
                'flex h-10 items-center justify-center rounded-lg font-mono text-[0.9375rem]',
                isSelected
                  ? 'bg-ink font-semibold text-paper'
                  : isFuture
                    ? 'text-ink-faint opacity-40'
                    : 'text-ink active:bg-sunk',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-4 flex h-control w-full items-center justify-center rounded-lg bg-ink text-body font-semibold text-paper active:opacity-70"
      >
        Use this date
      </button>
    </div>
  )
}

/** Today and Yesterday, which between them cover most back-dating. */
function Quick({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center rounded-full px-3.5 text-[0.875rem]',
        selected
          ? 'bg-ink font-semibold text-paper'
          : 'border border-line-strong font-medium text-ink-muted',
      )}
    >
      {label}
    </button>
  )
}

/** The chip that opens the picker, showing the date it currently holds. */
export function DateChip({ value, onClick }: { value: string; onClick: () => void }) {
  const label =
    isoToInputValue(value) === isoToInputValue(nowISO())
      ? 'Today'
      : new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(new Date(value))

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-sunk px-4 text-[0.875rem] font-medium text-ink active:opacity-70"
      >
        <Icon name="calendar" size={16} className="text-ink-muted" />
        {label}
        <Icon name="chevronDown" size={16} className="text-ink-muted" />
      </button>
    </div>
  )
}
