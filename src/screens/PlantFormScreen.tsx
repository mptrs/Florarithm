/**
 * One form for adding a plant, editing a plant, and promoting a wish.
 *
 * They are the same record, so they are the same form. What changes is which
 * parts are worth showing: a wish has no pot and no watering to describe, so
 * everything but species, name and the note folds away until it is real.
 */

import { useEffect, useState } from 'react'
import { findPlant, ownedPlants, vocabName, vocabOf } from '~/data/selectors'
import { deletePlantForever, ensureVocabItem, savePlant, useStore } from '~/data/store'
import {
  ORIGIN_TYPES,
  PLANT_STATUSES,
  PROPAGATION_METHODS,
  SYSTEMS,
  type OriginType,
  type PlantStatus,
  type PropagationMethod,
  type System,
} from '~/data/types'
import { isoToInputValue, inputValueToISO, todayInputValue } from '~/lib/date'
import { formatSpecies, label } from '~/lib/format'
import { suggestNameAI } from '~/lib/aiNameGenerator'
import { cn } from '~/lib/cn'
import { routes } from '~/lib/router'
import { Button, IconButton } from '~/ui/Button'
import { Chip } from '~/ui/Chip'
import {
  DateField,
  Field,
  NumberField,
  SegmentedField,
  SelectField,
  SuggestField,
  TextField,
  ToggleField,
} from '~/ui/fields'
import { SectionHeading } from '~/ui/primitives'

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
  const [saving, setSaving] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [loadProgress, setLoadProgress] = useState<string | null>(null)

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
        wish,
        wishNote: wishNote.trim(),
      })

      window.location.assign(routes.plant(plant.code))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!existing) return
    const confirmed = window.confirm(
      `Delete ${existing.name} and its whole history? This cannot be undone.`,
    )
    if (!confirmed) return

    await deletePlantForever(existing.code)
    window.location.assign(routes.collection())
  }

  const title = existing ? (promote ? 'Add to the collection' : `Edit ${existing.name}`) : wish ? 'New wish' : 'New plant'

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[2rem] leading-9 font-medium tracking-[-0.015em]">{title}</h1>

      <ToggleField
        label="This is still a wish"
        checked={wish}
        onChange={setWish}
        hint={
          wish
            ? 'Only species, name and a note are kept. Turn this off when you actually have it.'
            : undefined
        }
        className="border-y border-line py-1"
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-12">
        <div className="flex flex-col gap-5 lg:w-[32rem] lg:shrink-0">
          <div className="flex gap-3">
            <TextField
              label="Genus"
              value={genus}
              onChange={(event) => setGenus(event.target.value)}
              placeholder="Monstera"
              fieldClassName="flex-1"
              hint={
                existing
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
          )}

          {parentPlant && !wish ? (
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

          {wish ? (
            <TextField
              label="Note"
              value={wishNote}
              onChange={(event) => setWishNote(event.target.value)}
              placeholder="Seen at Wilstra, about €40"
            />
          ) : (
            <>
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
            </>
          )}
        </div>

        {wish ? null : (
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <SectionHeading>Where it came from</SectionHeading>

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

            <DateField
              label="In the collection since"
              value={originDate}
              onChange={(event) => setOriginDate(event.target.value)}
              fieldClassName="w-56"
            />

            {existing ? (
              <SelectField
                label="Status"
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
            ) : null}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button variant="accent" disabled={saving} onClick={submit}>
          {existing ? 'Save' : wish ? 'Add to the wishlist' : 'Add to the collection'}
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        {existing ? null : (
          <span className="text-[0.8125rem] text-ink-muted">
            A code is drawn on save, and you land on the page with the link for the sticker.
          </span>
        )}
      </div>

      {existing ? (
        <div className="mt-4 border-t border-line pt-5">
          <Button variant="danger" onClick={remove}>
            Delete this plant
          </Button>
        </div>
      ) : null}
    </div>
  )
}
