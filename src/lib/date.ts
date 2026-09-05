/** Dates. One locale for the whole app, so a date never renders two ways. */

const LOCALE = 'en-GB'

const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const fullDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const MS_PER_DAY = 86_400_000

export function nowISO(): string {
  return new Date().toISOString()
}

/** `2026-09-05`, for date inputs. */
export function todayInputValue(): string {
  return isoToInputValue(nowISO())
}

export function isoToInputValue(iso: string): string {
  const date = new Date(iso)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** A `yyyy-mm-dd` input value back to an ISO timestamp at local midday, so a
 *  timezone shift can never move it onto the day before. */
export function inputValueToISO(value: string): string | null {
  if (!value) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Whole days between two moments, counted by calendar day rather than by
 *  elapsed hours: watering last night and looking this morning is 1 day, not 0. */
export function daysBetween(from: string | Date, to: string | Date = new Date()): number {
  const a = startOfDay(from)
  const b = startOfDay(to)
  return Math.round((b - a) / MS_PER_DAY)
}

export function daysSince(iso: string): number {
  return daysBetween(iso)
}

function startOfDay(value: string | Date): number {
  const date = new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** `2 Sep` — for history rows, where the year is obvious from context. */
export function formatDayMonth(iso: string): string {
  return dayMonth.format(new Date(iso))
}

/** `2 Sep 2026` — for facts, where it is not. */
export function formatDate(iso: string): string {
  return dayMonthYear.format(new Date(iso))
}

/** `Friday 5 September 2026` — the desktop header. */
export function formatFullDate(date: Date = new Date()): string {
  return fullDate.format(date)
}

export function yearOf(iso: string): number {
  return new Date(iso).getFullYear()
}
