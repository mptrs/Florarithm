import { useRemembered } from './remembered'

/**
 * How many days without water before a plant with no rhythm of its own yet
 * comes onto Today. A plant with one comes on a day before it — see
 * `waterRhythm`; this is for the first few weeks a plant is in the collection.
 *
 * `0` is always. Kept on the device, because it is how this device likes to
 * look at the list, not a fact about the collection.
 */
export const TODAY_AFTER_OPTIONS = ['0', '2', '3', '4', '5', '6', '7'] as const
export type TodayAfter = (typeof TODAY_AFTER_OPTIONS)[number]

export function useTodayAfter(): [number, (value: TodayAfter) => void] {
  const [value, setValue] = useRemembered<TodayAfter>('today-after', '4', TODAY_AFTER_OPTIONS)
  return [Number(value), setValue]
}
