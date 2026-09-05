import { useEffect } from 'react'
import { load, useStore } from '~/data/store'
import { requestPersistence } from '~/data/db'
import { useRoute } from '~/lib/router'
import { AppShell } from '~/layout/AppShell'
import { CollectionScreen } from '~/screens/CollectionScreen'
import { PlantFormScreen } from '~/screens/PlantFormScreen'
import { PlantScreen } from '~/screens/PlantScreen'
import { SettingsScreen } from '~/screens/SettingsScreen'
import { TodayScreen } from '~/screens/TodayScreen'
import { Banner } from '~/ui/Banner'
import { UndoBar } from '~/ui/undo'

export function App() {
  const route = useRoute()
  const { status } = useStore()

  useEffect(() => {
    void load()
    // Ask Safari to keep the data rather than sweeping it up after a week
    // unused. Advisory, and a refusal is not an error.
    void requestPersistence()
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
      <UndoBar />
    </AppShell>
  )
}

function Screen({ route }: { route: ReturnType<typeof useRoute> }) {
  switch (route.name) {
    case 'today':
      return <TodayScreen />
    case 'plant':
      return <PlantScreen code={route.code} />
    case 'collection':
      return <CollectionScreen filter={route.filter} />
    case 'new':
      // Keyed on what makes it a fresh start: switching between plain "new",
      // a wish, or a cutting from a different parent should never inherit
      // the previous form's fields — a shared key with 'edit' would.
      return (
        <PlantFormScreen
          key={`new:${String(route.wish)}:${route.parentCode ?? ''}`}
          startAsWish={route.wish}
          parentCode={route.parentCode}
        />
      )
    case 'edit':
      return <PlantFormScreen key={`edit:${route.code}`} code={route.code} promote={route.promote} />
    case 'settings':
      return <SettingsScreen />
  }
}
