/**
 * QR encoding, wrapped down to the one thing the UI needs: a square grid of
 * dark/light modules. Rendering — as SVG, at whatever size — is the caller's
 * job, same as the rest of `lib`.
 */

import qrcodegen from 'qrcode-generator'

export type QrMatrix = {
  size: number
  isDark: (row: number, col: number) => boolean
}

/** Type 0 lets the encoder pick the smallest version that fits; 'H' survives
 *  both a corner torn off a printed sticker and the flower sitting over its
 *  own middle without losing the link. */
export function encodeQr(data: string): QrMatrix {
  const qr = qrcodegen(0, 'H')
  qr.addData(data)
  qr.make()
  const size = qr.getModuleCount()
  return { size, isDark: (row, col) => qr.isDark(row, col) }
}
