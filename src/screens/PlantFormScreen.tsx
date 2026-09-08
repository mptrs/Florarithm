/**
 * One form for adding a plant, editing a plant, and promoting a wish.
 *
 * They are the same record, so they are the same form. What changes is which
 * parts are worth showing: a wish has no pot and no watering to describe, so
 * everything but species, name and the note folds away until it is real.
 *
 * It reads in the plant page's own language. That page stopped being a flat
 * stack where a nine-row fact table and ninety history rows weighed the same;
 * this was the same stack, twelve fields deep, with one heading in the middle
 * set in exactly the type of the field labels under it. So the fields are
 * grouped and each group is named and led by the glyph the plant page uses for
 * those same facts — `place` for where it stands, `receipt` for what it cost.
 * Set a fact here, read it back there, under the same mark.
 */

import { useEffect, useState } from 'react'
import { usePhoto } from '~/data/photos'
import { findPlant, ownedPlants, photoEventsFor, vocabName, vocabOf } from '~/data/selectors'
import { deletePlantForever, ensureVocabItem, savePlant, useStore } from '~/data/store'
import {
  ORIGIN_TYPES,
  PLANT_STATUSES,
  PROPAGATION_METHODS,
  SYSTEMS,
  type OriginType,
  type PlantStatus,
  type PropagationMethod,
  type PlantEvent,
  type System,
} from '~/data/types'
import { formatDate, isoToInputValue, inputValueToISO, todayInputValue } from '~/lib/date'
import { formatSpecies, label } from '~/lib/format'
import { suggestNameAI } from '~/lib/aiNameGenerator'
import { cn } from '~/lib/cn'
import { redirect, routes } from '~/lib/router'
import { BackButton, Button, IconButton } from '~/ui/Button'
import { Chip } from '~/ui/Chip'
import { useConfirm } from '~/ui/ConfirmDialog'
import { showToast } from '~/ui/toast'
import { DatePickerField } from '~/ui/DatePicker'
import {
  Field,
  NumberField,
  SegmentedField,
  SelectField,
  SuggestField,
  TextAreaField,
  TextField,
  ToggleField,
} from '~/ui/fields'
import { CodeBadge, Section } from '~/ui/primitives'

type Props = {
  /** Absent when adding. */
  code?: string
  /** Adding straight onto the wishlist. */
  startAsWish?: boolean
  /** Pre-filled parent, from "take a cutting" on a plant page. */
  parentCode?: string | null
  /** Arriving from "I have this now": the wish becomes a plant on save. */
  promote?: boolean
}

