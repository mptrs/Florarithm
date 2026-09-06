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

import { useEffect, useState } from 'react'
import { vocabOf } from '~/data/selectors'
import { ensureVocabItem, logEvent, updateEvent, useStore, type EventDraft } from '~/data/store'
import type { NoteEvent, Plant, PlantEvent, RepotEvent } from '~/data/types'
import { nowISO } from '~/lib/date'
import { Icon, type IconName } from '~/ui/Icon'
import { DateChip, DatePicker } from '~/ui/DatePicker'
import { NumberField, SuggestField, TextField } from '~/ui/fields'
import { Sheet } from '~/ui/Sheet'
import type { ChipTone } from '~/ui/Card'
import { cn } from '~/lib/cn'

/** The six things that can be logged, in the order they are reached for.
 *  Tone is the same mapping used everywhere else: blue is the watering, green
 *  is the plant, ink is bookkeeping. */
const ACTIONS: { icon: IconName; tone: ChipTone; label: string; mode: Mode }[] = [
  { icon: 'droplet', tone: 'water', label: 'Water', mode: 'water' },
  { icon: 'fertilizer', tone: 'leaf', label: 'Fertiliser', mode: 'fertilise' },
  { icon: 'pot', tone: 'leaf', label: 'Repot', mode: 'repot' },
  { icon: 'leaf', tone: 'leaf', label: 'New leaf', mode: 'leaf' },
  { icon: 'bloom', tone: 'leaf', label: 'Blooming', mode: 'bloom' },
  { icon: 'note', tone: 'ink', label: 'Note', mode: 'note' },
]

const FILL: Record<ChipTone, string> = {
  water: 'bg-water text-on-accent',
  leaf: 'bg-leaf text-on-accent',
  ink: 'bg-ink text-paper',
}

type Mode = 'actions' | 'date' | 'water' | 'fertilise' | 'leaf' | 'bloom' | 'note' | 'repot'

/** What the sheet was opened to do: pick an action, or fix an existing entry. */
export type LogIntent = { kind: 'new' } | { kind: 'edit'; event: PlantEvent }

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

  // Opening on an existing entry lands straight in its form, carrying its date.
  useEffect(() => {
    if (!intent) return
    if (intent.kind === 'edit') {
      setDate(intent.event.date)
      setMode(intent.event.type === 'repot' ? 'repot' : 'note')
    } else {
      setDate(nowISO())
      setMode('actions')
    }
  }, [intent])

  if (!intent) return null

  const editing = intent.kind === 'edit' ? intent.event : null

  const log = async (draft: EventDraft) => {
    await logEvent({ ...draft, date })
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
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={titles[mode]}
      onBack={mode === 'actions' ? undefined : () => setMode(mode === 'date' ? returnTo : 'actions')}
    >
      {mode === 'actions' ? (
        <>
          <div className="mt-3">
            <DateChip value={date} onClick={() => openDate('actions')} />
          </div>
          <div className="mt-6 mb-2 grid grid-cols-3 gap-x-3 gap-y-6">
            {ACTIONS.map((action) => (
              <button
                key={action.mode}
                type="button"
                onClick={() => {
                  if (action.mode === 'water') void log({ type: 'water', plantCode: plant.code, fertilized: false })
                  else if (action.mode === 'fertilise') void log({ type: 'water', plantCode: plant.code, fertilized: true })
                  else if (action.mode === 'leaf') void log({ type: 'leaf', plantCode: plant.code })
                  else if (action.mode === 'bloom') void log({ type: 'bloom', plantCode: plant.code })
                  else setMode(action.mode)
                }}
                className="flex flex-col items-center gap-2.5 active:opacity-70"
              >
                <span
                  className={cn(
                    'inline-flex size-16 items-center justify-center rounded-full shadow-md',
                    FILL[action.tone],
                  )}
                >
                  <Icon name={action.icon} size={27} />
                </span>
                <span className="text-[0.8125rem] font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : mode === 'date' ? (
        <DatePicker value={date} onChange={setDate} onDone={() => setMode(returnTo)} />
      ) : mode === 'repot' ? (
        <RepotForm
          plant={plant}
          date={date}
          editing={editing?.type === 'repot' ? editing : null}
          onPickDate={() => openDate('repot')}
          onDone={onClose}
        />
      ) : (
        <NoteForm
          plant={plant}
          date={date}
          editing={editing?.type === 'note' ? editing : null}
          onPickDate={() => openDate('note')}
          onDone={onClose}
        />
      )}
    </Sheet>
  )
}

// --- note -------------------------------------------------------------------

function NoteForm({
  plant,
  date,
  editing,
  onPickDate,
  onDone,
}: {
  plant: Plant
  date: string
  editing: NoteEvent | null
  onPickDate: () => void
  onDone: () => void
}) {
  const [text, setText] = useState(editing?.text ?? '')

  const save = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (editing) await updateEvent(editing.id, { text: trimmed, date })
    else await logEvent({ type: 'note', plantCode: plant.code, text: trimmed, date })
    onDone()
  }

  return (
    <div className="pt-1">
      <DateChip value={date} onClick={onPickDate} />
      <textarea
        aria-label="Note"
        value={text}
        autoFocus={!editing}
        onChange={(event) => setText(event.target.value)}
        placeholder="What happened?"
        className="mt-5 h-32 w-full resize-none rounded-lg border border-line-strong bg-transparent px-4 py-3.5 text-body leading-6 text-ink outline-none placeholder:text-ink-faint focus:border-leaf"
      />
      <button
        type="button"
        disabled={!text.trim()}
        onClick={() => void save()}
        className="mt-4 flex h-control w-full items-center justify-center rounded-lg bg-ink text-body font-semibold text-paper disabled:opacity-40 active:opacity-70"
      >
        {editing ? 'Save changes' : 'Save note'}
      </button>
    </div>
  )
}

// --- repot ------------------------------------------------------------------

function RepotForm({
  plant,
  date,
  editing,
  onPickDate,
  onDone,
}: {
  plant: Plant
  date: string
  editing: RepotEvent | null
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
    if (editing) await updateEvent(editing.id, fields)
    else
      await logEvent({ type: 'repot', plantCode: plant.code, fromSize: plant.potSize, ...fields })
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

      <button
        type="button"
        onClick={() => void save()}
        className="flex h-control w-full items-center justify-center rounded-lg bg-ink text-body font-semibold text-paper active:opacity-70"
      >
        {editing ? 'Save changes' : 'Log repot'}
      </button>
    </div>
  )
}
