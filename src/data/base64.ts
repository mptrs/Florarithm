/**
 * UTF-8-safe base64, because the GitHub Contents API speaks base64 and `btoa`
 * only speaks Latin-1 — a plant named with an emoji or an accented species
 * would otherwise throw or come back mangled.
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
