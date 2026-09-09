/**
 * A QR code, styled the way a branded one usually is: dots instead of solid
 * blocks for the data, the three corner "eyes" softened to rounded squares,
 * and a small flower badge sitting over the middle. The dots and eyes stay
 * pure black on white in both themes — this one has to scan and has to
 * print, so it opts out of dark mode rather than tanking its own contrast —
 * but the flower is decoration on top of a working code, not part of it, so
 * it can carry the app's own colour.
 *
 * The three eyes are drawn from fixed geometry rather than read module by
 * module: their 7×7 pattern is fixed by the QR spec itself, the same at
 * every corner of every code, whatever data is encoded — styling them is a
 * shape choice, not a data one. `'H'` error correction in `encodeQr` is what
 * lets the modules the badge covers go missing without the code failing to
 * scan.
 */

import type { CSSProperties } from 'react'
import { encodeQr } from '~/lib/qrcode'
import { cn } from '~/lib/cn'
import { PATHS } from '~/ui/Icon'

/** The app's `leaf` accent, at its light-mode value. Hardcoded rather than
 *  `var(--color-leaf)`: a code printed on a sticker has no theme to read a
 *  custom property from, and this has to look the same wherever it ends up. */
const LEAF = 'oklch(0.455 0.098 152)'

/** Fraction of the code's width the flower itself spans, and the plate
 *  behind it — a little wider, for a clean margin around the icon. */
const FLOWER_FRACTION = 0.24
const PLATE_FRACTION = 0.36

/** Radius of a data dot, and of the eyes' outer/ring/inner corners — all in
 *  module units, tuned for a soft but still crisply legible mosaic. */
const DOT_RADIUS = 0.42
const EYE_RADII = { outer: 2, ring: 1.4, inner: 0.9 }

/** One finder-pattern eye: a dark 7×7 square, a light ring one module in,
 *  and a dark 3×3 core — the QR spec's own fixed pattern, just rounded. */
function Eye({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width={7} height={7} rx={EYE_RADII.outer} fill="#000" />
      <rect x={1} y={1} width={5} height={5} rx={EYE_RADII.ring} fill="#fff" />
      <rect x={2} y={2} width={3} height={3} rx={EYE_RADII.inner} fill="#000" />
    </g>
  )
}

export function QrCode({
  value,
  className,
  style,
}: {
  value: string
  className?: string
  style?: CSSProperties
}) {
  const { size, isDark } = encodeQr(value)

  /** The three eyes always sit in these fixed 7×7 corners; a data dot never
   *  gets drawn on top of one, whatever the encoder set that module to. */
  const inEye = (row: number, col: number) =>
    (row < 7 && col < 7) || (row < 7 && col >= size - 7) || (row >= size - 7 && col < 7)

  const dots: { cx: number; cy: number }[] = []
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isDark(row, col) && !inEye(row, col)) dots.push({ cx: col + 0.5, cy: row + 0.5 })
    }
  }

  const center = size / 2
  const plateRadius = (size * PLATE_FRACTION) / 2
  const iconSize = size * FLOWER_FRACTION
  const iconScale = iconSize / 24

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {dots.map((dot, index) => (
        <circle key={index} cx={dot.cx} cy={dot.cy} r={DOT_RADIUS} fill="#000" />
      ))}
      <Eye x={0} y={0} />
      <Eye x={size - 7} y={0} />
      <Eye x={0} y={size - 7} />

      <circle cx={center} cy={center} r={plateRadius} fill="#fff" />
      <g
        transform={`translate(${center - iconSize / 2}, ${center - iconSize / 2}) scale(${iconScale})`}
        fill="none"
        stroke={LEAF}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS.flower}
      </g>
    </svg>
  )
}

/** The bordered box every QR code sits in, whatever the size. */
export function QrCodeBox({
  value,
  size = 96,
  className,
}: {
  value: string
  size?: number
  className?: string
}) {
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-md border border-line p-[13px]', className)}
      style={{ width: size + 26, height: size + 26, background: '#fff' }}
    >
      <QrCode value={value} style={{ width: size, height: size }} />
    </div>
  )
}
