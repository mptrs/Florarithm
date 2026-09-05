/**
 * The frame around every screen.
 *
 * A phone gets a tab bar at the bottom, within reach of a thumb while you are
 * standing in front of a plant holding a watering can. From `md` up that becomes
 * a sidebar, because a desktop window has no bottom edge worth reaching for and
 * the extra width is better spent on the list.
 *
 * Both navs are rendered and swapped by breakpoint rather than by measuring the
 * viewport in JavaScript: no flash of the wrong layout, nothing to keep in sync.
 */

import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { useStore } from '~/data/store'
import { countOf } from '~/data/selectors'
import { useSyncStatus } from '~/data/sync'
import { routes, type Route } from '~/lib/router'
import { Icon, type IconName } from '~/ui/Icon'
import { SyncStatusPill } from '~/ui/SyncStatusPill'

type NavKey = 'today' | 'collection' | 'wishlist' | 'new' | 'settings'

type NavItem = {
  key: NavKey
  label: string
  /** Shorter, for the tab bar. */
  shortLabel?: string
  icon: IconName
  href: string
  /** The wishlist is a filter of the collection; on a phone it lives behind a
   *  chip rather than taking a quarter of the tab bar. */
  desktopOnly?: boolean
}

const NAV_ITEMS: readonly NavItem[] = [
  { key: 'today', label: 'Today', icon: 'droplet', href: routes.today() },
  { key: 'collection', label: 'Collection', icon: 'rows', href: routes.collection() },
  {
    key: 'wishlist',
    label: 'Wishlist',
    icon: 'bookmark',
    href: routes.collection('wishlist'),
    desktopOnly: true,
  },
  { key: 'new', label: 'New plant', shortLabel: 'New', icon: 'plus', href: routes.new() },
  { key: 'settings', label: 'Settings', icon: 'sliders', href: routes.settings() },
]

/**
 * Which item lights up.
 *
 * A plant page counts as Collection rather than Today: Today is a list of work
 * outstanding, a plant is a member of the collection — including when you got
 * there by tapping the sticker on its pot.
 */
export function activeNavKey(route: Route): NavKey | null {
  switch (route.name) {
    case 'today':
      return 'today'
    case 'plant':
    case 'edit':
      return 'collection'
    case 'collection':
      return route.filter === 'wishlist' ? 'wishlist' : 'collection'
    case 'new':
      return 'new'
    case 'settings':
      return 'settings'
  }
}

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const active = activeNavKey(route)

  return (
    <div className="min-h-dvh md:flex">
      <Sidebar active={active} />

      <main className="min-w-0 flex-1 px-4 pt-6 pb-32 md:px-10 md:pt-8 md:pb-12">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>

      <BottomNav active={active} />
    </div>
  )
}

function Sidebar({ active }: { active: NavKey | null }) {
  const state = useStore()
  const syncStatus = useSyncStatus()

  const counts: Partial<Record<NavKey, number>> = {
    collection: countOf(state, 'all'),
    wishlist: countOf(state, 'wishlist'),
  }

  return (
    <aside className="hidden w-62 shrink-0 flex-col border-r border-line bg-surface px-3.5 py-6 md:flex">
      <span className="px-2.5 pb-6 font-display text-[1.4375rem] font-medium tracking-[-0.01em]">
        Florarithm
      </span>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active
          const count = counts[item.key]

          return (
            <a
              key={item.key}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex h-touch items-center gap-2.5 rounded-md px-2.5 text-[0.9375rem]',
                isActive
                  ? 'bg-leaf-tint font-semibold text-leaf'
                  : 'font-medium text-ink-muted hover:bg-sunk',
              )}
            >
              <Icon name={item.icon} size={19} />
              <span className="flex-1">{item.label}</span>
              {count === undefined ? null : (
                <span className={cn('font-mono text-[0.8125rem]', isActive ? '' : 'text-ink-faint')}>
                  {count}
                </span>
              )}
            </a>
          )
        })}
      </nav>

      {/* Settings already shows its own, larger status — no need for both. */}
      {active === 'settings' || syncStatus.kind === 'unconfigured' ? null : (
        <>
          <div className="flex-1" />
          <div className="border-t border-line px-2.5 pt-3.5">
            <SyncStatusPill status={syncStatus} />
          </div>
        </>
      )}
    </aside>
  )
}

function BottomNav({ active }: { active: NavKey | null }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface pt-2.5 md:hidden">
      {NAV_ITEMS.filter((item) => !item.desktopOnly).map((item) => {
        const isActive = item.key === active

        return (
          <a
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 pb-2.5',
              isActive ? 'text-leaf' : 'text-ink-faint',
            )}
          >
            <Icon name={item.icon} size={23} />
            <span className={cn('text-[0.6875rem]', isActive ? 'font-semibold' : '')}>
              {item.shortLabel ?? item.label}
            </span>
          </a>
        )
      })}
    </nav>
  )
}
