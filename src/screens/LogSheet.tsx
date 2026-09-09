/**
 * Logging anything that is not a plain watering, and correcting anything
 * already logged.
 *
 * One sheet that swaps its contents rather than stacking a second one on top:
 * the six actions, a date picker, a note, a repot. That is the same move the
 * old actions sheet made, kept because the alternative is two dimmed layers and
 * no way back from either.
 *
 * There is no free-text box beside the six buttons. There used to be, and it
 * wrote exactly the same record as the Note button next to it.
 */

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { preparePhoto, storePhoto, type PreparedPhoto } from '~/data/photos'
import { vocabOf } from '~/data/selectors'
import { ensureVocabItem, logEvent, updateEvent, useStore, type EventDraft } from '~/data/store'
import type { EventPhoto, NoteEvent, Plant, PlantEvent, RepotEvent } from '~/data/types'
import { nowISO } from '~/lib/date'
import { newId } from '~/lib/id'
import { Button } from '~/ui/Button'
import { Icon, type IconName } from '~/ui/Icon'
import { DateChip, DatePicker } from '~/ui/DatePicker'
import { NumberField, SuggestField, TextAreaField, TextField } from '~/ui/fields'
import { Sheet } from '~/ui/Sheet'
import { GroupLabel, type ChipTone } from '~/ui/Card'
import { cn } from '~/lib/cn'

type Action = { icon: IconName; tone: ChipTone; label: string; mode: Mode }

/**
 * The seven things that can be logged, in three groups.
 *
 * Ungrouped, seven identical circles are a wall to read every time — and four
 * of them being the same green said only "not a watering", which is not a
 * thing anybody is looking for. The groups answer the question you actually
 * arrive with: was this something you did to the plant, something the plant
 * did, or something you want to remember.
 *
 * Tone follows the history's own mapping, so an entry looks the same here as
 * it will in the record: blue is a watering, green is the plant, ink is
 * bookkeeping. That is why fertiliser is blue and not green — a fertilised
 * watering is not a different kind of entry, it is a watering with fertiliser
 * in it, stored as one and already drawn blue in the history.
 */
const GROUPS: { label: string; actions: Action[] }[] = [
  {
    label: 'Watering',
    actions: [
      { icon: 'droplet', tone: 'water', label: 'Water', mode: 'water' },
      { icon: 'fertilizer', tone: 'water', label: 'Fertiliser', mode: 'fertilise' },
    ],
  },
  {
    label: 'The plant',
    actions: [
      { icon: 'leaf', tone: 'leaf', label: 'New leaf', mode: 'leaf' },
      { icon: 'bloom', tone: 'leaf', label: 'Blooming', mode: 'bloom' },
      { icon: 'pot', tone: 'leaf', label: 'Repot', mode: 'repot' },
    ],
  },
  {
    label: 'Written down',
    actions: [
      { icon: 'note', tone: 'ink', label: 'Note', mode: 'note' },
      { icon: 'image', tone: 'ink', label: 'Photo', mode: 'photo' },
    ],
  },
]

const FILL: Record<ChipTone, string> = {
  water: 'bg-water text-on-accent',
  leaf: 'bg-leaf text-on-accent',
  ink: 'bg-ink text-paper',
}

type Mode = 'actions' | 'date' | 'water' | 'fertilise' | 'leaf' | 'bloom' | 'note' | 'repot' | 'photo'

/** What the sheet was opened to do: pick an action, or fix an existing entry. */
export type LogIntent = { kind: 'new' } | { kind: 'edit'; event: PlantEvent }

/**
 * A photograph picked before the entry it belongs to exists.
 *
 * It is attached to the sheet rather than to an action, the same way the date
 * is: you took a picture of something, and *what* it was is the button you
 * press next. That is what makes "a photo of the new leaf" one entry instead of
 * a leaf and a photograph filed separately.
 *
 * `claim` draws the id, writes the bytes under it, and hands back the fields
 * the new entry should carry. Bytes first, deliberately: if storing them fails
 * there is simply no entry, where the other order leaves one claiming a picture
 * that will never load. Bytes nobody points at are invisible; a broken promise
 * on a row someone can see is not.
 */
type Pending = { claim: () => Promise<{ id: string; photo: EventPhoto }> }

