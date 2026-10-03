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
import {
  ancestorsOf,
  childrenOf,
  descendantCodes,
  findPlant,
  originSources,
  ownedPlants,
  photoEventsFor,
  vocabName,
  vocabUsage,
} from '~/data/selectors'
import {
  deletePlantForever,
  ensureVocabItem,
  logEvent,
  savePlant,
  useStore,
  type State,
} from '~/data/store'
import {
  ORIGIN_TYPES,
  PLANT_STATUSES,
  PROPAGATION_METHODS,
  SYSTEMS,
  VARIEGATIONS,
  type OriginType,
  type PlantStatus,
  type PropagationMethod,
  type Plant,
  type PlantEvent,
  type System,
} from '~/data/types'
import {
  daysBetween,
  formatDate,
  isoToInputValue,
  inputValueToISO,
  nowISO,
  todayInputValue,
} from '~/lib/date'
import { formatSpecies, label, normalizeCross, parseDecimal, plural, priceInputValue } from '~/lib/format'
import { suggestNameAI } from '~/lib/aiNameGenerator'
import { respell, searchTaxa, speciesOf, useLookup, type Taxon } from '~/lib/taxa'
import { nextInLine } from '~/lib/nameGenerator'
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
  TextAreaField,
  TextField,
  ToggleField,
} from '~/ui/fields'
import { Icon } from '~/ui/Icon'
import { PlantThumb } from '~/ui/plantPicture'
import { plants as plantCount, SuggestField, usageGroups, type Usage } from '~/ui/suggest'
import { GroupLabel } from '~/ui/Card'
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

  const locations = vocabUsage(state, 'location')
  const mediums = vocabUsage(state, 'medium')
  const sources = originSources(state)
  // Not itself, and nothing already below it: a plant that descends from its
  // own cutting is a loop, and a loop is a family tree that never ends.
  const offspring = code ? descendantCodes(state, code) : null
  const candidates = ownedPlants(state).filter(
    (plant) => plant.code !== code && !offspring?.has(plant.code),
  )

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
  /** False for a plant whose arrival was never written down: the field shows
   *  the day its record was made, and saving leaves the record without one
   *  rather than stamping the day of the edit as the day it arrived. */
  const [originDateKnown, setOriginDateKnown] = useState(true)
  const [wishNote, setWishNote] = useState('')
  const [status, setStatus] = useState<PlantStatus>('active')
  /** Empty string is "whichever is newest" — see `Plant.photoEventId`. */
  const [photoEventId, setPhotoEventId] = useState('')
  const [saving, setSaving] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [loadProgress, setLoadProgress] = useState<string | null>(null)
  /** What the chosen parent filled in, so choosing another knows which
   *  fields are still the parent's and which are yours. */
  const [inherited, setInherited] = useState<Inherited>(NOTHING_INHERITED)
  /** The plant "What it is" was just copied from, and what the fields held
   *  before, so the copy can be taken back in one tap. */
  const [copied, setCopied] = useState<{ from: string; was: WhatItIs } | null>(null)
  const routeParent = parentCode ? findPlant(state, parentCode) : undefined
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
      setOriginPrice(priceInputValue(existing.origin.price))
      setOriginDate(
        existing.origin.date
          ? isoToInputValue(existing.origin.date)
          : promote
            ? todayInputValue()
            : isoToInputValue(existing.createdAt),
      )
      setOriginDateKnown(existing.origin.date !== null)
      setWishNote(existing.wishNote)
      setStatus(existing.status)
      setPhotoEventId(existing.photoEventId ?? '')
    } else {
      setWish(startAsWish ?? false)
      if (parentCode) adoptParent(parentCode)
    }
    // Keyed on the parent being *found*, not just named: arriving from a
    // plant page straight after a reload, the store can still be loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.code, startAsWish, routeParent?.code, promote])

  const parentPlant = parent ? findPlant(state, parent) : null
  const known = knownNames(state.plants, genus, species)
  const online = useOnlineNames(state.plants, genus, known)
  /**
   * The plant already answering to the name typed here, if any. A name is how
   * a plant is called out across the room and found in a list, so two of them
   * sharing one is a mix-up waiting to happen — caught while typing, not after.
   * Compared without case or edge spaces, since "gruyère " is still Gruyère.
   * Wishes are left out on both sides: they carry no name of their own yet.
   */
  const nameTaken = wish ? undefined : findNameClash(state.plants, name, code)

  /**
   * Pick the plant this one came off, and take over what it already knows.
   *
   * A cutting is the same plant as its parent, so what it is and its next
   * name in the line are already on record — typing them again, or rolling
   * the dice for a name the line has already decided, was asking for what
   * the app knew. Where it stands and how it is grown are not: a fresh
   * cutting roots somewhere else, in something else, than the plant it came
   * off, so those are left for you. Only fields still holding what the last parent put there move:
   * anything you typed yourself stays yours, whichever parent you pick after.
   * Only while adding — re-parenting a plant you have is fixing the tree, not
   * describing a new plant.
   */
  function adoptParent(nextCode: string) {
    setParent(nextCode)
    if (existing) return

    const source = nextCode ? findPlant(state, nextCode) : undefined
    const next = source ? inheritFrom(state, source, code) : NOTHING_INHERITED
    const was = inherited
    const take = <K extends keyof Inherited>(
      key: K,
      current: Inherited[K],
      set: (value: Inherited[K]) => void,
    ) => {
      if (current === was[key]) set(next[key])
    }

    take('genus', genus, setGenus)
    take('species', species, setSpecies)
    if (cross === was.cross) {
      setCross(next.cross)
      setHybrid(next.cross !== '')
    }
    take('cultivar', cultivar, setCultivar)
    take('variegation', variegation, setVariegation)
    take('name', name, setName)
    setInherited(next)
  }

  /**
   * Take over what another plant is — genus to variegation — and nothing
   * else. A second Thai Constellation is the same plant on paper, but it has
   * its own name, and where it stands and what it grows in are decided when
   * it arrives, not by the one you already have.
   */
  function copyWhatItIs(source: Plant) {
    setCopied({ from: source.name, was: { genus, species, cross, hybrid, cultivar, variegation } })
    setGenus(source.genus)
    setSpecies(source.species)
    setCross(source.cross)
    setHybrid(source.cross !== '')
    setCultivar(source.cultivar)
    setVariegation(source.variegation)
  }

  function undoCopy() {
    if (!copied) return
    const { was } = copied
    setGenus(was.genus)
    setSpecies(was.species)
    setCross(was.cross)
    setHybrid(was.hybrid)
    setCultivar(was.cultivar)
    setVariegation(was.variegation)
    setCopied(null)
  }

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
        potSize: parseDecimal(potSize),
        mediumId,
        origin: {
          type: originType,
          from: originFrom.trim(),
          // Promoting a wish is the day it arrives, so that one is always said.
          date: originDateKnown || promote ? inputValueToISO(originDate) : null,
          price: parseDecimal(originPrice),
        },
        parent: parentPlant ? { code: parentPlant.code, method } : null,
        status,
        photoEventId: photoEventId || null,
        wish,
        // Promoting empties it: the note moves into the log below rather than
        // staying in a field that nothing renders once the plant is yours.
        wishNote: promote ? '' : wishNote.trim(),
      })

      if (promote && existing) {
        // Dated the day it arrived, not the day the form was filled in — the
        // origin date is the one the plant page reads back as "in the
        // collection since", and the wait has to end where that begins.
        const arrived = inputValueToISO(originDate) ?? nowISO()
        const waited = Math.max(0, daysBetween(existing.createdAt, arrived))
        // One entry, dated the day it arrived: the wait in its own field, and
        // whatever you wrote about why you wanted it as the note itself.
        await logEvent({
          plantCode: plant.code,
          type: 'note',
          date: arrived,
          text: existing.wishNote.trim(),
          fromWishlist: waited,
        })
      }

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
    <div className="flex flex-col gap-8">
      {/* The way out before you have started. Cancel is still down by Save,
          where it belongs next to the decision it undoes. The code rides
          alongside the title on an existing plant: it is the one thing on this
          page that cannot be edited, because it is printed on the pot. */}
      <div className="flex items-start gap-2">
        <BackButton variant="bare" className="-ml-3" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[2rem] leading-9 font-medium tracking-[-0.015em] text-balance">
            {title}
          </h1>
          {existing ? <CodeBadge code={existing.code} tone="quiet" className="-ml-3 mt-1" /> : null}
        </div>
      </div>

      {/* Only while adding. Which side of the line a record is on is settled
          once, when it is written: a plant you own does not become a wish
          again, and a wish becomes a plant through "I have this now" — on the
          wishlist row and on the wish's own page — which is a decision with a
          date on it rather than a switch you can graze past on your way to
          fixing a typo. Leaving it here also let a plant keep a parent it had
          no business keeping: the Family section hides itself for a wish, so
          the switch could carry a line off into a record that cannot show
          it. */}
      {existing ? null : (
        <ToggleField
          label="This is still a wish"
          checked={wish}
          onChange={setWish}
          hint={
            wish
              ? 'A wish only records what it is and why you want it — no place or care yet.'
              : undefined
          }
          className="border-y border-line"
        />
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex flex-col gap-8 lg:w-[32rem] lg:shrink-0">
          <Section icon="tag" title="What it is">
            {copied ? (
              <div className="flex items-center gap-3 rounded-lg bg-leaf-tint py-1 pr-1 pl-4">
                <Icon name="copy" size={18} className="shrink-0 text-leaf" />
                <p className="flex-1 py-2 text-[0.875rem] leading-5 text-pretty">
                  What it is, from{' '}
                  <span className="font-display text-[1rem] font-medium">{copied.from}</span>.
                  Change anything that differs.
                </p>
                <Button variant="quiet" size="sm" onClick={undoCopy} className="shrink-0">
                  Undo
                </Button>
              </div>
            ) : null}

            <div className="flex gap-3">
              {/* Offered back off the collection, wishes included: a second
                  Monstera should not mean typing "deliciosa" a second time,
                  or spelling it a second way. Each narrows to the one before
                  it, so the species on offer are that genus's own. */}
              <SuggestField
                label="Genus"
                value={genus}
                onChange={setGenus}
                groups={[
                  {
                    label: 'Genus · fills in the genus',
                    items: known.genera.map((usage) => nameRow(usage, genus, true)),
                  },
                  // Only once you type: a list of every plant you have is not
                  // something to look down, it is the collection. Matched on
                  // its name too, because "the one like Gruyère" is how you
                  // think of it.
                  {
                    label: 'A plant you have · fills in what it is',
                    whileTyping: true,
                    items: ownedPlants(state)
                      .filter((plant) => plant.code !== code && plant.genus)
                      .map((plant) => ({
                        key: plant.code,
                        value: plant.name,
                        detail: formatSpecies(plant),
                        detailItalic: true,
                        meta: plant.code,
                        leading: <PlantThumb plant={plant} />,
                        search: `${formatSpecies(plant)} ${plant.code}`,
                        onPick: () => copyWhatItIs(plant),
                      })),
                  },
                  {
                    label: 'iNaturalist · fills in what it is',
                    whileTyping: true,
                    items: online.taxa.map((taxon) => ({
                      key: `${taxon.genus} ${taxon.species}`,
                      value: taxon.species ? `${taxon.genus} ${taxon.species}` : taxon.genus,
                      italic: true,
                      detail: taxon.species ? taxon.common : 'Genus only',
                      // Already found by iNaturalist, often on the common
                      // name, which is nowhere in the row to match.
                      always: true,
                      onPick: () => {
                        setGenus(taxon.genus)
                        if (!taxon.species) return
                        setSpecies(taxon.species)
                        setHybrid(false)
                        setCross('')
                      },
                    })),
                  },
                  {
                    label: 'GBIF · did you mean',
                    whileTyping: true,
                    items: online.genusSpelling
                      ? [
                          {
                            key: online.genusSpelling.genus,
                            value: online.genusSpelling.genus,
                            italic: true,
                            detail: online.genusSpelling.family,
                            meta: online.genusSpelling.count
                              ? plantCount(online.genusSpelling.count)
                              : undefined,
                            always: true,
                          },
                        ]
                      : [],
                  },
                ]}
                placeholder="Monstera"
                fieldClassName="flex-1"
                onQuery={online.setGenusQuery}
              />
              <SuggestField
                label="Species"
                value={species}
                onChange={setSpecies}
                groups={[
                  {
                    label: genus.trim() ? `Of ${genus.trim()}` : 'Species',
                    items: known.species.map((usage) => nameRow(usage, species, true)),
                  },
                  {
                    label: 'iNaturalist · most seen first',
                    items: online.species.map((taxon) => ({
                      key: taxon.species,
                      value: taxon.species,
                      italic: true,
                      detail: taxon.common || undefined,
                      selected: taxon.species.toLowerCase() === species.trim().toLowerCase(),
                    })),
                  },
                  {
                    label: 'GBIF · did you mean',
                    whileTyping: true,
                    items: online.speciesSpelling
                      ? [
                          {
                            key: online.speciesSpelling,
                            value: online.speciesSpelling,
                            italic: true,
                            always: true,
                          },
                        ]
                      : [],
                  },
                ]}
                placeholder="deliciosa"
                fieldClassName="flex-1"
                align="end"
                onQuery={online.setSpeciesQuery}
                onOpen={online.lookForSpecies}
                disabled={hybrid}
              />
            </div>

            <div className="flex gap-3">
              <SuggestField
                label="Cultivar"
                value={cultivar}
                onChange={setCultivar}
                groups={[
                  {
                    label: 'Cultivar',
                    items: known.cultivars.map((usage) => nameRow(usage, cultivar, false)),
                  },
                ]}
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
                  nameTaken ? (
                    <span className="text-ember">
                      {nameTaken.name} · {nameTaken.code} already has this name. Pick another, so
                      the two never get mixed up.
                    </span>
                  ) : (
                    loadProgress ??
                    (parentPlant
                      ? `Next in the line from ${parentPlant.name}, so the family tree reads without a diagram.`
                      : 'The dice asks a small AI, running in your browser, for something that fits the genus. It is an offer, not a decision.')
                  )
                }
              >
                <div className="flex gap-2">
                  <TextField
                    aria-label="Name"
                    aria-invalid={nameTaken ? true : undefined}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={nameTaken ? 'border-ember hover:border-ember focus:border-ember' : undefined}
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
                  value={place}
                  onChange={setPlace}
                  groups={usageGroups(locations.all, locations.recent, place, 'All places')}
                  addLabel="Add as a new place"
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
                    value={medium}
                    onChange={setMedium}
                    groups={usageGroups(mediums.all, mediums.recent, medium, 'All mediums')}
                    addLabel="Add as a new medium"
                    placeholder="Pick one, or type a new medium"
                    fieldClassName="flex-1"
                    align="end"
                  />
                </div>
              </Section>

              {/* The same scissors the plant page draws a parent and a cutting
                  with, over the field that makes one — and nothing at all until
                  there is a second plant for it to have come off. */}
              {candidates.length === 0 && !parentPlant ? null : (
                <Section icon="scissors" title="Family">
                    {/* Pick only: typing searches your plants, and a parent
                        is never a name you can make up. */}
                    <SuggestField
                      label="Propagated from"
                      value={parentPlant?.name ?? ''}
                      groups={[
                        {
                          label: 'Plants you have',
                          items: candidates.map((candidate) => ({
                            key: candidate.code,
                            value: candidate.name,
                            detail: formatSpecies(candidate),
                            detailItalic: true,
                            meta: candidate.code,
                            leading: <PlantThumb plant={candidate} />,
                            search: `${formatSpecies(candidate)} ${candidate.code}`,
                            selected: candidate.code === parent,
                            onPick: () => adoptParent(candidate.code),
                          })),
                        },
                        ...(parent
                          ? [
                              {
                                label: '',
                                untilTyping: true,
                                items: [
                                  {
                                    key: 'none',
                                    value: 'Not propagated from one of yours',
                                    muted: true,
                                    onPick: () => adoptParent(''),
                                  },
                                ],
                              },
                            ]
                          : []),
                      ]}
                      placeholder="Not propagated from one of yours"
                    />

                    {parentPlant ? <Lineage state={state} parent={parentPlant} /> : null}

                    {existing && childrenOf(state, existing.code).length > 0 ? (
                      <div className="flex gap-2 rounded-lg bg-ember-tint px-4 py-3">
                        <span className="flex h-5 shrink-0 items-center">
                          <Icon name="alert" size={19} className="text-ember" />
                        </span>
                        <p className="text-[0.8125rem] leading-5 text-pretty">
                          {existing.name} has{' '}
                          {plural(descendantCodes(state, existing.code).size, 'plant')} of its own
                          below it. Moving it to another parent moves that whole branch with it.
                        </p>
                      </div>
                    ) : null}

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
            <div className="border-t border-line pt-6">
              <DeleteRow onDelete={remove} wish />
            </div>
          ) : null}
        </div>

        {wish ? null : (
          <div className="flex min-w-0 flex-1 flex-col gap-8">
            <Section icon="receipt" title="Where it came from">
              {/* Off one of your own plants, the family already says where it
                  came from: there is no shop, no seller and no price to it.
                  Nothing is hidden while still set, though, so a plant that
                  has them keeps them in view. */}
              {parentPlant && !originType && !originFrom && !originPrice ? null : (
              <>
              <div className="flex flex-wrap gap-2">
                {/* "Own cutting" was one of these until Family could say it
                    better. An older plant still carrying it is offered it
                    back, so editing anything else cannot drop it. */}
                {(originType && !ORIGIN_TYPES.includes(originType)
                  ? [...ORIGIN_TYPES, originType]
                  : ORIGIN_TYPES
                ).map((candidate) => (
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
                <SuggestField
                  label="From whom"
                  value={originFrom}
                  onChange={setOriginFrom}
                  groups={[
                    {
                      label: 'Had plants from before',
                      items: sources.map((source) => ({
                        key: source.name,
                        value: source.name,
                        detail: source.type ? label(source.type) : undefined,
                        meta: plantCount(source.count),
                        selected: source.name.toLowerCase() === originFrom.trim().toLowerCase(),
                        // Picking the nursery says it is a nursery, unless
                        // you have already said what this one was.
                        onPick: () => {
                          setOriginFrom(source.name)
                          if (!originType && source.type) setOriginType(source.type)
                        },
                      })),
                    },
                  ]}
                  addLabel="Use as a new name"
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
              </>
              )}

              {/* The app's own calendar, the one the log sheet opens. */}
              <DatePickerField
                label="In the collection since"
                value={originDate}
                onChange={(value) => {
                  setOriginDate(value)
                  setOriginDateKnown(true)
                }}
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

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button
          variant="accent"
          icon={existing ? 'check' : 'plus'}
          disabled={saving || nameTaken !== undefined}
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


/** The other plant in the collection already called `name`, ignoring case and
 *  surrounding spaces. `self` is the plant being edited, which may keep its own. */
function findNameClash(plants: readonly Plant[], name: string, self: string | undefined) {
  const wanted = name.trim().toLocaleLowerCase()
  if (!wanted) return undefined
  return plants.find(
    (plant) => !plant.wish && plant.code !== self && plant.name.trim().toLocaleLowerCase() === wanted,
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
      <Button variant="danger-quiet" icon="trash" onClick={onDelete} className="-ml-4">
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
/**
 * The line you are joining, drawn rather than described.
 *
 * Naming a parent is the only thing this form asks for, and it decides more
 * than it looks like it does — every generation above the parent comes with
 * it. So the form shows what it just committed to, in the order the plant page
 * will read it back.
 */
/**
 * What the genus and species lists add from outside the collection: names
 * nobody here has used yet, from iNaturalist, and a spelling from GBIF when
 * what is typed matches nothing at all.
 *
 * Asked only about what is being typed — never about a value the field opened
 * holding, so opening a plant to edit it sends nothing anywhere — and the
 * species of a genus only once that list is opened. A name already in the
 * collection is left out: it is on the list above, with its count.
 */
function useOnlineNames(
  plants: readonly Plant[],
  genus: string,
  known: ReturnType<typeof knownNames>,
) {
  const [genusQuery, setGenusQuery] = useState<string | null>(null)
  const [speciesQuery, setSpeciesQuery] = useState<string | null>(null)
  const [speciesWanted, setSpeciesWanted] = useState(false)

  const lower = (value: string) => value.trim().toLowerCase()
  const g = lower(genusQuery ?? '')
  const s = lower(speciesQuery ?? '')
  const ownGenera = new Set(known.genera.map((usage) => lower(usage.name)))
  const ownSpecies = new Set(known.species.map((usage) => lower(usage.name)))
  const owned = new Set(
    plants.filter((p) => !p.deleted && p.species).map((p) => `${lower(p.genus)} ${lower(p.species)}`),
  )

  // Three letters before asking: "Mo" is half the plant kingdom.
  const found = useLookup(g.length >= 3 ? g : null, () => searchTaxa(g))
  const taxa = (found ?? []).filter((taxon: Taxon) =>
    taxon.species
      ? !owned.has(`${lower(taxon.genus)} ${lower(taxon.species)}`)
      : !ownGenera.has(lower(taxon.genus)),
  )

  // A typo is what nothing else starts like: not a genus here, and nothing
  // iNaturalist knows either. Four letters, or every short start is a typo.
  const unmatched =
    g.length >= 4 && found?.length === 0 && ![...ownGenera].some((name) => name.includes(g))
  const genusFix = useLookup(unmatched ? g : null, () => respell(g))
  const genusSpelling = genusFix
    ? {
        ...genusFix,
        count: known.genera.find((usage) => lower(usage.name) === lower(genusFix.genus))?.count ?? 0,
      }
    : null

  const forGenus = lower(genus)
  const listed = useLookup(speciesWanted && forGenus ? forGenus : null, () => speciesOf(forGenus))
  const speciesList = (listed ?? []).filter((taxon) => !ownSpecies.has(lower(taxon.species)))

  const speciesUnmatched =
    forGenus !== '' &&
    s.length >= 4 &&
    listed !== undefined &&
    ![...ownSpecies, ...speciesList.map((taxon) => lower(taxon.species))].some((name) =>
      name.includes(s),
    )
  const speciesFix = useLookup(speciesUnmatched ? `${forGenus} ${s}` : null, () =>
    respell(genus, s),
  )
  // Only a species of the genus already in the field: anything else would
  // quietly move the plant to another genus from the species box.
  const speciesSpelling =
    speciesFix && lower(speciesFix.genus) === forGenus && speciesFix.species
      ? speciesFix.species
      : null

  return {
    taxa,
    genusSpelling,
    species: speciesList,
    speciesSpelling,
    setGenusQuery,
    setSpeciesQuery,
    lookForSpecies: () => setSpeciesWanted(true),
  }
}

/**
 * The genera, species and cultivars already in the collection, for the
 * suggest lists. Species are the typed genus's own and cultivars that
 * species's (or, with no species yet, the genus's), compared without case so
 * "monstera" still finds them. Plants not in the collection any more count:
 * a name you once spelled right is still spelled right.
 */
function knownNames(plants: readonly Plant[], genus: string, species: string) {
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
  const counted = (values: string[]): Usage[] => {
    const counts = new Map<string, number>()
    for (const value of values.map((v) => v.trim()).filter(Boolean)) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    return [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const live = plants.filter((p) => !p.deleted)
  const ofGenus = genus.trim() ? live.filter((p) => same(p.genus, genus)) : []
  const ofSpecies = species.trim() ? ofGenus.filter((p) => same(p.species, species)) : ofGenus

  return {
    genera: counted(live.map((p) => p.genus)),
    species: counted(ofGenus.map((p) => p.species)),
    cultivars: counted(ofSpecies.map((p) => p.cultivar)),
  }
}

/** A genus, species or cultivar on the list, with how many plants carry it. */
function nameRow(usage: Usage, current: string, italic: boolean) {
  return {
    key: usage.name,
    value: usage.name,
    italic,
    meta: plantCount(usage.count),
    selected: usage.name.toLowerCase() === current.trim().toLowerCase(),
  }
}

/** What "What it is" holds, for taking a copy back. */
type WhatItIs = {
  genus: string
  species: string
  cross: string
  hybrid: boolean
  cultivar: string
  variegation: string
}

/** The fields a parent can fill in for the plant that came off it. */
type Inherited = {
  genus: string
  species: string
  cross: string
  cultivar: string
  variegation: string
  name: string
}

/** The blank form, which is also what "no parent" hands back. */
const NOTHING_INHERITED: Inherited = {
  genus: '',
  species: '',
  cross: '',
  cultivar: '',
  variegation: '',
  name: '',
}

/**
 * What a cutting already is, the moment it comes off `parent`.
 *
 * Only what the What it is section asks: not its place, system, medium or
 * pot, since a cutting starts out somewhere other than its parent, and not
 * the price or the seller, since where it came from is the family itself.
 */
function inheritFrom(state: State, parent: Plant, self?: string): Inherited {
  const taken = new Set(state.plants.filter((p) => p.code !== self).map((p) => p.name))
  return {
    genus: parent.genus,
    species: parent.species,
    cross: parent.cross,
    cultivar: parent.cultivar,
    variegation: parent.variegation,
    name: nextInLine(parent.name, taken),
  }
}

function Lineage({ state, parent }: { state: State; parent: Plant }) {
  const line = [...ancestorsOf(state, parent.code), parent]

  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <GroupLabel>The line so far</GroupLabel>
        <span className="text-[0.8125rem] text-ink-faint">
          {plural(line.length + 1, 'generation')}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {line.map((plant, index) => (
          <span key={plant.code} className="flex items-center gap-2">
            <span
              className={cn(
                'font-display',
                index === line.length - 1
                  ? 'text-[1.0625rem] font-medium text-leaf'
                  : 'text-[1rem] text-ink-muted',
              )}
            >
              {plant.name}
            </span>
            <Icon name="chevronRight" size={14} className="text-line-strong" />
          </span>
        ))}
        <span className="inline-flex h-6.5 items-center rounded-full bg-leaf-tint px-3 text-[0.8125rem] font-semibold text-leaf">
          this one
        </span>
      </div>
    </div>
  )
}

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
      <p className="text-[0.8125rem] leading-5 text-ink-muted text-pretty">
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