export function PlantFormScreen({ code, startAsWish, parentCode, promote }: Props) {
  const state = useStore()
  const existing = code ? findPlant(state, code) : undefined

  const locations = vocabOf(state, 'location')
  const mediums = vocabOf(state, 'medium')
  const candidates = ownedPlants(state).filter((plant) => plant.code !== code)

  const [wish, setWish] = useState(false)
  const [genus, setGenus] = useState('')
  const [species, setSpecies] = useState('')
  const [cultivar, setCultivar] = useState('')
  const [name, setName] = useState('')
  const [parent, setParent] = useState<string>('')
  const [method, setMethod] = useState<PropagationMethod>('cutting')
  const [place, setPlace] = useState('')
  const [system, setSystem] = useState<System>('hydro')
  const [potSize, setPotSize] = useState('')
  const [medium, setMedium] = useState('')
  const [originType, setOriginType] = useState<OriginType | null>(null)
  const [originFrom, setOriginFrom] = useState('')
  const [originPrice, setOriginPrice] = useState('')
  const [originDate, setOriginDate] = useState(todayInputValue())
  const [wishNote, setWishNote] = useState('')
  const [status, setStatus] = useState<PlantStatus>('active')
  /** Empty string is "whichever is newest" — see `Plant.photoEventId`. */
  const [photoEventId, setPhotoEventId] = useState('')
  const [saving, setSaving] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [loadProgress, setLoadProgress] = useState<string | null>(null)
  const { confirm, dialog: confirmDialog } = useConfirm()

  // Fill the form once the record is in memory. Keyed on the plant's identity
  // so switching plants refills, while typing never gets overwritten.
  useEffect(() => {
    if (existing) {
      setWish(promote ? false : existing.wish)
      setGenus(existing.genus)
      setSpecies(existing.species)
      setCultivar(existing.cultivar)
      setName(existing.name)
      setParent(existing.parent?.code ?? '')
      setMethod(existing.parent?.method ?? 'cutting')
      setPlace(vocabName(state, existing.locationId).replace('—', ''))
      setSystem(existing.system)
      setPotSize(existing.potSize === null ? '' : String(existing.potSize))
      setMedium(vocabName(state, existing.mediumId).replace('—', ''))
      setOriginType(existing.origin.type)
      setOriginFrom(existing.origin.from)
      setOriginPrice(existing.origin.price === null ? '' : String(existing.origin.price))
      setOriginDate(existing.origin.date ? isoToInputValue(existing.origin.date) : todayInputValue())
      setWishNote(existing.wishNote)
      setStatus(existing.status)
      setPhotoEventId(existing.photoEventId ?? '')
    } else {
      setWish(startAsWish ?? false)
      setParent(parentCode ?? '')
      if (parentCode) {
        const source = findPlant(state, parentCode)
        if (source) {
          setGenus(source.genus)
          setSpecies(source.species)
          setCultivar(source.cultivar)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.code, startAsWish, parentCode, promote])

  const parentPlant = parent ? findPlant(state, parent) : null

  const rollName = async () => {
    const taken = new Set(state.plants.filter((p) => p.code !== code).map((p) => p.name))
    setRolling(true)
    setLoadProgress(null)

    const suggestion = await suggestNameAI(
      { genus: genus.trim(), species: species.trim(), cultivar: cultivar.trim() },
      taken,
      parentPlant?.name ?? null,
      (report) => setLoadProgress(report.text),
    )

    setRolling(false)
    if (suggestion) {
      setName(suggestion)
      setLoadProgress(null)
    } else {
      setLoadProgress("Couldn't think of one — type your own.")
    }
  }

  const submit = async () => {
    setSaving(true)
    try {
      const [locationId, mediumId] = await Promise.all([
        ensureVocabItem('location', place),
        ensureVocabItem('medium', medium),
      ])

      const genusTrimmed = genus.trim()
      const speciesTrimmed = species.trim()
      const cultivarTrimmed = cultivar.trim()

      const plant = await savePlant({
        code: existing?.code,
        name:
          name.trim() ||
          formatSpecies({ genus: genusTrimmed, species: speciesTrimmed, cultivar: cultivarTrimmed }) ||
          'Unnamed',
        genus: genusTrimmed,
        species: speciesTrimmed,
        cultivar: cultivarTrimmed,
        locationId,
        system,
        potSize: potSize ? Number(potSize) : null,
        mediumId,
        origin: {
          type: originType,
          from: originFrom.trim(),
          date: inputValueToISO(originDate),
          price: originPrice ? Number(originPrice) : null,
        },
        parent: parentPlant ? { code: parentPlant.code, method } : null,
        status,
        photoEventId: photoEventId || null,
        wish,
        wishNote: wishNote.trim(),
      })

      showToast(
        existing && !promote
          ? 'Saved'
          : promote
            ? `${plant.name} added to the collection`
            : wish
              ? `${plant.name} added to the wishlist`
              : `${plant.name} added to the collection`,
      )

      if (existing && !promote) {
        // Editing an already-owned plant always arrived by pushing this form
        // on top of that exact plant's page, so the entry underneath already
        // *is* the page to land on — going there with `back()` costs nothing
        // and, crucially, doesn't leave two adjacent history entries with the
        // same hash. A `replace` to that same hash would: the hash string
        // wouldn't change, so `hashchange` never fires and the first press of
        // the real back button silently does nothing, only working on the
        // second press once it reaches a genuinely different entry.
        window.history.back()
      } else {
        // A new plant, a cutting, or a promoted wish lands on a page that
        // didn't exist before saving — there is nothing to go back to, so
        // this replaces the form instead of pushing on top of it.
        redirect(routes.plant(plant.code))
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!existing) return
    const confirmed = await confirm({
      title: `Delete ${existing.name}?`,
      message: `Its whole history goes with it — every watering, photo and note. This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!confirmed) return

    const name = existing.name
    await deletePlantForever(existing.code)
    showToast(`${name} deleted`)
    redirect(routes.collection())
  }

  const title = existing ? (promote ? 'Add to the collection' : `Edit ${existing.name}`) : wish ? 'New wish' : 'New plant'

  return (
    <div className="flex flex-col gap-7">
      {/* The way out before you have started. Cancel is still down by Save,
          where it belongs next to the decision it undoes. The code rides
          alongside the title on an existing plant: it is the one thing on this
          page that cannot be edited, because it is printed on the pot. */}
      <div className="flex items-center gap-2">
        <BackButton variant="bare" className="-ml-2.5" />
        <h1 className="min-w-0 flex-1 font-display text-[2rem] leading-9 font-medium tracking-[-0.015em]">
          {title}
        </h1>
        {existing ? <CodeBadge code={existing.code} /> : null}
      </div>

      <ToggleField
        label="This is still a wish"
        checked={wish}
        onChange={setWish}
        hint={
          wish
            ? 'A wish only records what it is and why you want it — no place or care yet. Turn this off once you actually have it.'
            : undefined
        }
        className="border-y border-line py-1"
      />

      <div className="flex flex-col gap-7 lg:flex-row lg:gap-12">
        <div className="flex flex-col gap-7 lg:w-[32rem] lg:shrink-0">
          <Section icon="tag" title="What it is">
            <div className="flex gap-3">
              <TextField
                label="Genus"
                value={genus}
                onChange={(event) => setGenus(event.target.value)}
                placeholder="Monstera"
                fieldClassName="flex-1"
                hint={
                  existing || wish
                    ? undefined
                    : 'The plant code is drawn from this, not from the name — a sticker cannot be rewritten.'
                }
              />
              <TextField
                label="Species"
                value={species}
                onChange={(event) => setSpecies(event.target.value)}
                placeholder="deliciosa"
                fieldClassName="flex-1"
              />
            </div>

            <TextField
              label="Cultivar"
              value={cultivar}
              onChange={(event) => setCultivar(event.target.value)}
              placeholder="Thai Constellation"
            />

            {wish ? null : (
              <Field
                label="Name"
                hint={
                  loadProgress ??
                  (parentPlant
                    ? `The dice continues the line from ${parentPlant.name}, so the family tree reads without a diagram.`
                    : 'The dice asks a small AI, running in your browser, for something that fits the genus. It is an offer, not a decision.')
                }
              >
                <div className="flex gap-2.5">
                  <TextField
                    aria-label="Name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    fieldClassName="flex-1"
                    placeholder="Gruyère"
                  />
                  <IconButton
                    icon="dice"
                    label="Suggest a name"
                    onClick={rollName}
                    disabled={rolling}
                    className={cn('text-leaf', rolling && 'animate-spin')}
                  />
                </div>
              </Field>
            )}

            {wish ? (
              <TextAreaField
                label="Note"
                value={wishNote}
                onChange={(event) => setWishNote(event.target.value)}
                placeholder="Seen at Wilstra, about €40"
              />
            ) : null}
          </Section>

          {wish ? null : (
            <>
              <Section icon="place" title="Where it lives">
                <SuggestField
                  label="Place"
                  options={locations.map((item) => item.name)}
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  placeholder="Pick one, or type a new place"
                />

                <SegmentedField
                  label="System"
                  options={SYSTEMS.map((value) => ({ value, label: label(value) }))}
                  value={system}
                  onChange={setSystem}
                />

                <div className="flex gap-3">
                  <NumberField
                    label="Pot size"
                    unit="cm"
                    inputMode="numeric"
                    value={potSize}
                    onChange={(event) => setPotSize(event.target.value)}
                    fieldClassName="w-32"
                  />
                  <SuggestField
                    label="Medium"
                    options={mediums.map((item) => item.name)}
                    value={medium}
                    onChange={(event) => setMedium(event.target.value)}
                    placeholder="Pick one, or type a new medium"
                    fieldClassName="flex-1"
                  />
                </div>
              </Section>

              {/* The same scissors the plant page draws a parent and a cutting
                  with, over the field that makes one — and nothing at all until
                  there is a second plant for it to have come off. */}
              {candidates.length === 0 && !parentPlant ? null : (
                <Section icon="scissors" title="Family">
                  <SelectField
                    label="Cutting or corm of"
                    value={parent}
                    onChange={(event) => setParent(event.target.value)}
                  >
                    <option value="">Not propagated from one of yours</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.code} value={candidate.code}>
                        {candidate.name} · {candidate.code}
                      </option>
                    ))}
                  </SelectField>

                  {parentPlant ? (
                    <Field label="How">
                      <div className="flex flex-wrap gap-2">
                        {PROPAGATION_METHODS.map((candidate) => (
                          <Chip
                            key={candidate}
                            kind="choice"
                            selected={method === candidate}
                            onClick={() => setMethod(candidate)}
                          >
                            {label(candidate)}
                          </Chip>
                        ))}
                      </div>
                    </Field>
                  ) : null}
                </Section>
              )}
            </>
          )}
        </div>

        {wish ? null : (
          <div className="flex min-w-0 flex-1 flex-col gap-7">
            <Section icon="receipt" title="Where it came from">
              <div className="flex flex-wrap gap-2">
                {ORIGIN_TYPES.map((candidate) => (
                  <Chip
                    key={candidate}
                    kind="choice"
                    selected={originType === candidate}
                    onClick={() => setOriginType(originType === candidate ? null : candidate)}
                  >
                    {label(candidate)}
                  </Chip>
                ))}
              </div>

              <div className="flex gap-3">
                <TextField
                  label="From whom"
                  value={originFrom}
                  onChange={(event) => setOriginFrom(event.target.value)}
                  placeholder="Plantje.nl"
                  fieldClassName="flex-1"
                />
                <NumberField
                  label="Price"
                  unit="€"
                  inputMode="decimal"
                  step="0.01"
                  value={originPrice}
                  onChange={(event) => setOriginPrice(event.target.value)}
                  fieldClassName="w-36"
                />
              </div>

              {/* The app's own calendar, the one the log sheet opens. */}
              <DatePickerField
                label="In the collection since"
                value={originDate}
                onChange={setOriginDate}
                fieldClassName="w-56"
              />
            </Section>

            {existing ? (
              <Section icon="clock" title="Status">
                <SelectField
                  aria-label="Status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as PlantStatus)}
                  fieldClassName="w-56"
                >
                  {PLANT_STATUSES.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {label(candidate)}
                    </option>
                  ))}
                </SelectField>
              </Section>
            ) : null}

            {existing ? (
              <PhotoChoice
                photos={photoEventsFor(state, existing.code)}
                chosen={photoEventId}
                onChoose={setPhotoEventId}
              />
            ) : null}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button
          variant="accent"
          icon={existing ? 'check' : 'plus'}
          disabled={saving}
          onClick={submit}
          className="flex-1 sm:flex-none"
        >
          {existing ? 'Save' : wish ? 'Add to wishlist' : 'Add to the collection'}
        </Button>
        <Button variant="outline" icon="close" onClick={() => window.history.back()}>
          Cancel
        </Button>
      </div>

      {existing ? (
        <div className="mt-4 border-t border-line pt-5">
          <Button variant="danger" icon="trash" onClick={remove}>
            Delete this plant
          </Button>
        </div>
      ) : null}

      {confirmDialog}
    </div>
  )
}


/**
 * Which photograph stands for the plant.
 *
 * Nothing to choose until there are at least two — with one picture the newest
 * is the only one, and a control offering a decision that has already been made
 * is just noise. "Newest" stays first and selected by default, so the plant
 * keeps looking after itself unless you say otherwise.
 */
function PhotoChoice({
  photos,
  chosen,
  onChoose,
}: {
  photos: readonly PlantEvent[]
  chosen: string
  onChoose: (eventId: string) => void
}) {
  if (photos.length < 2) return null

  return (
    <Section icon="image" title="Photo">
      <p className="-mt-2 text-[0.8125rem] leading-5 text-ink-muted text-pretty">
        Which one stands for the plant. Every photograph stays in the history either way.
      </p>

      <div
        role="radiogroup"
        aria-label="The plant's photo"
        className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Choice selected={chosen === ''} label="Newest" onClick={() => onChoose('')}>
          <span className="flex size-full items-center justify-center text-[0.8125rem] font-medium text-ink-muted">
            Newest
          </span>
        </Choice>

        {photos.map((event) => (
          <Choice
            key={event.id}
            selected={chosen === event.id}
            label={`Photographed ${formatDate(event.date)}`}
            onClick={() => onChoose(event.id)}
          >
            <Thumbnail event={event} />
          </Choice>
        ))}
      </div>
    </Section>
  )
}

function Choice({
  selected,
  label: name,
  onClick,
  children,
}: {
  selected: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={name}
      onClick={onClick}
      className={cn(
        'size-20 shrink-0 overflow-hidden rounded-lg border-2 bg-sunk transition-colors active:opacity-70',
        selected ? 'border-leaf' : 'border-transparent md:hover:border-line-strong',
      )}
    >
      {children}
    </button>
  )
}

/** Null while the bytes are still coming off disk, or when this device has not
 *  pulled them down yet — the empty tile is still selectable, because the
 *  choice is about which entry, not about what has finished loading. */
function Thumbnail({ event }: { event: PlantEvent }) {
  const url = usePhoto(event.id)
  if (!url) return null
  return <img src={url} alt="" className="size-full object-cover" />
}
