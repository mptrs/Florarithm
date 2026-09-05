/**
 * Today — what you see when you open the bookmark.
 *
 * Active plants, longest since water at the top, never-logged above all of it.
 * No prediction of when a plant *needs* water: watering happens on fixed days,
 * so every measured gap lands on 7 or 14 and the app would be predicting the
 * calendar and calling it botany.
 */

import { useStore } from '~/data/store'
import {
  daysSinceWater,
  isThirsty,
  lastWaterAt,
  livePlants,
  todayList,
  vocabName,
} from '~/data/selectors'
import { useSyncStatus } from '~/data/sync'
import { daysSince, formatDayMonth, formatFullDate } from '~/lib/date'
import { formatSpecies, label, plural } from '~/lib/format'
import { routes } from '~/lib/router'
import { Banner } from '~/ui/Banner'
import { Button } from '~/ui/Button'
import { DaysSinceWater, EmptyState, Rows, ScreenHeader } from '~/ui/primitives'
import { Cell, ColumnHeader, RowLink, RowName } from '~/ui/rows'
import { SyncStatusPill } from '~/ui/SyncStatusPill'

/** After this long without an export, the reminder appears and stays. */
const BACKUP_REMINDER_DAYS = 14

export function TodayScreen() {
  const state = useStore()
  const plants = todayList(state)
  const syncStatus = useSyncStatus()

  return (
    <div className="flex flex-col gap-4">
      <SyncStatusPill status={syncStatus} className="md:hidden" />

      <ScreenHeader
        title="Today"
        meta={
          <>
            <span className="hidden md:inline">{formatFullDate()}</span>
            <span className="md:hidden">{plural(plants.length, 'plant')}</span>
          </>
        }
      />

      <BackupReminder
        lastBackupAt={state.lastBackupAt}
        hasPlants={livePlants(state).length > 0}
        synced={syncStatus.kind !== 'unconfigured'}
      />

      {plants.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Add your first plant and it will show up here, sorted by how long it has been since it last had water."
          action={
            <Button variant="accent" onClick={() => window.location.assign(routes.new())}>
              Add a plant
            </Button>
          }
        />
      ) : (
        <div>
          {/* The table header only exists once there are columns to head. */}
          <div className="hidden items-center gap-4 border-b border-line-strong pb-2.5 lg:flex">
            <ColumnHeader className="flex-1">Plant</ColumnHeader>
            <ColumnHeader className="w-64">Species</ColumnHeader>
            <ColumnHeader className="w-52">Place</ColumnHeader>
            <ColumnHeader className="w-28">System</ColumnHeader>
            <ColumnHeader className="w-24">Last water</ColumnHeader>
            <ColumnHeader className="w-16 text-right">Days</ColumnHeader>
          </div>

          <Rows className="lg:border-t-0">
            {plants.map((plant) => {
              const days = daysSinceWater(state, plant.code)
              const last = lastWaterAt(state, plant.code)
              const place = vocabName(state, plant.locationId)

              return (
                <RowLink key={plant.code} href={routes.plant(plant.code)}>
                  <RowName name={plant.name} secondary={place} hideSecondaryFrom="lg" />

                  <Cell className="hidden w-64 lg:block">{formatSpecies(plant)}</Cell>
                  <Cell className="hidden w-52 lg:block">{place}</Cell>
                  <Cell className="hidden w-28 lg:block">{label(plant.system)}</Cell>
                  <Cell className="hidden w-24 lg:block" mono>
                    {last ? formatDayMonth(last) : '—'}
                  </Cell>

                  <div className="w-16 shrink-0 lg:text-right">
                    <DaysSinceWater days={days} thirsty={isThirsty(days)} />
                  </div>
                </RowLink>
              )
            })}
          </Rows>
        </div>
      )}
    </div>
  )
}

function BackupReminder({
  lastBackupAt,
  hasPlants,
  synced,
}: {
  lastBackupAt: string | null
  hasPlants: boolean
  /** Sync is the real safety net once it's configured, so the manual-export
   *  nag has nothing left to warn about — it stays quiet rather than
   *  competing with the sync status pill for the same worry. */
  synced: boolean
}) {
  if (!hasPlants || synced) return null

  const days = lastBackupAt === null ? null : daysSince(lastBackupAt)
  if (days !== null && days < BACKUP_REMINDER_DAYS) return null

  return (
    <Banner
      tone="warning"
      action={
        <Button size="sm" variant="danger" onClick={() => window.location.assign(routes.settings())}>
          Back up
        </Button>
      }
    >
      {days === null
        ? 'Your collection has never been backed up. It lives only on this device.'
        : `No backup for ${plural(days, 'day')}. Your collection lives only on this device.`}
    </Banner>
  )
}
