/**
 * A solid-colour PNG of a given size, built rather than committed as a binary
 * fixture: the only thing the tests care about is the dimensions, and those
 * should be readable in the test that asserts on them.
 *
 * Not a `.spec.ts`, so Playwright collects nothing from this file.
 */

import zlib from 'node:zlib'

export function png(width: number, height: number): Buffer {
  const chunk = (tag: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(tag, 'ascii'), data])
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 2 // truecolour RGB

  // Each scanline is a filter byte followed by its pixels.
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x4c)])
  const raw = Buffer.concat(Array.from({ length: height }, () => row))

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}
