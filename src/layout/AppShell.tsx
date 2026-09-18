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
import { countOf, findPlant } from '~/data/selectors'
import { useSyncStatus } from '~/data/sync'
import { routes, type Route } from '~/lib/router'
import { Icon, type IconName } from '~/ui/Icon'
import { requestLog } from '~/ui/logRequest'
import { SyncStatusPill } from '~/ui/SyncStatusPill'
import { ToastHost } from '~/ui/toast'

type NavKey = 'today' | 'collection' | 'wishlist' | 'new' | 'settings'

type NavItem = {
  key: NavKey
  label: string
  /** Shorter, for the tab bar. */
  shortLabel?: string
  icon: IconName
  href: string
}

/**
 * Four places and one action, in that order.
 *
 * Adding a plant is the only item here that does something rather than goes
 * somewhere, so on a phone it sits in the middle where a thumb rests and is
 * drawn as the action it is. The wishlist earned a stop of its own when it
 * stopped being a filter on the collection.
 */
const NAV_ITEMS: readonly NavItem[] = [
  { key: 'today', label: 'Today', icon: 'droplet', href: routes.today() },
  { key: 'collection', label: 'Collection', icon: 'rows', href: routes.collection() },
  { key: 'new', label: 'New plant', shortLabel: 'New', icon: 'plus', href: routes.new() },
  { key: 'wishlist', label: 'Wishlist', icon: 'bookmark', href: routes.wishlist() },
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
    case 'milestones':
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

      <main className="min-w-0 flex-1 px-4 pt-6 pb-under-bar md:px-12 md:pt-8 md:pb-12">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>

      <BottomNav route={route} active={active} />
      <ToastHost />
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
    <aside className="hidden w-62 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
      <span className="px-3 pb-6 font-display text-[1.4375rem] font-medium tracking-[-0.01em]">
        Florarithm
      </span>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active
          const count = counts[item.key]

          return (
            <a
              key={item.key}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'warm flex h-touch items-center gap-2 rounded-md px-3 text-[0.9375rem]',
                isActive
                  ? 'bg-leaf-tint font-semibold text-leaf'
                  : 'font-medium text-ink-muted hover:bg-sunk hover:text-ink',
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
          <div className="border-t border-line px-3 pt-3">
            <SyncStatusPill status={syncStatus} />
          </div>
        </>
      )}
    </aside>
  )
}

/**
 * What the tab bar's centre button does here.
 *
 * It is the one action on the bar, and the action is "add to what you are
 * looking at": a plant to the collection, an entry to a plant's record, a wish
 * to the wishlist. On a plant page it is drawn in ink and says Log, so the
 * change reads before the label does — ink is the colour the log sheet already
 * uses for things written down. A wish takes no entries, so its page keeps New.
 */
type CentreAction =
  | { kind: 'link'; label: string; href: string; tone: 'leaf' }
  | { kind: 'log'; label: string; tone: 'ink' }

function centreAction(route: Route, state: ReturnType<typeof useStore>): CentreAction {
  if (route.name === 'plant') {
    const plant = findPlant(state, route.code)
    if (plant && !plant.deleted && !plant.wish) return { kind: 'log', label: 'Log', tone: 'ink' }
  }
  if (route.name === 'collection' && route.filter === 'wishlist') {
    return { kind: 'link', label: 'New', href: routes.newWish(), tone: 'leaf' }
  }
  return { kind: 'link', label: 'New', href: routes.new(), tone: 'leaf' }
}

function BottomNav({ route, active }: { route: Route; active: NavKey | null }) {
  const state = useStore()
  const centre = centreAction(route, state)

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface pt-2 md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active
        const itemClass = 'flex flex-1 flex-col items-center gap-1 pb-2'

        if (item.key === 'new') {
          // The one action on a bar of destinations: a filled disc that cuts
          // the bar's own hairline rather than sitting politely inside it, so
          // it reads as a button and not as a fifth place to be.
          const disc = (
            <>
              <span
                className={cn(
                  '-mt-6 flex size-12 items-center justify-center rounded-full',
                  centre.tone === 'ink' ? 'bg-ink text-paper' : 'bg-leaf text-on-accent',
                )}
              >
                <Icon name="plus" size={26} />
              </span>
              <span className={cn('text-[0.6875rem] leading-4', isActive || centre.kind === 'log' ? 'font-semibold' : '')}>
                {centre.label}
              </span>
            </>
          )

          return centre.kind === 'log' ? (
            <button
              key={item.key}
              type="button"
              aria-label="Log activity"
              onClick={requestLog}
              className={cn(itemClass, 'text-ink active:opacity-70')}
            >
              {disc}
            </button>
          ) : (
            <a
              key={item.key}
              href={centre.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(itemClass, 'text-leaf')}
            >
              {disc}
            </a>
          )
        }

        return (
          <a
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(itemClass, isActive ? 'text-leaf' : 'text-ink-faint')}
          >
            <Icon name={item.icon} size={24} />
            <span className={cn('text-[0.6875rem] leading-4', isActive ? 'font-semibold' : '')}>
              {item.shortLabel ?? item.label}
            </span>
          </a>
        )
      })}
    </nav>
  )
}
