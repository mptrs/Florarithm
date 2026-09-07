/**
 * A plant, as a picture.
 *
 * The collection shows the same photograph at two sizes and the choice is a
 * breakpoint, not a screen: a tile on a phone, where you recognise a plant
 * faster by sight than by name, and a 40px thumbnail at the head of a desktop
 * row, which is the whole reason to look at that list rather than at Today.
 *
 * All three read the picture the same way — the chosen photograph, or the
 * newest, or the drawn plate — so a plant can never look like one thing in the
 * grid and another in the table.
 */

import { usePhoto } from '~/data/photos'
import { currentPhotoEvent } from '~/data/selectors'
import { useStore } from '~/data/store'
import type { Plant } from '~/data/types'
import { cn } from '~/lib/cn'
import { routes } from '~/lib/router'
import { Plate } from './Plate'

/** The photograph or the plate, filling whatever box it is given. */
export function PlantPicture({ plant }: { plant: Plant }) {
  const state = useStore()
  const event = currentPhotoEvent(state, plant.code)
  const photo = usePhoto(event?.id ?? null)

  // Decorative on purpose: every caller wraps this in a link that already
  // carries the plant's name, and a second copy of it only makes the link
  // read twice as long to a screen reader.
  return photo ? <img src={photo} alt="" className="size-full object-cover" /> : <Plate />
}

/**
 * One plant in the grid.
 *
 * `secondary` is whatever the grouping is not already saying — the species when
 * the run is grouped by place, the place when it is sorted A–Z. That rule is
 * the reason this takes a string rather than reading the plant itself.
 */
export function PlantTile({
  plant,
  secondary,
  tag,
}: {
  plant: Plant
  secondary?: string
  /** An archived plant carries why it is archived, and is drawn faded. */
  tag?: string
}) {
  return (
    <a
      href={routes.plant(plant.code)}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-line bg-surface',
        'transition-colors active:bg-sunk md:hover:border-line-strong',
      )}
    >
      <div className="relative aspect-[4/3] bg-sunk">
        <div className={cn('size-full', tag ? 'opacity-70 grayscale' : '')}>
          <PlantPicture plant={plant} />
        </div>
        {tag ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-surface/90 px-2.5 py-1 text-[0.6875rem] leading-4 font-semibold text-ink-muted">
            {tag}
          </span>
        ) : null}
      </div>

      <div className="px-3 pt-2 pb-3">
        <div className="truncate font-display text-[1.0625rem] leading-[1.3125rem] font-medium">
          {plant.name}
        </div>
        {secondary ? (
          <div className="mt-0.5 truncate text-[0.8125rem] leading-4 text-ink-faint">
            {secondary}
          </div>
        ) : null}
      </div>
    </a>
  )
}

/** The same picture at the head of a table row. */
export function PlantThumb({ plant }: { plant: Plant }) {
  return (
    <span className="block size-10 shrink-0 overflow-hidden rounded-md bg-sunk">
      <PlantPicture plant={plant} />
    </span>
  )
}
