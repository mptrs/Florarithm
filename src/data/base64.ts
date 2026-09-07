/**
 * Base64, because the GitHub Contents API speaks nothing else.
 *
 * Text goes through the UTF-8 pair: `btoa` only speaks Latin-1, so a plant
 * named with an emoji or an accented species would otherwise throw or come back
 * mangled. Photographs go through the byte pair below, which skips the text
 * step entirely — a JPEG is not a string and decoding it as one would corrupt
 * it.
 */

export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function base64ToUtf8(base64: string): string {
  // GitHub wraps content at 60 columns; atob chokes on the newlines.
  const binary = atob(base64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** A JPEG on its way to the repo. Chunked because `String.fromCharCode` takes
 *  its arguments on the stack, and spreading a few hundred thousand of them at
 *  once overflows it. */
export function bytesToBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes)
  const CHUNK = 0x8000
  let binary = ''
  for (let index = 0; index < view.length; index += CHUNK) {
    binary += String.fromCharCode(...view.subarray(index, index + CHUNK))
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): ArrayBuffer {
  // GitHub wraps content at 60 columns; atob chokes on the newlines.
  const binary = atob(base64.replace(/\s/g, ''))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer
}