export function LogSheet({
  plant,
  intent,
  onClose,
}: {
  plant: Plant
  intent: LogIntent | null
  onClose: () => void
}) {
  const [mode, setMode] = useState<Mode>('actions')
  const [date, setDate] = useState(nowISO)
  /** Where `date` should return to — picking a date is a detour, not a step. */
  const [returnTo, setReturnTo] = useState<Mode>('actions')
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null)
  const [photoError, setPhotoError] = useState('')
  const picker = useRef<HTMLInputElement>(null)

  // Opening on an existing entry lands straight in its form, carrying its date.
  useEffect(() => {
    if (!intent) return
    setPhoto(null)
    setPhotoError('')
    if (intent.kind === 'edit') {
      setDate(intent.event.date)
      setMode(intent.event.type === 'repot' ? 'repot' : 'note')
    } else {
      setDate(nowISO())
      setMode('actions')
    }
  }, [intent])

  // The preview outlives neither the pick that replaced it nor the sheet.
  useEffect(() => {
    if (!photo) return
    return () => URL.revokeObjectURL(photo.previewUrl)
  }, [photo])

  if (!intent) return null

  const editing = intent.kind === 'edit' ? intent.event : null

  // Never set while editing: the picker is only reachable from the actions
  // view, and opening the sheet on an existing entry lands past it.
  const pending: Pending | null = photo
    ? {
        claim: async () => {
          const id = newId()
          await storePhoto(id, photo)
          return { id, photo: { width: photo.width, height: photo.height } }
        },
      }
    : null

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // An input holds on to its last file, so picking the same one twice would
    // fire no second change event.
    event.target.value = ''
    if (!file) return

    setPhotoError('')
    try {
      setPhoto(await preparePhoto(file))
    } catch {
      setPhotoError('That photo could not be read.')
    }
  }

  const log = async (draft: EventDraft) => {
    let attached: { id: string; photo: EventPhoto } | undefined
    if (pending) {
      try {
        attached = await pending.claim()
      } catch {
        setPhotoError('That photo could not be saved.')
        return
      }
    }

    await logEvent({ ...draft, date, ...attached })
    onClose()
  }

  const openDate = (from: Mode) => {
    setReturnTo(from)
    setMode('date')
  }

  const titles: Record<Mode, string> = {
    actions: 'Log activity',
    date: 'When?',
    water: 'Log activity',
    fertilise: 'Log activity',
    leaf: 'Log activity',
    bloom: 'Log activity',
    note: editing ? 'Edit note' : 'Note',
    repot: editing ? 'Edit repot' : 'Repot',
    photo: 'Log activity',
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={titles[mode]}
      onBack={mode === 'actions' ? undefined : () => setMode(mode === 'date' ? returnTo : 'actions')}
    >
      <input
        ref={picker}
        type="file"
        accept="image/*"
        onChange={choosePhoto}
        tabIndex={-1}
        aria-hidden
        className="hidden"
      />

      {mode === 'actions' ? (
        <>
          <div className="mt-3 flex items-center justify-center gap-2">
            <DateChip value={date} onClick={() => openDate('actions')} />
            <PhotoChip
              photo={photo}
              onPick={() => picker.current?.click()}
              onClear={() => setPhoto(null)}
            />
          </div>
          {photoError ? (
            <p role="status" className="mt-2 text-center text-[0.8125rem] text-ember">
              {photoError}
            </p>
          ) : null}
          {GROUPS.map((group) => (
            <div key={group.label} className="mt-5 mb-1 border-t border-line pt-4 first:border-t-0">
              <GroupLabel>{group.label}</GroupLabel>
              {/* Three columns whatever the group holds, so the circles line up
                  down the sheet instead of re-centring on every row. */}
              <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-5">
                {group.actions.map((action) => (
                  <button
                    key={action.mode}
                    type="button"
                    onClick={() => {
                      if (action.mode === 'water') void log({ type: 'water', plantCode: plant.code, fertilized: false })
                      else if (action.mode === 'fertilise') void log({ type: 'water', plantCode: plant.code, fertilized: true })
                      else if (action.mode === 'leaf') void log({ type: 'leaf', plantCode: plant.code })
                      else if (action.mode === 'bloom') void log({ type: 'bloom', plantCode: plant.code })
                      // A picture of nothing in particular. With one already
                      // attached this logs it; without, it asks for one first.
                      else if (action.mode === 'photo') {
                        if (photo) void log({ type: 'photo', plantCode: plant.code })
                        else picker.current?.click()
                      } else setMode(action.mode)
                    }}
                    className="warm group mx-auto flex w-fit flex-col items-center gap-2.5 active:opacity-70 hover:text-ink"
                  >
                    <span
                      className={cn(
                        'inline-flex size-15 items-center justify-center rounded-full shadow-md',
                        // `translate`, not `transform`: Tailwind v4 puts these
                        // on the standalone property, which a transition list
                        // naming only `transform` would never animate.
                        'transition-[translate,box-shadow] duration-200 ease-grow',
                        'group-hover:-translate-y-0.5 group-hover:shadow-lg',
                        'group-active:translate-y-0',
                        'motion-reduce:transition-none motion-reduce:group-hover:translate-y-0',
                        FILL[action.tone],
                      )}
                    >
                      <Icon name={action.icon} size={26} />
                    </span>
                    <span className="text-[0.8125rem] font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      ) : mode === 'date' ? (
        <DatePicker value={date} onChange={setDate} onDone={() => setMode(returnTo)} />
      ) : mode === 'repot' ? (
        <RepotForm
          plant={plant}
          date={date}
          editing={editing?.type === 'repot' ? editing : null}
          pending={pending}
          onPickDate={() => openDate('repot')}
          onDone={onClose}
        />
      ) : (
        <NoteForm
          plant={plant}
          date={date}
          editing={editing?.type === 'note' ? editing : null}
          pending={pending}
          onPickDate={() => openDate('note')}
          onDone={onClose}
        />
      )}
    </Sheet>
  )
}

/** The date's opposite number: what this entry is *of*, next to when it was.
 *  Once a photograph is attached it shows it, because a thumbnail is the only
 *  honest confirmation that the right picture was picked. */
function PhotoChip({
  photo,
  onPick,
  onClear,
}: {
  photo: PreparedPhoto | null
  onPick: () => void
  onClear: () => void
}) {
  if (!photo) {
    return (
      <button
        type="button"
        onClick={onPick}
        className="lift inline-flex h-9 items-center gap-2 rounded-full border border-line bg-sunk px-4 text-[0.875rem] font-medium text-ink active:opacity-70 hover:border-line-strong"
      >
        <Icon name="image" size={16} className="text-ink-muted" />
        Add a photo
      </button>
    )
  }

  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-sunk py-0 pr-2 pl-1">
      <button
        type="button"
        onClick={onPick}
        className="group flex items-center gap-2 active:opacity-70"
      >
        <img
          src={photo.previewUrl}
          alt=""
          className="size-7 rounded-full object-cover transition-transform duration-500 ease-grow group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <span className="text-[0.875rem] font-medium text-ink">Photo</span>
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="Remove this photo"
        className="warm flex size-6 items-center justify-center rounded-full text-ink-muted active:opacity-70 hover:text-ember"
      >
        <Icon name="close" size={15} />
      </button>
    </span>
  )
}

// --- note -------------------------------------------------------------------

function NoteForm({
  plant,
  date,
  editing,
  pending,
  onPickDate,
  onDone,
}: {
  plant: Plant
  date: string
  editing: NoteEvent | null
  pending: Pending | null
  onPickDate: () => void
  onDone: () => void
}) {
  const [text, setText] = useState(editing?.text ?? '')

  const save = async () => {
    const trimmed = text.trim()
    if (!trimmed) return

    if (editing) {
      await updateEvent(editing.id, { text: trimmed, date })
    } else {
      await logEvent({
        type: 'note',
        plantCode: plant.code,
        text: trimmed,
        date,
        ...(await pending?.claim()),
      })
    }
    onDone()
  }

  return (
    <div className="pt-1">
      <DateChip value={date} onClick={onPickDate} />
      <TextAreaField
        aria-label="Note"
        value={text}
        autoFocus={!editing}
        onChange={(event) => setText(event.target.value)}
        placeholder="What happened?"
        fieldClassName="mt-5"
      />
      <Button
        variant="solid"
        block
        disabled={!text.trim()}
        onClick={() => void save()}
        className="mt-4"
      >
        {editing ? 'Save changes' : 'Save note'}
      </Button>
    </div>
  )
}

// --- repot ------------------------------------------------------------------

function RepotForm({
  plant,
  date,
  editing,
  pending,
  onPickDate,
  onDone,
}: {
  plant: Plant
  date: string
  editing: RepotEvent | null
  pending: Pending | null
  onPickDate: () => void
  onDone: () => void
}) {
  const state = useStore()
  const mediums = vocabOf(state, 'medium')
  const currentMedium = mediums.find((item) => item.id === (editing?.mediumId ?? plant.mediumId))

  const [toSize, setToSize] = useState(
    String(editing?.toSize ?? (plant.potSize ? plant.potSize + 3 : '')),
  )
  const [medium, setMedium] = useState(currentMedium?.name ?? '')
  const [reason, setReason] = useState(editing?.reason ?? '')

  const save = async () => {
    const mediumId = await ensureVocabItem('medium', medium)
    const fields = {
      toSize: toSize ? Number(toSize) : null,
      mediumId: mediumId ?? plant.mediumId,
      reason: reason.trim(),
      date,
    }
    if (editing) {
      await updateEvent(editing.id, fields)
    } else {
      await logEvent({
        type: 'repot',
        plantCode: plant.code,
        fromSize: plant.potSize,
        ...fields,
        ...(await pending?.claim()),
      })
    }
    onDone()
  }

  return (
    <div className="flex flex-col gap-4 pt-1">
      <DateChip value={date} onClick={onPickDate} />

      <p className="text-[0.875rem] text-ink-muted text-pretty">
        Repotting changes the plant itself, not just the log — the pot size and medium below become
        the plant&rsquo;s.
      </p>

      <div className="flex gap-3">
        <NumberField
          label="From"
          unit="cm"
          value={editing?.fromSize ?? plant.potSize ?? ''}
          readOnly
          fieldClassName="w-28"
        />
        <NumberField
          label="To"
          unit="cm"
          inputMode="numeric"
          value={toSize}
          onChange={(event) => setToSize(event.target.value)}
          fieldClassName="w-28"
        />
      </div>

      <SuggestField
        label="Medium"
        options={mediums.map((item) => item.name)}
        value={medium}
        onChange={(event) => setMedium(event.target.value)}
        placeholder="Pick one, or type a new medium"
      />

      <TextField
        label="Why"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Roots through the bottom"
      />

      <Button variant="solid" block onClick={() => void save()}>
        {editing ? 'Save changes' : 'Log repot'}
      </Button>
    </div>
  )
}
