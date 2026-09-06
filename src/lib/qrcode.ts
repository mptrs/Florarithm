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

/** Type 0 lets the encoder pick the smallest version that fits; 'M' survives
 *  a corner torn off a printed sticker without losing the link. */
export function encodeQr(data: string): QrMatrix {
  const qr = qrcodegen(0, 'M')
  qr.addData(data)
  qr.make()
  const size = qr.getModuleCount()
  return { size, isDark: (row, col) => qr.isDark(row, col) }
}
