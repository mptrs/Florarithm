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
  VARIEGATIONS,
  type OriginType,
  type PlantStatus,
  type PropagationMethod,
  type PlantEvent,
  type System,
} from '~/data/types'
import { formatDate, isoToInputValue, inputValueToISO, todayInputValue } from '~/lib/date'
import { formatSpecies, label, normalizeCross } from '~/lib/format'
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
  /** Not stored: a plant with a cross written on it is a hybrid, and one
   *  without is not. The switch only says whether the field is on screen. */
  const [hybrid, setHybrid] = useState(false)
  const [cross, setCross] = useState('')
  const [cultivar, setCultivar] = useState('')
  const [variegation, setVariegation] = useState('')
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
      setCross(existing.cross)
      setHybrid(existing.cross !== '')
      setCultivar(existing.cultivar)
      setVariegation(existing.variegation)
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
          setCross(source.cross)
          setHybrid(source.cross !== '')
          setCultivar(source.cultivar)
          setVariegation(source.variegation)
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
      const crossTrimmed = hybrid ? cross.trim() : ''
      const cultivarTrimmed = cultivar.trim()
      const variegationTrimmed = variegation.trim()

      const plant = await savePlant({
        code: existing?.code,
        name:
          name.trim() ||
          formatSpecies({
            genus: genusTrimmed,
            species: speciesTrimmed,
            cross: crossTrimmed,
            cultivar: cultivarTrimmed,
            variegation: variegationTrimmed,
          }) ||
          'Unnamed',
        genus: genusTrimmed,
        species: speciesTrimmed,
        cross: crossTrimmed,
        cultivar: cultivarTrimmed,
        variegation: variegationTrimmed,
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
      } else if (wish) {
        // A brand-new wish came from the Wishlist's own "Add a wish"
        // button in the overwhelming case, so that is where saving one
        // returns to — not a detail page it may never otherwise be
        // visited from. (A wish flagged from a parent plant's "cutting"
        // form still ends up here rather than back on that plant; it is
        // still listed under the parent's Family card either way.)
        redirect(routes.wishlist())
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
      <div className="flex items-start gap-2">
        <BackButton variant="bare" className="-ml-2.5" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[2rem] leading-9 font-medium tracking-[-0.015em] text-balance">
            {title}
          </h1>
          {existing ? <CodeBadge code={existing.code} tone="quiet" className="-ml-2.5 mt-1" /> : null}
        </div>
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
              />
              <TextField
                label="Species"
                value={species}
                onChange={(event) => setSpecies(event.target.value)}
                placeholder="deliciosa"
                fieldClassName="flex-1"
                disabled={hybrid}
              />
            </div>

            <div className="flex gap-3">
              <TextField
                label="Cultivar"
                value={cultivar}
                onChange={(event) => setCultivar(event.target.value)}
                placeholder="Ninja"
                fieldClassName="flex-1"
              />
              {/* A select, not a suggest box: the terms are a short fixed set,
                  and every other short fixed set in the app is a select. A
                  plant already carrying a term from outside the six — typed
                  back when this was a free field — is offered its own value
                  back, so editing anything else cannot silently drop it. */}
              <SelectField
                label="Variegation"
                value={variegation}
                onChange={(event) => setVariegation(event.target.value)}
                fieldClassName="flex-1"
              >
                <option value="">None</option>
                {(VARIEGATIONS.includes(variegation) || !variegation
                  ? VARIEGATIONS
                  : [...VARIEGATIONS, variegation]
                ).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectField>
            </div>

            {/* Under the cultivar and the variegation, because a hybrid is the
                rarer thing to be recording — and behind a switch, so the plant
                that is simply a species never has to look at a field that does
                not apply to it.

                A plant is a species or it is a cross, never both, so throwing
                the switch empties the other one rather than leaving a
                contradiction to be saved. Nothing is hidden while still set.

                No hint under any of these four: the labels are the words off
                the plant label itself, and a line of prose under each one only
                made the section harder to read than the thing it explained.
                The `×` is taught by the placeholder, where it costs nothing. */}
            <ToggleField
              label="This is a hybrid"
              checked={hybrid}
              onChange={(next) => {
                setHybrid(next)
                if (next) setSpecies('')
                else setCross('')
              }}
            />

            {hybrid ? (
              /* Full width because parentage is long and often nested, which is
                 also why it is one field and not a seed/pollen pair. */
              <TextField
                label="Cross"
                value={cross}
                onChange={(event) => setCross(normalizeCross(event.target.value))}
                placeholder="papillilaminum × crystallinum"
              />
            ) : null}

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

          {/* A wish has no Status section to hang this off — nothing about it
              has a status yet — so the one exit it does have sits here. */}
          {existing && wish ? (
            <div className="border-t border-line pt-5">
              <DeleteRow onDelete={remove} wish />
            </div>
          ) : null}
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

                <DeleteRow onDelete={remove} />
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

      {confirmDialog}
    </div>
  )
}


/**
 * The way out that is almost never the right one.
 *
 * It used to be a red-outlined button hung under the save bar, which made it
 * the last thing on the page — exactly where a thumb arrives looking for Save,
 * and where the eye reads "the final action here". It sits under Status now
 * because that is where a plant's ending already lives: died and given away
 * keep the record and its whole history, and this is the one case where there
 * should be no record at all. Quiet, and it still asks before it does anything.
 */
function DeleteRow({ onDelete, wish }: { onDelete: () => void; wish?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-[0.8125rem] leading-5 text-ink-muted text-pretty">
        {wish
          ? 'Deleting drops the wish and its note for good.'
          : 'A plant that died or moved on keeps its place here under its own status — the history is the point. Delete is for a record that should never have existed.'}
      </p>
      <Button variant="danger-quiet" icon="trash" onClick={onDelete} className="-ml-3.5">
        {wish ? 'Delete this wish' : 'Delete this plant for good'}
      </Button>
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
        className="flex gap-3 overflow-x-auto -mt-1 pt-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        'warm group size-20 shrink-0 overflow-hidden rounded-lg border-2 bg-sunk active:opacity-70',
        selected ? 'border-leaf' : 'border-transparent hover:border-line-strong',
      )}
    >
      {/* The same lean-in the collection tile makes, at thumbnail scale. */}
      <div className="size-full transition-transform duration-500 ease-grow group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
        {children}
      </div>
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
