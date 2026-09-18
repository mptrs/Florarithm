/**
 * The sachets, counted.
 *
 * Pure date arithmetic over the one record (see `Sachets`), kept out of the
 * component so it can be tested without a browser and read without JSX. No
 * prediction lives here: the four weeks are what the packet claims and the
 * lead time is what the shop's delivery terms say, so everything below is
 * subtraction from dates somebody else printed.
 */

import { addDays, daysBetween } from '~/lib/date'
import { SACHET_DAYS, type Sachets } from './types'

/**
 * Working days to allow between ordering and the day they run out.
 *
 * Rootsum ships Monday to Friday, the same day when ordered before 14:00,
 * with a day in transit — but live material is sometimes bred to order and
 * can take one to three days before it leaves. Five working days is the worst
 * case of that plus a day to spare, which in practice is a week's notice.
 * Counting only Monday to Friday is what keeps a weekend, with no shipping and
 * no Sunday post, from eating the margin.
 */
export const ORDER_WORKDAYS = 5

/** The three things the line on Today can be saying. */
export type SachetPhase =
  /** Working, and not yet time to order. */
  | 'hanging'
  /** Still working, but the next ones need ordering now to arrive in time. */
  | 'order'
  /** Run out: they stopped releasing today or earlier. */
  | 'spent'

/** The day they stop releasing: `SACHET_DAYS` calendar days after hanging. */
export function sachetRunOut(sachets: Sachets): Date {
  return addDays(sachets.hungOn, SACHET_DAYS)
}

/**
 * The last day to order and still have the next batch before they run out:
 * `ORDER_WORKDAYS` weekdays before the run-out day. A Saturday or Sunday is
 * stepped over rather than counted, so a Monday run-out means ordering by the
 * Monday before — five calendar days back would land on a Wednesday and leave
 * a weekend inside the margin.
 */
export function sachetOrderBy(sachets: Sachets): Date {
  let day = sachetRunOut(sachets)
  let counted = 0
  while (counted < ORDER_WORKDAYS) {
    day = addDays(day, -1)
    const weekday = day.getDay()
    if (weekday !== 0 && weekday !== 6) counted += 1
  }
  return day
}

/** Days until they run out: 0 on the day itself, negative after. */
export function sachetDaysLeft(sachets: Sachets, now: Date = new Date()): number {
  return daysBetween(now, sachetRunOut(sachets))
}

export function sachetPhase(sachets: Sachets, now: Date = new Date()): SachetPhase {
  if (sachetDaysLeft(sachets, now) <= 0) return 'spent'
  if (daysBetween(now, sachetOrderBy(sachets)) <= 0) return 'order'
  return 'hanging'
}
