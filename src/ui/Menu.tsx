/**
 * The overflow menu.
 *
 * What is behind the ellipsis: the sticker, and the two things you do to a
 * plant record rather than to a plant. All of it is rare, and none of it earns
 * a place on the face of the page — but it has to be somewhere findable, and
 * "somewhere findable" is what an ellipsis means.
 */

import { useEffect, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Icon, type IconName } from './Icon'

export function Menu({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-ink/30"
      />
      <div
        role="menu"
        aria-label={label}
        className={cn(
          'absolute top-full right-0 z-50 mt-1 w-[15rem] overflow-hidden',
          'rounded-xl border border-line bg-surface shadow-xl',
        )}
      >
        {children}
      </div>
    </>
  )
}

export function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
  className,
}: {
  icon: IconName
  label: string
  onClick: () => void
  danger?: boolean
  /** Placement only — used to keep an item off the breakpoint that already has
   *  a better route to the same thing. */
  className?: string
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex h-13 w-full items-center gap-3 border-b border-line px-4 text-left',
        'text-[0.9375rem] font-medium last:border-b-0 active:opacity-70 hover:bg-sunk',
        danger ? 'text-ember' : 'text-ink',
        className,
      )}
    >
      <Icon name={icon} size={19} />
      {label}
    </button>
  )
}
