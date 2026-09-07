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
import { routes } from '~/lib/router'
import { Icon, type IconName } from './Icon'

export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'tinted' | 'quiet' | 'danger'
export type ButtonSize = 'lg' | 'md' | 'sm'

const VARIANTS: Record<ButtonVariant, string> = {
  /** The WATER button. The only filled, saturated thing on the plant screen. */
  primary: 'bg-water text-on-accent border border-transparent',
  /** Everything that adds to the collection. */
  accent: 'bg-leaf text-on-accent border border-transparent',
  outline: 'border border-line-strong text-ink',
  /** Already done — a filled state that does not shout. */
  tinted: 'bg-water-tint text-water border border-transparent',
  quiet: 'border border-transparent text-ink-muted',
  danger: 'border border-ember text-ember',
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
        'transition-opacity active:opacity-70',
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
        'transition-opacity active:opacity-70',
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
 * Falling back to Today matters more than it looks: arriving by tapping the
 * sticker on a pot opens a fresh tab with nothing behind it, and a back button
 * that does nothing is worse than no back button.
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
        if (window.history.length > 1) window.history.back()
        else window.location.assign(routes.today())
      }}
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full active:opacity-70',
        variant === 'chip' ? 'bg-surface/90 text-ink shadow-md' : 'text-ink',
        className,
      )}
    >
      <Icon name="back" size={19} />
    </button>
  )
}
