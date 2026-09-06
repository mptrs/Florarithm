/**
 * A QR code, drawn as one `<path>` of dark modules rather than a data-URL
 * image — so it stays crisp on a retina screen and at any size. Always black
 * on white, in both themes: this one has to scan and has to print, so it
 * opts out of dark mode rather than tanking its own contrast.
 */

import type { CSSProperties } from 'react'
import { encodeQr } from '~/lib/qrcode'
import { cn } from '~/lib/cn'

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

  const rects: string[] = []
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isDark(row, col)) rects.push(`M${col},${row}h1v1h-1z`)
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={rects.join('')} fill="#000" />
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
