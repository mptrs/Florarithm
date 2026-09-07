/**
 * A confirmation the app can actually show.
 *
 * `window.confirm` is silently a no-op in an installed, standalone PWA on
 * iOS — the dialog never appears and the promise-shaped call site just gets
 * `false` back forever. This app is meant to be added to the home screen, so
 * every "are you sure" has to be a sheet instead.
 */

import { useState, type ReactNode } from 'react'
import { Button, type ButtonVariant } from './Button'
import { Sheet } from './Sheet'

type ConfirmOptions = {
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
}

export function useConfirm(): {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  dialog: ReactNode
} {
  const [pending, setPending] = useState<{
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const confirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => setPending({ options, resolve }))

  const settle = (value: boolean) => {
    pending?.resolve(value)
    setPending(null)
  }

  const dialog = pending ? (
    <Sheet open onClose={() => settle(false)} title={pending.options.title}>
      <p className="mt-1 text-[0.9375rem] leading-6 text-ink-muted whitespace-pre-line">
        {pending.options.message}
      </p>
      <div className="mt-6 flex gap-3">
        <Button
          variant={(pending.options.danger ? 'danger' : 'accent') satisfies ButtonVariant}
          onClick={() => settle(true)}
        >
          {pending.options.confirmLabel ?? 'Confirm'}
        </Button>
        <Button variant="outline" onClick={() => settle(false)}>
          Cancel
        </Button>
      </div>
    </Sheet>
  ) : null

  return { confirm, dialog }
}
