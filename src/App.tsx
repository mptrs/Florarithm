import { useEffect, useRef } from 'react'
import { load, useStore } from '~/data/store'
import { requestPersistence } from '~/data/db'
import { initSync } from '~/data/sync'
import { canGoBack, redirect, routes, useRoute, type Route } from '~/lib/router'
import { AppShell } from '~/layout/AppShell'
import { CollectionScreen } from '~/screens/CollectionScreen'
import { MilestonesScreen } from '~/screens/MilestonesScreen'
import { PhotoViewer } from '~/screens/PhotoViewer'
import { NewPlantSheet } from '~/screens/PlantSheets'
import { PlantScreen } from '~/screens/PlantScreen'
import { SettingsScreen } from '~/screens/SettingsScreen'
import { TodayScreen } from '~/screens/TodayScreen'
import { WishlistScreen } from '~/screens/WishlistScreen'
import { Banner } from '~/ui/Banner'

export function App() {
  const route = useRoute()
  const { status } = useStore()

  useEffect(() => {
    void load()
    // Ask Safari to keep the data rather than sweeping it up after a week
    // unused. Advisory, and a refusal is not an error.
    void requestPersistence()
    initSync()
  }, [])

  return (
    <AppShell route={route}>
      {status === 'error' ? (
        <Banner tone="warning">
          The local database could not be opened. Private browsing blocks storage entirely; in a
          normal window, reloading usually fixes it.
        </Banner>
      ) : (
        <Screen route={route} />
      )}
    </AppShell>
  )
}

function Screen({ route }: { route: Route }) {
  // The screen New was asked from, which it opens over. A plant with one of
  // its sheets open counts as that plant's page.
  const behind = useRef<Route | null>(null)
  if (route.name === 'edit') behind.current = { name: 'plant', code: route.code }
  else if (route.name !== 'new') behind.current = route

  if (route.name === 'new') {
    // Off a plant, over that plant; straight in from a link, over the list
    // the new record will join.
    const base: Route = route.parentCode
      ? { name: 'plant', code: route.parentCode }
      : (behind.current ?? { name: 'collection', filter: route.wish ? 'wishlist' : 'all' })
    return (
      <>
        <ScreenFor route={base} />
        <NewPlantSheet
          // A fresh start for a wish, a plant or a cutting off another parent.
          key={`new:${String(route.wish)}:${route.parentCode ?? ''}`}
          startAsWish={route.wish}
          parentCode={route.parentCode}
          onClose={() => (canGoBack() ? window.history.back() : redirect(hashOf(base)))}
          // Replaced rather than pushed: the sheet is not somewhere to come
          // back to once the plant exists.
          onAdded={(plant) => redirect(plant.wish ? routes.wishlist() : routes.plant(plant.code))}
        />
      </>
    )
  }

  return <ScreenFor route={route} />
}

/** Where a screen lives, for going back to it when there is no history to
 *  go back through. */
function hashOf(route: Route): string {
  switch (route.name) {
    case 'plant':
      return routes.plant(route.code)
    case 'collection':
      return route.filter === 'wishlist' ? routes.wishlist() : routes.collection(route.filter)
    case 'milestones':
      return routes.milestones()
    case 'settings':
      return routes.settings()
    case 'photos':
      return routes.photos(route.code, route.eventId ?? undefined)
    case 'edit':
      return routes.plant(route.code)
    default:
      return routes.today()
  }
}

function ScreenFor({ route }: { route: Route }) {
  switch (route.name) {
    case 'today':
      return <TodayScreen />
    case 'plant':
      return <PlantScreen code={route.code} />
    case 'photos':
      return <PhotoViewer code={route.code} eventId={route.eventId} />
    case 'collection':
      // A wish and a plant are one record with a flag between them, so they
      // share a route; they stopped sharing a screen the day the collection
      // grew photographs and a wish had none.
      return route.filter === 'wishlist' ? (
        <WishlistScreen />
      ) : (
        <CollectionScreen filter={route.filter} />
      )
    case 'new':
      return null
    case 'edit':
      return <PlantScreen key={`edit:${route.code}`} code={route.code} part={route.part} />
    case 'milestones':
      return <MilestonesScreen />
    case 'settings':
      return <SettingsScreen />
  }
}
