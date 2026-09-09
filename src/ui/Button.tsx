/**
 * The button.
 *
 * Look is chosen with `variant`, height with `size` — never by passing utility
 * classes in. `className` is for placement only (see `lib/cn.ts`).
 *
 * Sizes map onto the reach rule: `lg` is the one action you came for, `md` is
 * every ordinary control, `sm` is the floor for anything that writes data. There
 * is no size below the floor, which is why filter chips are a separate
 * component rather than a smaller button.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { canGoBack, routes } from '~/lib/router'
import { Icon, type IconName } from './Icon'

export type ButtonVariant = 'primary' | 'accent' | 'solid' | 'outline' | 'tinted' | 'quiet' | 'danger'
export type ButtonSize = 'lg' | 'md' | 'sm'

/**
 * Hover deepens; it never fades.
 *
 * `hover:` is already only ever asked on a device that can point — Tailwind
 * compiles it inside `@media (hover: hover)` — so the `md:` these carried is
 * not what keeps a phone from sticking, and all it ever did was withhold the
 * hover from a desktop window narrower than 768px.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  /** The WATER button. The only filled, saturated thing on the plant screen. */
  primary: 'bg-water text-on-accent border border-transparent hover:bg-water-deep hover:shadow-sm',
  /** Everything that adds to the collection. */
  accent: 'bg-leaf text-on-accent border border-transparent hover:bg-leaf-deep hover:shadow-sm',
  /** The neutral fill: what commits a sheet you opened to do one thing — pick
   *  a date, write a note, record a repot. Ink rather than water or leaf,
   *  because those two already mean watering and adding, and none of these is
   *  either. It was three hand-drawn buttons before this, which is how one of
   *  them ended up with a disabled state and the other two did not. */
  solid: 'bg-ink text-paper border border-transparent hover:bg-ink-deep hover:shadow-sm',
  outline: 'border border-line-strong text-ink hover:bg-sunk hover:border-ink-faint',
  /** Already done — a filled state that does not shout, and does not start
   *  shouting on hover either: the ground holds and only the mark deepens. */
  tinted: 'bg-water-tint text-water border border-transparent hover:text-water-deep',
  quiet: 'border border-transparent text-ink-muted hover:bg-sunk hover:text-ink',
  danger: 'border border-ember text-ember hover:bg-ember-tint',
}

const SIZES: Record<ButtonSize, string> = {
  lg: 'h-primary text-[1.1875rem] font-semibold tracking-[0.12em] px-6',
  md: 'h-control text-body font-medium px-4',
  sm: 'h-touch text-[0.875rem] font-semibold px-3.5',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Stretch to the container. Full width is the default for `lg`. */
  block?: boolean
  icon?: IconName
  children?: ReactNode
}

export function Button({
  variant = 'outline',
  size = 'md',
  block,
  icon,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-ui',
        'lift active:opacity-70',
        'disabled:opacity-40 disabled:pointer-events-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
        VARIANTS[variant],
        SIZES[size],
        block || size === 'lg' ? 'w-full' : '',
        className,
      )}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 20} /> : null}
      {children}
    </button>
  )
}

/**
 * A square icon-only button that still meets the floor. Needs a label for
 * anyone who cannot see the glyph.
 */
export function IconButton({
  icon,
  label,
  variant = 'outline',
  className,
  type = 'button',
  ...rest
}: Omit<ButtonProps, 'children' | 'size' | 'block' | 'icon'> & {
  icon: IconName
  label: string
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-control shrink-0 items-center justify-center rounded-md',
        'lift active:opacity-70',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  )
}

/**
 * The way back.
 *
 * `chip` is the one that sits on a photograph, where the arrow needs a disc
 * under it to stay legible over whatever the picture happens to be. `bare` is
 * the same arrow on paper, where all that would buy is a button drawn around a
 * button. Same glyph, same size, same tap target either way.
 *
 * Falling back to Collection matters more than it looks: arriving by tapping
 * the sticker on a pot opens a fresh tab with nothing of ours behind it, and
 * a back button that does nothing is worse than no back button. `canGoBack`
 * is what tells the two cases apart — the tab's raw history length can't,
 * since a tab that already had browsing behind it before the app ever
 * loaded looks identical to one with an in-app page to return to. Collection
 * rather than Today: a plant reached with nothing behind it is a plant you
 * own, found by its own sticker, not a card off today's watering list.
 */
export function BackButton({
  variant = 'chip',
  className,
}: {
  variant?: 'chip' | 'bare'
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => {
        if (canGoBack()) window.history.back()
        else window.location.assign(routes.collection())
      }}
      className={cn(
        'lift flex size-10 shrink-0 items-center justify-center rounded-full active:opacity-70',
        variant === 'chip'
          ? 'bg-floating text-ink shadow-md hover:bg-surface hover:shadow-lg'
          : 'text-ink hover:bg-sunk',
        className,
      )}
    >
      <Icon name="back" size={19} />
    </button>
  )
}
