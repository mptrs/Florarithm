/**
 * The sync status line — quiet unless it needs you.
 *
 * Four states, one line: synced, syncing, waiting offline, and the one state
 * that borrows the alarm colour because a person actually has to do
 * something about it. `unconfigured` renders nothing here at all; Settings'
 * own empty fields are the call to action for that one.
 */

import type { SyncStatus } from '~/data/sync'
import { formatRelative } from '~/lib/date'
import { routes } from '~/lib/router'
import { cn } from '~/lib/cn'
import { Icon } from './Icon'

export function SyncStatusPill({
  status,
  variant = 'compact',
  className,
}: {
  status: SyncStatus
  /** `rail`: a glyph over one word, for the desktop rail; the whole line is
   *  its tooltip. */
  variant?: 'compact' | 'detailed' | 'rail'
  className?: string
}) {
  if (status.kind === 'unconfigured') return null

  if (variant === 'rail') return <RailStatus status={status} className={className} />

  if (status.kind === 'error') {
    return (
      <div
        className={cn(
          'flex flex-col gap-1 rounded-md border border-ember bg-ember-tint px-4 py-3',
          className,
        )}
      >
        <div className="flex items-start gap-2">
          <span className="flex h-5 shrink-0 items-center">
            <Icon name="alert" size={15} className="text-ember" />
          </span>
          <div className="flex-1">
            <span className="text-[0.8125rem] leading-5 text-ink">{status.message}</span>
            {status.pendingCount > 0 ? (
              <p className="text-[0.8125rem] leading-5 text-ink-muted">
                {status.pendingCount} change{status.pendingCount === 1 ? '' : 's'} still waiting to
                sync — nothing has been lost.
              </p>
            ) : null}
          </div>
        </div>
        {/* The hover fills rather than tints: this sits on the ember-tinted
            panel itself, and a tint on a tint is a state nobody can see —
            which is what it had. */}
        {variant === 'compact' ? (
          <a
            href={routes.settings()}
            className={cn(
              'warm flex h-touch shrink-0 items-center self-end rounded-sm px-4',
              'text-[0.8125rem] font-semibold text-ember',
              'active:opacity-70 hover:bg-ember hover:text-on-accent',
            )}
          >
            Fix
          </a>
        ) : null}
      </div>
    )
  }

  const { icon, label, spin } = describe(status)

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        variant === 'detailed' && 'h-10 rounded-md border border-line bg-surface px-3',
        className,
      )}
    >
      <Icon
        name={icon}
        size={variant === 'detailed' ? 15 : 14}
        className={cn('shrink-0', icon === 'check' ? 'text-leaf' : 'text-ink-muted', spin && 'animate-spin')}
      />
      <span className="flex-1 text-[0.8125rem] text-ink-muted">{label}</span>
      {variant === 'detailed' && status.kind === 'idle' ? (
        <span className="font-mono text-[0.75rem] text-ink-faint">
          {status.eventCount} event{status.eventCount === 1 ? '' : 's'}
        </span>
      ) : null}
    </div>
  )
}

/**
 * The status in a rail's width. A failure still borrows the alarm colour and
 * is still the way to Settings — it is the one state a person has to act on,
 * so it stays a link and not a tooltip.
 */
function RailStatus({
  status,
  className,
}: {
  status: Exclude<SyncStatus, { kind: 'unconfigured' }>
  className?: string
}) {
  const word = 'flex w-16 flex-col items-center gap-1 text-center text-[0.6875rem] leading-4'

  if (status.kind === 'error') {
    return (
      <a
        href={routes.settings()}
        title={status.message}
        className={cn(word, 'warm rounded-md py-2 font-semibold text-ember hover:bg-ember-tint', className)}
      >
        <Icon name="alert" size={18} />
        Fix sync
      </a>
    )
  }

  const { icon, label, spin } = describe(status)
  const short = { idle: 'Synced', syncing: 'Syncing', 'offline-pending': 'Offline' }[status.kind]

  return (
    <div title={label} className={cn(word, 'text-ink-faint', className)}>
      <Icon
        name={icon}
        size={16}
        className={cn(icon === 'check' ? 'text-leaf' : 'text-ink-muted', spin && 'animate-spin')}
      />
      <span aria-hidden>{short}</span>
      <span className="sr-only">{label}</span>
    </div>
  )
}

function describe(status: Exclude<SyncStatus, { kind: 'unconfigured' | 'error' }>): {
  icon: 'check' | 'sync' | 'clock'
  label: string
  spin: boolean
} {
  switch (status.kind) {
    case 'idle':
      return {
        icon: 'check',
        label: status.lastSyncedAt ? `Synced ${formatRelative(status.lastSyncedAt)}` : 'Not synced yet',
        spin: false,
      }
    case 'syncing':
      return { icon: 'sync', label: 'Syncing…', spin: true }
    case 'offline-pending':
      return {
        icon: 'clock',
        label:
          status.count > 0
            ? `${status.count} change${status.count === 1 ? '' : 's'} waiting — offline`
            : 'Waiting for a connection',
        spin: false,
      }
  }
}
