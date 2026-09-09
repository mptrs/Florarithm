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
        'group flex flex-col overflow-hidden rounded-xl border border-line bg-surface',
        'transition-[border-color,box-shadow,scale] duration-200 ease-grow',
        // Pressed, the whole card gives a little. It used to take on `sunk`
        // instead, which tinted the name strip under the photograph along with
        // everything else — that strip is paper, and paper does not change
        // colour because a finger is on the picture above it.
        'active:scale-[0.99] hover:border-line-strong hover:shadow-sm',
      )}
    >
      {/* The frame clips its own picture. Without this the zoom below grows
          past the bottom of the photograph and over the name, which sits
          inside this same card and so is not covered by its `overflow-hidden`. */}
      <div className="relative aspect-[4/3] overflow-hidden bg-sunk">
        {/* The one place the app says out loud what it is for: lean towards a
            plant and the plant grows. Slower than every other hover here and
            deliberately so — three percent over half a second is the most a
            thing can move and still be read as growing rather than as
            reacting. The card itself holds still underneath it. */}
        <div
          className={cn(
            'size-full transition-transform duration-500 ease-grow',
            'group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100',
            tag ? 'opacity-70 grayscale' : '',
          )}
        >
          <PlantPicture plant={plant} />
        </div>
        {tag ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-floating px-2.5 py-1 text-[0.6875rem] leading-4 font-semibold text-ink-muted">
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
