/**
 * The "More…" sheet: everything the WATER button is not.
 *
 * Water-with-a-choice sits at the top expanded, because it is the reason the
 * sheet exists. Repot and Note need a moment of input, so the sheet swaps to a
 * small form rather than stacking a second sheet on top of the first.
 */

import { useState } from 'react'
import { ensureVocabItem, logEvent, type EventDraft } from '~/data/store'
import { useStore } from '~/data/store'
import { vocabOf } from '~/data/selectors'
import type { Plant } from '~/data/types'
import { todayInputValue, inputValueToISO } from '~/lib/date'
import { Button } from '~/ui/Button'
import { Chip } from '~/ui/Chip'
import { CheckField, DateField, NumberField, SuggestField, TextField } from '~/ui/fields'
import { Icon } from '~/ui/Icon'
import { CodeBadge } from '~/ui/primitives'
import { Sheet, SheetAction } from '~/ui/Sheet'
import { offerUndo } from '~/ui/undo'

type Mode = 'actions' | 'repot' | 'note'

export function PlantActionsSheet({
  plant,
  open,
  onClose,
}: {
  plant: Plant
  open: boolean
  onClose: () => void
}) {
  const [mode, setMode] = useState<Mode>('actions')

  const close = () => {
    setMode('actions')
    onClose()
  }

  const log = async (draft: EventDraft) => {
    offerUndo(await logEvent(draft))
    close()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={plant.name}
      meta={<CodeBadge code={plant.code} tone="quiet" />}
    >
      {mode === 'actions' ? (
        <ActionList plant={plant} onLog={log} onMode={setMode} />
      ) : mode === 'repot' ? (
        <RepotForm plant={plant} onLog={log} onBack={() => setMode('actions')} />
      ) : (
        <NoteForm plant={plant} onLog={log} onBack={() => setMode('actions')} />
      )}
    </Sheet>
  )
}

// --- the list ---------------------------------------------------------------

function ActionList({
  plant,
  onLog,
  onMode,
}: {
  plant: Plant
  onLog: (draft: EventDraft) => Promise<void>
  onMode: (mode: Mode) => void
}) {
  const state = useStore()
  const fertilizers = vocabOf(state, 'fertilizer')

  const [fertilizerId, setFertilizerId] = useState<string | null>(fertilizers[0]?.id ?? null)
  const [newFertilizer, setNewFertilizer] = useState('')
  const [adding, setAdding] = useState(fertilizers.length === 0)
  const [flushed, setFlushed] = useState(false)

  const logWater = async () => {
    // A name typed into the "add" field is a new entry in the growing list, so
    // it is there to pick the next time.
    const id = adding && newFertilizer.trim() ? await ensureVocabItem('fertilizer', newFertilizer) : fertilizerId

    await onLog({ type: 'water', plantCode: plant.code, fertilizerId: id, flushed })
  }

  return (
    <div className="flex flex-col">
      <span className="mb-2.5 text-label uppercase text-ink-muted">Water with</span>

      <div className="mb-3.5 flex flex-wrap gap-2">
        {fertilizers.map((item) => (
          <Chip
            key={item.id}
            kind="choice"
            selected={!adding && fertilizerId === item.id}
            onClick={() => {
              setAdding(false)
              setFertilizerId(item.id)
            }}
          >
            {item.name}
          </Chip>
        ))}
        <Chip
          kind="choice"
          selected={!adding && fertilizerId === null}
          onClick={() => {
            setAdding(false)
            setFertilizerId(null)
          }}
        >
          Nothing
        </Chip>
        <Chip kind="choice" selected={adding} onClick={() => setAdding(true)}>
          + Add
        </Chip>
      </div>

      {adding ? (
        <TextField
          aria-label="New fertilizer"
          placeholder="Name of the fertilizer"
          value={newFertilizer}
          onChange={(event) => setNewFertilizer(event.target.value)}
          fieldClassName="mb-3.5"
        />
      ) : null}

      <CheckField label="Flushed the pot first" checked={flushed} onChange={setFlushed} />

      <Button variant="primary" size="md" className="mt-3.5 mb-5" onClick={logWater}>
        LOG WATER
      </Button>

      <div className="border-t border-line">
        <SheetAction
          icon={<Icon name="leaf" size={21} />}
          label="New leaf"
          onClick={() => void onLog({ type: 'leaf', plantCode: plant.code })}
        />
        <SheetAction
          icon={<Icon name="bloom" size={21} />}
          label="Blooming"
          onClick={() => void onLog({ type: 'bloom', plantCode: plant.code })}
        />
        <SheetAction icon={<Icon name="pot" size={21} />} label="Repot" onClick={() => onMode('repot')} />
        <SheetAction icon={<Icon name="note" size={21} />} label="Note" onClick={() => onMode('note')} />
      </div>
    </div>
  )
}

// --- repot ------------------------------------------------------------------

function RepotForm({
  plant,
  onLog,
  onBack,
}: {
  plant: Plant
  onLog: (draft: EventDraft) => Promise<void>
  onBack: () => void
}) {
  const state = useStore()
  const mediums = vocabOf(state, 'medium')
  const currentMedium = mediums.find((item) => item.id === plant.mediumId)

  const [toSize, setToSize] = useState(plant.potSize ? String(plant.potSize + 3) : '')
  const [medium, setMedium] = useState(currentMedium?.name ?? '')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(todayInputValue())

  const submit = async () => {
    const mediumId = await ensureVocabItem('medium', medium)

    await onLog({
      type: 'repot',
      plantCode: plant.code,
      fromSize: plant.potSize,
      toSize: toSize ? Number(toSize) : null,
      mediumId: mediumId ?? plant.mediumId,
      reason: reason.trim(),
      date: inputValueToISO(date) ?? undefined,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.875rem] text-ink-muted text-pretty">
        Repotting changes the plant itself, not just the log — the pot size and medium below become
        the plant&rsquo;s.
      </p>

      <div className="flex gap-3">
        <NumberField
          label="From"
          unit="cm"
          value={plant.potSize ?? ''}
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

      <DateField
        label="When"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        fieldClassName="w-48"
      />

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
        placeholder="Optional"
      />

      <div className="flex gap-3">
        <Button variant="accent" block onClick={submit}>
          Log repot
        </Button>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  )
}

// --- note -------------------------------------------------------------------

function NoteForm({
  plant,
  onLog,
  onBack,
}: {
  plant: Plant
  onLog: (draft: EventDraft) => Promise<void>
  onBack: () => void
}) {
  const [text, setText] = useState('')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note-text" className="text-label uppercase text-ink-muted">
          Note
        </label>
        <textarea
          id="note-text"
          rows={4}
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={`What is worth remembering about ${plant.name}?`}
          className="w-full rounded-sm border border-line-strong bg-surface px-3.5 py-3 text-body text-ink placeholder:text-ink-faint focus:border-leaf focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <Button
          variant="accent"
          block
          disabled={!text.trim()}
          onClick={() => void onLog({ type: 'note', plantCode: plant.code, text: text.trim() })}
        >
          Save note
        </Button>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  )
}
