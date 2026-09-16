/**
 * "Log activity for the plant on screen", asked from outside the plant page.
 *
 * The tab bar's centre button turns into Log on a plant page, but the sheet it
 * opens belongs to that page. Rather than lift the sheet's state into the
 * shell, the button raises this and the page that is showing answers it.
 */

type Listener = () => void

const listeners = new Set<Listener>()

export function requestLog() {
  for (const listener of listeners) listener()
}

export function onLogRequest(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
