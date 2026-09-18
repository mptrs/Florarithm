/**
 * A line that stays until the thing it asks for is done.
 *
 * Deliberately not a dialog and not dismissible: something you can tap away,
 * you tap away. The backup reminder is the case this exists for — it is the
 * only warning in the app that is about losing data.
 */

import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Icon, type IconName } from './Icon'

const TONES = {
  warning: { box: 'border-ember bg-ember-tint', icon: 'text-ember' },
  info: { box: 'border-line bg-surface', icon: 'text-ink-muted' },
} as const

export function Banner({
  tone = 'info',
  icon = 'alert',
  children,
  action,
  className,
}: {
  tone?: keyof typeof TONES
  icon?: IconName
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  const style = TONES[tone]

  return (
    <div
      className={cn(
        'flex min-h-touch items-center gap-2 rounded-md border px-3 py-2',
        style.box,
        className,
      )}
    >
      {/* The icon belongs to the first line, not to the middle of the text:
          it sits in a box one line tall, and the pair is centred in the
          banner as one piece, so a one-line banner still reads level and a
          four-line one does not float its icon halfway down. */}
      <span className="flex flex-1 items-start gap-2">
        <span className="flex h-6 shrink-0 items-center">
          <Icon name={icon} size={16} className={style.icon} />
        </span>
        <span className="flex-1 text-[0.8125rem] leading-6 text-ink">{children}</span>
      </span>
      {action}
    </div>
  )
}
