/**
 * The icon set.
 *
 * One stroke style, one 24×24 grid, `currentColor` throughout — so an icon
 * takes its colour from whatever it sits in and never needs a colour prop.
 * Drawn inline rather than pulled from a font or a package: there are sixteen
 * of them, and this way they scale and recolour with the rest of the system.
 */

import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'

const PATHS = {
  droplet: <path d="M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10Z" />,
  rows: (
    <>
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h9" />
      <path d="M18 7h2" />
      <path d="M4 17h3" />
      <path d="M12 17h8" />
      <circle cx="15.5" cy="7" r="2.2" />
      <circle cx="9.5" cy="17" r="2.2" />
    </>
  ),
  bookmark: <path d="M6 4h12v17l-6-4-6 4Z" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 17h.01" />
    </>
  ),
  leaf: (
    <>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </>
  ),
  bloom: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9c0-3.5-1.4-5-3-5s-3 2-3 4 1.5 3 3 3" />
      <path d="M15 12c3.5 0 5-1.4 5-3s-2-3-4-3-3 1.5-3 3" />
      <path d="M12 15c0 3.5 1.4 5 3 5s3-2 3-4-1.5-3-3-3" />
      <path d="M9 12c-3.5 0-5 1.4-5 3s2 3 4 3 3-1.5 3-3" />
    </>
  ),
  pot: (
    <>
      <path d="M4 8h16l-1.6 11.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8Z" />
      <path d="M3 8V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2" />
    </>
  ),
  note: <path d="M4 4h16v12H8l-4 4Z" />,
  dice: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.1 0l2.4-2.4a5 5 0 0 0-7.1-7.1L11 4.9" />
      <path d="M14 11a5 5 0 0 0-7.1 0L4.5 13.4a5 5 0 0 0 7.1 7.1l1.4-1.4" />
    </>
  ),
  sync: <path d="M21 12a9 9 0 1 1-6.2-8.6" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

type IconProps = {
  name: IconName
  /** Pixels. 20 suits body text, 23 the tab bar, 16 an inline hint. */
  size?: number
  /** Placement only — margins and alignment. Colour comes from the parent. */
  className?: string
}

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
