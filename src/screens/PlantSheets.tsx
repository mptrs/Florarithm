/**
 * The plant, written a part at a time.
 *
 * There is no edit screen. A plant is read on its own page, and each part of
 * that page — what it is, where it lives, where it came from, its family, its
 * photograph — opens in a sheet of its own, holding that part and nothing
 * else. After a repot you change the medium; you do not scroll past the cross
 * and the price to get there.
 *
 * New is the same idea from the other side: a short sheet asking only for what
 * a plant needs before it can be found among the rest — what it is, its name,
 * the room it stands in — and Add lands on its page, which says what is still
 * missing in the place it will be read.
 *
 * Every sheet is the app's own `Sheet`, unchanged. What is new is inside it:
 * fields written on a line, the way a herbarium label is written — see
 * `lines.tsx`. The name of the plant is set large, in the serif.
 *
 * Delete is not in any of these. Under a Save it is one slip away, so it sits
 * at the foot of the plant page, on its own.
 */

import { useEffect, useState, type ReactNode } from "react";
import { usePhoto } from "~/data/photos";
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
} from "~/data/selectors";
import {
  ensureVocabItem,
  logEvent,
  savePlant,
  useStore,
  type PlantDraft,
  type State,
} from "~/data/store";
import {
  PLANT_STATUSES,
  PROPAGATION_METHODS,
  SYSTEMS,
  VARIEGATIONS,
  type OriginType,
  type Plant,
  type PlantEvent,
  type PlantStatus,
  type PropagationMethod,
  type System,
} from "~/data/types";
import {
  daysBetween,
  formatDate,
  inputValueToISO,
  isoToInputValue,
  nowISO,
  todayInputValue,
} from "~/lib/date";
import {
  formatSpecies,
  label,
  normalizeCross,
  parseDecimal,
  plural,
  priceInputValue,
} from "~/lib/format";
import { nextInLine } from "~/lib/nameGenerator";
import { codePrefix } from "~/lib/plantCode";
import {
  respell,
  searchTaxa,
  speciesOf,
  useLookup,
  type Taxon,
} from "~/lib/taxa";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/Button";
import { GroupLabel } from "~/ui/Card";
import { DatePickerField } from "~/ui/DatePicker";
import { SegmentedField } from "~/ui/fields";
import { Icon } from "~/ui/Icon";
import {
  CodeLine,
  LineCheck,
  LineInput,
  LineOptions,
  LineSelect,
} from "~/ui/lines";
import { PlantThumb } from "~/ui/plantPicture";
import { Sheet } from "~/ui/Sheet";
import {
  plants as plantCount,
  SuggestField,
  usageGroups,
  type Usage,
} from "~/ui/suggest";
import { showToast } from "~/ui/toast";

/** The parts of a plant that open in a sheet of their own. */
export type PlantPart = "what" | "lives" | "came" | "family" | "photo" | "have";

const SYSTEM_OPTIONS = SYSTEMS.map((value) => ({ value, label: label(value) }));
/** Bought is what an empty choice means, so it is not one of them. Nursery and
 *  shop went: From whom already names the shop. */
const NOT_BOUGHT: readonly { value: OriginType; label: string }[] = [
  { value: "trade", label: "Trade" },
  { value: "gift", label: "Gift" },
];

// --- what it is -------------------------------------------------------------

/** What "What it is" holds while it is being written. The species and the
 *  cross share one line: a × in it is what makes it a cross. */
type WhatItIs = {
  genus: string;
  epithet: string;
  cultivar: string;
  variegation: string;
  name: string;
};

const NOTHING: WhatItIs = {
  genus: "",
  epithet: "",
  cultivar: "",
  variegation: "",
  name: "",
};

function whatItIsOf(plant: Plant): WhatItIs {
  return {
    genus: plant.genus,
    epithet: plant.cross || plant.species,
    cultivar: plant.cultivar,
    variegation: plant.variegation,
    name: plant.name,
  };
}

/** A line with a × in it is a cross, and the species stays empty; without
 *  one it is a species. So a record can never be both — the rule the hybrid
 *  switch used to enforce by greying one of them out. */
export function splitEpithet(value: string): {
  species: string;
  cross: string;
} {
  const trimmed = value.trim();
  return trimmed.includes("×")
    ? { species: "", cross: trimmed }
    : { species: trimmed, cross: "" };
}

/**
 * Genus, species or cross, cultivar, variegation and — on a plant you have —
 * its name. Every list the box fields had is still under these lines.
 */
function WhatItIsFields({
  what,
  onChange,
  self,
  parentName,
  withName,
}: {
  what: WhatItIs;
  onChange: (next: WhatItIs) => void;
  /** The plant being edited: never offered as its own copy, and free to keep
   *  its own name. */
  self?: string;
  /** The plant this one came off, for the name's hint. */
  parentName?: string;
  withName: boolean;
}) {
  const state = useStore();
  const set = (patch: Partial<WhatItIs>) => onChange({ ...what, ...patch });
  const { species, cross } = splitEpithet(what.epithet);
  const isCross = cross !== "";
  const known = knownNames(state.plants, what.genus, species);
  const online = useOnlineNames(state.plants, what.genus, known);
  const nameTaken = withName
    ? findNameClash(state.plants, what.name, self)
    : undefined;
  /** The plant "What it is" was just copied from, and what the lines held
   *  before, so the copy can be taken back in one tap. */
  const [copied, setCopied] = useState<{ from: string; was: WhatItIs } | null>(
    null,
  );

  const copy = (source: Plant) => {
    setCopied({ from: source.name, was: what });
    onChange({
      ...what,
      genus: source.genus,
      epithet: source.cross || source.species,
      cultivar: source.cultivar,
      variegation: source.variegation,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {copied ? (
        <div className="flex items-center gap-3 rounded-lg bg-leaf-tint py-1 pr-1 pl-4">
          <Icon name="copy" size={18} className="shrink-0 text-leaf" />
          <p className="flex-1 py-2 text-[0.875rem] leading-5 text-pretty">
            What it is, from{" "}
            <span className="font-display text-[1rem] font-medium">
              {copied.from}
            </span>
            .
          </p>
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              onChange({ ...copied.was, name: what.name });
              setCopied(null);
            }}
          >
            Undo
          </Button>
        </div>
      ) : null}

      <SuggestField
        face="line"
        size="big"
        label="Genus"
        value={what.genus}
        onChange={(genus) => set({ genus })}
        placeholder="Genus"
        onQuery={online.setGenusQuery}
        groups={[
          {
            label: "Genus · fills in the genus",
            items: known.genera.map((usage) =>
              nameRow(usage, what.genus, true),
            ),
          },
          {
            label: "A plant you have · fills in what it is",
            whileTyping: true,
            items: ownedPlants(state)
              .filter((plant) => plant.code !== self && plant.genus)
              .map((plant) => ({
                key: plant.code,
                value: plant.name,
                detail: formatSpecies(plant),
                detailItalic: true,
                meta: plant.code,
                leading: <PlantThumb plant={plant} />,
                search: `${formatSpecies(plant)} ${plant.code}`,
                onPick: () => copy(plant),
              })),
          },
          {
            label: "iNaturalist · fills in what it is",
            whileTyping: true,
            items: online.taxa.map((taxon) => ({
              key: `${taxon.genus} ${taxon.species}`,
              value: taxon.species
                ? `${taxon.genus} ${taxon.species}`
                : taxon.genus,
              italic: true,
              detail: taxon.species ? taxon.common : "Genus only",
              always: true,
              onPick: () =>
                set({
                  genus: taxon.genus,
                  ...(taxon.species ? { epithet: taxon.species } : {}),
                }),
            })),
          },
          {
            label: "GBIF · did you mean",
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
      />

      {/* One line for a species or a cross. A lone x between two parents
          becomes × as you type, and the × is what makes it a cross: the list
          then offers the crosses already here, and stops asking iNaturalist,
          which has none. A cross steps down a size, because parentage is long
          and nests. */}
      <SuggestField
        face="line"
        size={isCross ? "mid" : "big"}
        label={isCross ? "Cross" : "Species"}
        value={what.epithet}
        onChange={(epithet) => set({ epithet: normalizeCross(epithet) })}
        placeholder="species, or a × cross"
        onQuery={online.setSpeciesQuery}
        onOpen={online.lookForSpecies}
        groups={
          isCross
            ? [
                {
                  label: what.genus.trim()
                    ? `Crosses of ${what.genus.trim()}`
                    : "Crosses",
                  items: known.crosses.map((usage) =>
                    nameRow(usage, what.epithet, false),
                  ),
                },
              ]
            : [
                {
                  label: what.genus.trim()
                    ? `Of ${what.genus.trim()}`
                    : "Species",
                  items: known.species.map((usage) =>
                    nameRow(usage, species, true),
                  ),
                },
                {
                  label: "iNaturalist · most seen first",
                  items: online.species.map((taxon) => ({
                    key: taxon.species,
                    value: taxon.species,
                    italic: true,
                    detail: taxon.common || undefined,
                    selected:
                      taxon.species.toLowerCase() === species.toLowerCase(),
                  })),
                },
                {
                  label: "GBIF · did you mean",
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
              ]
        }
      />

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] gap-4">
        <SuggestField
          face="line"
          size="mid"
          label="Cultivar"
          value={what.cultivar}
          onChange={(cultivar) => set({ cultivar })}
          placeholder="cultivar"
          groups={[
            {
              label: "Cultivar",
              items: known.cultivars.map((usage) =>
                nameRow(usage, what.cultivar, false),
              ),
            },
          ]}
        />
        {/* A plant still carrying a term from outside the six — typed back
            when this was a free field — is offered its own value back, so
            saving anything else cannot silently drop it. */}
        <LineSelect
          caption="Variegation"
          size="mid"
          value={what.variegation}
          onChange={(event) => set({ variegation: event.target.value })}
        >
          <option value="">None</option>
          {(VARIEGATIONS.includes(what.variegation) || !what.variegation
            ? VARIEGATIONS
            : [...VARIEGATIONS, what.variegation]
          ).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </LineSelect>
      </div>

      {withName ? (
        <LineInput
          caption="Name"
          size="mid"
          value={what.name}
          onChange={(event) => set({ name: event.target.value })}
          placeholder="Gruyère"
          invalid={nameTaken !== undefined}
          hint={
            nameTaken ? (
              <span className="text-ember">
                {nameTaken.name} · {nameTaken.code} already has this name. Pick
                another, so the two never get mixed up.
              </span>
            ) : parentName ? (
              `Next in the line from ${parentName}.`
            ) : undefined
          }
        />
      ) : null}
    </div>
  );
}

// --- the shared frame of a part sheet ---------------------------------------

function SaveButton({
  label: text = "Save",
  icon = "check",
  disabled,
  onClick,
}: {
  label?: string;
  icon?: "check" | "plus";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="accent"
      icon={icon}
      block
      disabled={disabled}
      onClick={onClick}
      className="mt-6"
    >
      {text}
    </Button>
  );
}

/** One save at a time, and the sheet closes only once it has landed. */
function useSaving(): [boolean, (work: () => Promise<void>) => Promise<void>] {
  const [saving, setSaving] = useState(false);
  const run = async (work: () => Promise<void>) => {
    if (saving) return;
    setSaving(true);
    try {
      await work();
    } finally {
      setSaving(false);
    }
  };
  return [saving, run];
}

/** Everything a plant already is, as something `savePlant` takes back. */
function draftOf(plant: Plant): PlantDraft {
  return {
    code: plant.code,
    name: plant.name,
    genus: plant.genus,
    species: plant.species,
    cross: plant.cross,
    cultivar: plant.cultivar,
    variegation: plant.variegation,
    locationId: plant.locationId,
    system: plant.system,
    potSize: plant.potSize,
    mediumId: plant.mediumId,
    origin: plant.origin,
    parent: plant.parent,
    status: plant.status,
    photoEventId: plant.photoEventId ?? null,
    tissueCulture: plant.tissueCulture,
    wish: plant.wish,
    wishNote: plant.wishNote,
  };
}

function whatItIsDraft(what: WhatItIs) {
  const { species, cross } = splitEpithet(what.epithet);
  return {
    genus: what.genus.trim(),
    species,
    cross,
    cultivar: what.cultivar.trim(),
    variegation: what.variegation.trim(),
  };
}

// --- new --------------------------------------------------------------------

/**
 * A new plant or a new wish, over whatever was on screen.
 *
 * Only what a plant needs to exist and be found again: what it is, its name,
 * where it stands. Pot, medium and where it came from are each a sheet on its
 * page, filled in now or the day the receipt turns up. A wish has no name and
 * no place yet — what it is and why you want it.
 */
export function NewPlantSheet({
  startAsWish,
  parentCode,
  onClose,
  onAdded,
}: {
  startAsWish: boolean;
  parentCode: string | null;
  onClose: () => void;
  /** The record exists: a plant lands on its page, a wish on the wishlist. */
  onAdded: (plant: Plant) => void;
}) {
  const state = useStore();
  const parent = parentCode ? findPlant(state, parentCode) : undefined;
  const [wish, setWish] = useState(startAsWish);
  const [what, setWhat] = useState<WhatItIs>(NOTHING);
  const [inherited, setInherited] = useState(false);
  const [method, setMethod] = useState<PropagationMethod>("cutting");
  const [note, setNote] = useState("");
  const [place, setPlace] = useState("");
  const [system, setSystem] = useState<System>("hydro");
  const [saving, run] = useSaving();
  const places = vocabUsage(state, "location");

  // A cutting is the same plant as its parent, so what it is and its next
  // name in the line are already on record. Keyed on the parent being
  // *found*: straight after a reload the store can still be loading.
  useEffect(() => {
    if (!parent || inherited) return;
    setWhat({
      ...whatItIsOf(parent),
      name: nextInLine(parent.name, new Set(state.plants.map((p) => p.name))),
    });
    setInherited(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent?.code]);

  const nameTaken = wish
    ? undefined
    : findNameClash(state.plants, what.name, undefined);

  const add = () =>
    run(async () => {
      const locationId = wish ? null : await ensureVocabItem("location", place);
      const identity = whatItIsDraft(what);
      const plant = await savePlant({
        name:
          (wish ? "" : what.name.trim()) ||
          formatSpecies(identity) ||
          "Unnamed",
        ...identity,
        locationId,
        system,
        potSize: null,
        mediumId: null,
        origin: {
          type: null,
          from: "",
          date: inputValueToISO(todayInputValue()),
          price: null,
        },
        parent: parent && !wish ? { code: parent.code, method } : null,
        status: "active",
        photoEventId: null,
        wish,
        wishNote: wish ? note.trim() : "",
      });
      showToast(
        wish
          ? `${plant.name} added to the wishlist`
          : `${plant.name} added to the collection`,
      );
      onAdded(plant);
    });

  return (
    <Sheet open onClose={onClose} title={wish ? "New wish" : "New plant"}>
      <div className="flex flex-col gap-4">
        {parent ? null : (
          <SegmentedField
            options={[
              { value: "plant", label: "A plant" },
              { value: "wish", label: "A wish" },
            ]}
            value={wish ? "wish" : "plant"}
            onChange={(next) => setWish(next === "wish")}
          />
        )}

        {wish ? null : (
          <CodeLine
            prefix={
              what.genus.trim() || what.name.trim()
                ? codePrefix(what.genus.trim() || what.name.trim())
                : undefined
            }
          />
        )}

        {parent ? (
          <div className="flex flex-col gap-1">
            <p className="text-[0.875rem] text-ink-muted">
              Propagated from{" "}
              <span className="font-display text-[1rem] font-medium text-ink">
                {parent.name}
              </span>
            </p>
            <LineOptions
              options={PROPAGATION_METHODS.map((value) => ({
                value,
                label: label(value),
              }))}
              value={method}
              onChange={(next) => next && setMethod(next)}
            />
          </div>
        ) : null}

        <WhatItIsFields
          what={what}
          onChange={setWhat}
          parentName={parent?.name}
          withName={!wish}
        />

        {wish ? (
          <LineInput
            caption="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Seen at Wilstra, about €40"
          />
        ) : (
          <>
            <SuggestField
              face="line"
              label="Place"
              value={place}
              onChange={setPlace}
              groups={usageGroups(
                places.all,
                places.recent,
                place,
                "All places",
              )}
              addLabel="Add as a new place"
              placeholder="a room"
            />
            <LineOptions
              caption="System"
              options={SYSTEM_OPTIONS}
              value={system}
              onChange={(next) => next && setSystem(next)}
            />
          </>
        )}
      </div>

      <SaveButton
        label={wish ? "Add to wishlist" : "Add to the collection"}
        icon="plus"
        disabled={saving || nameTaken !== undefined}
        onClick={() => void add()}
      />
      {wish ? null : (
        <p className="mt-3 text-center text-[0.8125rem] text-ink-muted">
          Pot, medium and where it came from go on its page.
        </p>
      )}
    </Sheet>
  );
}

// --- what it is (edit) ------------------------------------------------------

/** The pen beside the name: what it is, what it is called and its status. On
 *  a wish, what it is and why you want it. */
export function WhatItIsSheet({
  plant,
  onClose,
}: {
  plant: Plant;
  onClose: () => void;
}) {
  const state = useStore();
  const [what, setWhat] = useState<WhatItIs>(() => whatItIsOf(plant));
  const [status, setStatus] = useState<PlantStatus>(plant.status);
  const [note, setNote] = useState(plant.wishNote);
  const [saving, run] = useSaving();
  const parent = plant.parent ? findPlant(state, plant.parent.code) : undefined;
  const nameTaken = plant.wish
    ? undefined
    : findNameClash(state.plants, what.name, plant.code);

  const save = () =>
    run(async () => {
      const identity = whatItIsDraft(what);
      await savePlant({
        ...draftOf(plant),
        ...identity,
        name:
          (plant.wish ? "" : what.name.trim()) ||
          formatSpecies(identity) ||
          plant.name,
        status: plant.wish ? plant.status : status,
        wishNote: plant.wish ? note.trim() : plant.wishNote,
      });
      showToast("Saved");
      onClose();
    });

  return (
    <Sheet open onClose={onClose} title="What it is">
      <div className="flex flex-col gap-4">
        {plant.wish ? null : <CodeLine code={plant.code} />}
        <WhatItIsFields
          what={what}
          onChange={setWhat}
          self={plant.code}
          parentName={parent?.name}
          withName={!plant.wish}
        />
        {plant.wish ? (
          <LineInput
            caption="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        ) : (
          <LineOptions
            caption="Status"
            options={PLANT_STATUSES.map((value) => ({
              value,
              label: label(value),
            }))}
            value={status}
            onChange={(next) => next && setStatus(next)}
          />
        )}
      </div>
      <SaveButton
        disabled={saving || nameTaken !== undefined}
        onClick={() => void save()}
      />
    </Sheet>
  );
}

// --- where it lives ---------------------------------------------------------

/**
 * Room, system, pot and medium, for setting them right. A new pot is not a
 * correction: Repot already changes these on the plant and keeps the day in
 * the history, so the sheet says so and hands over to it.
 */
export function LivesSheet({
  plant,
  onClose,
  onRepot,
}: {
  plant: Plant;
  onClose: () => void;
  onRepot: () => void;
}) {
  const state = useStore();
  const places = vocabUsage(state, "location");
  const mediums = vocabUsage(state, "medium");
  const [place, setPlace] = useState(
    vocabName(state, plant.locationId).replace("—", ""),
  );
  const [system, setSystem] = useState<System>(plant.system);
  const [pot, setPot] = useState(
    plant.potSize === null ? "" : String(plant.potSize),
  );
  const [medium, setMedium] = useState(
    vocabName(state, plant.mediumId).replace("—", ""),
  );
  const [saving, run] = useSaving();

  const save = () =>
    run(async () => {
      const [locationId, mediumId] = await Promise.all([
        ensureVocabItem("location", place),
        ensureVocabItem("medium", medium),
      ]);
      await savePlant({
        ...draftOf(plant),
        locationId,
        system,
        potSize: parseDecimal(pot),
        mediumId,
      });
      showToast("Saved");
      onClose();
    });

  return (
    <Sheet open onClose={onClose} title="Where it lives">
      <div className="flex flex-col gap-4">
        <SuggestField
          face="line"
          label="Place"
          value={place}
          onChange={setPlace}
          groups={usageGroups(places.all, places.recent, place, "All places")}
          addLabel="Add as a new place"
          placeholder="a room"
        />
        <LineOptions
          caption="System"
          options={SYSTEM_OPTIONS}
          value={system}
          onChange={(next) => next && setSystem(next)}
        />
        <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4">
          <LineInput
            caption="Pot size"
            unit="cm"
            mono
            inputMode="decimal"
            value={pot}
            onChange={(event) => setPot(event.target.value)}
          />
          <SuggestField
            face="line"
            label="Medium"
            value={medium}
            onChange={setMedium}
            groups={usageGroups(
              mediums.all,
              mediums.recent,
              medium,
              "All mediums",
            )}
            addLabel="Add as a new medium"
            placeholder="medium"
            align="end"
          />
        </div>

        <button
          type="button"
          onClick={onRepot}
          className="warm flex items-center gap-3 rounded-lg bg-sunk px-4 py-3 text-left text-[0.875rem] leading-5 text-ink-muted hover:text-ink"
        >
          <Icon name="pot" size={18} className="shrink-0 text-ink-faint" />
          <span className="flex-1 text-pretty">
            Moved it into a new pot? Log it as a repot, so it stays in the
            history.
          </span>
          <span className="flex shrink-0 items-center font-semibold text-leaf">
            Repot
            <Icon name="chevronRight" size={16} />
          </span>
        </button>
      </div>
      <SaveButton disabled={saving} onClick={() => void save()} />
    </Sheet>
  );
}

// --- where it came from -----------------------------------------------------

export function CameFromSheet({
  plant,
  onClose,
}: {
  plant: Plant;
  onClose: () => void;
}) {
  const state = useStore();
  const sources = originSources(state);
  const legacy =
    plant.origin.type === "trade" || plant.origin.type === "gift"
      ? plant.origin.type
      : null;
  const [from, setFrom] = useState(plant.origin.from);
  const [price, setPrice] = useState(priceInputValue(plant.origin.price));
  const [how, setHow] = useState<OriginType | null>(legacy);
  const [date, setDate] = useState(
    plant.origin.date
      ? isoToInputValue(plant.origin.date)
      : isoToInputValue(plant.createdAt),
  );
  /** False for a plant whose arrival was never written down: the field shows
   *  the day its record was made, and saving leaves it without one rather
   *  than stamping that day on it as the day it arrived. */
  const [dateKnown, setDateKnown] = useState(plant.origin.date !== null);
  const [tc, setTc] = useState(plant.tissueCulture === true);
  const [saving, run] = useSaving();

  const save = () =>
    run(async () => {
      await savePlant({
        ...draftOf(plant),
        origin: {
          // Trade or gift, or bought. A plant still carrying an older kind —
          // nursery, shop, own cutting — keeps it unless one of these is ticked.
          type: how ?? (legacy ? null : plant.origin.type),
          from: from.trim(),
          date: dateKnown ? inputValueToISO(date) : null,
          price: parseDecimal(price),
        },
        // Only ever written as true: a plant not from tissue culture says so
        // by not carrying the field, as every older record does.
        tissueCulture: tc ? true : undefined,
      });
      showToast("Saved");
      onClose();
    });

  return (
    <Sheet open onClose={onClose} title="Where it came from">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-4">
          <SuggestField
            face="line"
            label="From whom"
            value={from}
            onChange={setFrom}
            groups={[
              {
                label: "Had plants from before",
                items: sources.map((source) => ({
                  key: source.name,
                  value: source.name,
                  meta: plantCount(source.count),
                  selected:
                    source.name.toLowerCase() === from.trim().toLowerCase(),
                })),
              },
            ]}
            addLabel="Use as a new name"
            placeholder="a shop or a person"
          />
          <LineInput
            caption="Price"
            unit="€"
            mono
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>
        <LineOptions
          caption="Not bought"
          options={NOT_BOUGHT}
          value={how}
          onChange={setHow}
          clearable
        />
        <DatePickerField
          face="line"
          label="In the collection since"
          value={date}
          onChange={(value) => {
            setDate(value);
            setDateKnown(true);
          }}
          fieldClassName="w-56"
        />
        <LineCheck label="From tissue culture" checked={tc} onChange={setTc} />
      </div>
      <SaveButton disabled={saving} onClick={() => void save()} />
    </Sheet>
  );
}

// --- family -----------------------------------------------------------------

export function FamilySheet({
  plant,
  onClose,
}: {
  plant: Plant;
  onClose: () => void;
}) {
  const state = useStore();
  const offspring = descendantCodes(state, plant.code);
  // Not itself, and nothing already below it: a plant that descends from its
  // own cutting is a loop, and a loop is a family tree that never ends.
  const candidates = ownedPlants(state).filter(
    (other) => other.code !== plant.code && !offspring.has(other.code),
  );
  const [parent, setParent] = useState(plant.parent?.code ?? "");
  const [method, setMethod] = useState<PropagationMethod>(
    plant.parent?.method ?? "cutting",
  );
  const [saving, run] = useSaving();
  const parentPlant = parent ? findPlant(state, parent) : undefined;
  const hasBranch = childrenOf(state, plant.code).length > 0;

  const save = () =>
    run(async () => {
      await savePlant({
        ...draftOf(plant),
        parent: parentPlant ? { code: parentPlant.code, method } : null,
      });
      showToast("Saved");
      onClose();
    });

  return (
    <Sheet open onClose={onClose} title="Family">
      <div className="flex flex-col gap-4">
        <SuggestField
          face="line"
          label="Propagated from"
          value={parentPlant?.name ?? ""}
          placeholder="Not propagated from one of yours"
          groups={[
            {
              label: "Plants you have",
              items: candidates.map((candidate) => ({
                key: candidate.code,
                value: candidate.name,
                detail: formatSpecies(candidate),
                detailItalic: true,
                meta: candidate.code,
                leading: <PlantThumb plant={candidate} />,
                search: `${formatSpecies(candidate)} ${candidate.code}`,
                selected: candidate.code === parent,
                onPick: () => setParent(candidate.code),
              })),
            },
            ...(parent
              ? [
                  {
                    label: "",
                    untilTyping: true,
                    items: [
                      {
                        key: "none",
                        value: "Not propagated from one of yours",
                        muted: true,
                        onPick: () => setParent(""),
                      },
                    ],
                  },
                ]
              : []),
          ]}
        />

        {parentPlant ? <Lineage state={state} parent={parentPlant} /> : null}

        {hasBranch ? (
          <div className="flex gap-2 rounded-lg bg-ember-tint px-4 py-3">
            <span className="flex h-5 shrink-0 items-center">
              <Icon name="alert" size={19} className="text-ember" />
            </span>
            <p className="text-[0.8125rem] leading-5 text-pretty">
              {plant.name} has {plural(offspring.size, "plant")} of its own
              below it. Moving it to another parent moves that whole branch with
              it.
            </p>
          </div>
        ) : null}

        {parentPlant ? (
          <LineOptions
            caption="How"
            options={PROPAGATION_METHODS.map((value) => ({
              value,
              label: label(value),
            }))}
            value={method}
            onChange={(next) => next && setMethod(next)}
          />
        ) : null}
      </div>
      <SaveButton disabled={saving} onClick={() => void save()} />
    </Sheet>
  );
}

/** The line being joined, drawn rather than described. */
function Lineage({ state, parent }: { state: State; parent: Plant }) {
  const line = [...ancestorsOf(state, parent.code), parent];
  return (
    <div className="rounded-lg border border-line px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <GroupLabel>The line so far</GroupLabel>
        <span className="text-[0.8125rem] text-ink-faint">
          {plural(line.length + 1, "generation")}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {line.map((plant, index) => (
          <span key={plant.code} className="flex items-center gap-2">
            <span
              className={cn(
                "font-display",
                index === line.length - 1
                  ? "text-[1.0625rem] font-medium text-leaf"
                  : "text-[1rem] text-ink-muted",
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
  );
}

// --- photo ------------------------------------------------------------------

/** Which photograph stands for the plant. Only offered with two or more. */
export function PhotoSheet({
  plant,
  onClose,
}: {
  plant: Plant;
  onClose: () => void;
}) {
  const state = useStore();
  const photos = photoEventsFor(state, plant.code);
  const [chosen, setChosen] = useState(plant.photoEventId ?? "");
  const [saving, run] = useSaving();

  const save = () =>
    run(async () => {
      await savePlant({ ...draftOf(plant), photoEventId: chosen || null });
      showToast("Saved");
      onClose();
    });

  return (
    <Sheet open onClose={onClose} title="Photo">
      <div
        role="radiogroup"
        aria-label="The plant's photo"
        className="grid grid-cols-4 gap-3 sm:grid-cols-5"
      >
        <Choice
          selected={chosen === ""}
          label="Newest"
          onClick={() => setChosen("")}
        >
          <span className="flex size-full items-center justify-center text-[0.8125rem] font-medium text-ink-muted">
            Newest
          </span>
        </Choice>
        {photos.map((event) => (
          <Choice
            key={event.id}
            selected={chosen === event.id}
            label={`Photographed ${formatDate(event.date)}`}
            onClick={() => setChosen(event.id)}
          >
            <Thumbnail event={event} />
          </Choice>
        ))}
      </div>
      <p className="mt-3 text-[0.8125rem] leading-5 text-ink-muted">
        Which one stands for the plant. Every photograph stays in the history
        either way.
      </p>
      <SaveButton disabled={saving} onClick={() => void save()} />
    </Sheet>
  );
}

function Choice({
  selected,
  label: name,
  onClick,
  children,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={name}
      onClick={onClick}
      className={cn(
        "warm aspect-square overflow-hidden rounded-lg border-2 bg-sunk active:opacity-70",
        selected
          ? "border-leaf"
          : "border-transparent hover:border-line-strong",
      )}
    >
      {children}
    </button>
  );
}

function Thumbnail({ event }: { event: PlantEvent }) {
  const url = usePhoto(event.id);
  if (!url) return null;
  return <img src={url} alt="" className="size-full object-cover" />;
}

// --- I have this now --------------------------------------------------------

/**
 * A wish arriving. It gets a name, a room and the day it came — that day is
 * the one the plant page reads back as "in the collection since", and the wait
 * ends there — and, if you have them, who it came from and what it cost.
 */
export function HaveSheet({
  plant,
  onClose,
  onDone,
}: {
  plant: Plant;
  onClose: () => void;
  onDone: (code: string) => void;
}) {
  const state = useStore();
  const places = vocabUsage(state, "location");
  const sources = originSources(state);
  // Opens holding the name the wish already carries — its species — so the
  // first name a plant gets is typed over something rather than into nothing.
  const [name, setName] = useState(plant.name);
  const [place, setPlace] = useState("");
  const [system, setSystem] = useState<System>(plant.system);
  const [date, setDate] = useState(todayInputValue());
  const [from, setFrom] = useState(plant.origin.from);
  const [price, setPrice] = useState(priceInputValue(plant.origin.price));
  const [how, setHow] = useState<OriginType | null>(null);
  const [saving, run] = useSaving();
  const nameTaken = findNameClash(state.plants, name, plant.code);

  const save = () =>
    run(async () => {
      const locationId = await ensureVocabItem("location", place);
      const arrived = inputValueToISO(date) ?? nowISO();
      await savePlant({
        ...draftOf(plant),
        name: name.trim() || formatSpecies(plant) || plant.name,
        locationId,
        system,
        origin: {
          type: how,
          from: from.trim(),
          date: arrived,
          price: parseDecimal(price),
        },
        wish: false,
        // The note moves into the log below rather than staying in a field
        // nothing renders once the plant is yours.
        wishNote: "",
      });
      await logEvent({
        plantCode: plant.code,
        type: "note",
        date: arrived,
        text: plant.wishNote.trim(),
        fromWishlist: Math.max(0, daysBetween(plant.createdAt, arrived)),
      });
      showToast(`${name.trim() || plant.name} added to the collection`);
      onDone(plant.code);
    });

  return (
    <Sheet open onClose={onClose} title="I have this now">
      <div className="flex flex-col gap-4">
        <p className="text-[0.875rem] text-ink-muted">
          <span className="font-display text-[1.0625rem] font-medium text-ink">
            {formatSpecies(plant)}
          </span>
          , off the wishlist and into the collection.
        </p>
        <LineInput
          caption="Name"
          size="mid"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Gruyère"
          invalid={nameTaken !== undefined}
          hint={
            nameTaken ? (
              <span className="text-ember">
                {nameTaken.name} · {nameTaken.code} already has this name.
              </span>
            ) : undefined
          }
        />
        <SuggestField
          face="line"
          label="Place"
          value={place}
          onChange={setPlace}
          groups={usageGroups(places.all, places.recent, place, "All places")}
          addLabel="Add as a new place"
          placeholder="a room"
        />
        <LineOptions
          caption="System"
          options={SYSTEM_OPTIONS}
          value={system}
          onChange={(next) => next && setSystem(next)}
        />
        <DatePickerField
          face="line"
          label="Arrived"
          value={date}
          onChange={setDate}
          fieldClassName="w-56"
        />
        <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-4">
          <SuggestField
            face="line"
            label="From whom"
            value={from}
            onChange={setFrom}
            groups={[
              {
                label: "Had plants from before",
                items: sources.map((source) => ({
                  key: source.name,
                  value: source.name,
                  meta: plantCount(source.count),
                })),
              },
            ]}
            addLabel="Use as a new name"
            placeholder="a shop or a person"
          />
          <LineInput
            caption="Price"
            unit="€"
            mono
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>
        <LineOptions
          caption="Not bought"
          options={NOT_BOUGHT}
          value={how}
          onChange={setHow}
          clearable
        />
      </div>
      <SaveButton
        label="Add to the collection"
        icon="plus"
        disabled={saving || nameTaken !== undefined}
        onClick={() => void save()}
      />
    </Sheet>
  );
}

// --- names ------------------------------------------------------------------

/** The other plant in the collection already called `name`, ignoring case and
 *  surrounding spaces. `self` may keep its own. Wishes carry no name of their
 *  own yet, so they are left out on both sides. */
function findNameClash(
  plants: readonly Plant[],
  name: string,
  self: string | undefined,
) {
  const wanted = name.trim().toLocaleLowerCase();
  if (!wanted) return undefined;
  return plants.find(
    (plant) =>
      !plant.wish &&
      plant.code !== self &&
      plant.name.trim().toLocaleLowerCase() === wanted,
  );
}

/**
 * What the genus and species lists add from outside the collection: names
 * nobody here has used yet, from iNaturalist, and a spelling from GBIF when
 * what is typed matches nothing at all. Asked only about what is being typed,
 * never about a value a line opened holding, so opening a plant sends nothing.
 */
function useOnlineNames(
  plants: readonly Plant[],
  genus: string,
  known: ReturnType<typeof knownNames>,
) {
  const [genusQuery, setGenusQuery] = useState<string | null>(null);
  const [speciesQuery, setSpeciesQuery] = useState<string | null>(null);
  const [speciesWanted, setSpeciesWanted] = useState(false);

  const lower = (value: string) => value.trim().toLowerCase();
  const g = lower(genusQuery ?? "");
  const s = lower(speciesQuery ?? "");
  const ownGenera = new Set(known.genera.map((usage) => lower(usage.name)));
  const ownSpecies = new Set(known.species.map((usage) => lower(usage.name)));
  const owned = new Set(
    plants
      .filter((p) => !p.deleted && p.species)
      .map((p) => `${lower(p.genus)} ${lower(p.species)}`),
  );

  // Three letters before asking: "Mo" is half the plant kingdom.
  const found = useLookup(g.length >= 3 ? g : null, () => searchTaxa(g));
  const taxa = (found ?? []).filter((taxon: Taxon) =>
    taxon.species
      ? !owned.has(`${lower(taxon.genus)} ${lower(taxon.species)}`)
      : !ownGenera.has(lower(taxon.genus)),
  );

  // A typo is what nothing else starts like. Four letters, or every short
  // start is a typo.
  const unmatched =
    g.length >= 4 &&
    found?.length === 0 &&
    ![...ownGenera].some((name) => name.includes(g));
  const genusFix = useLookup(unmatched ? g : null, () => respell(g));
  const genusSpelling = genusFix
    ? {
        ...genusFix,
        count:
          known.genera.find(
            (usage) => lower(usage.name) === lower(genusFix.genus),
          )?.count ?? 0,
      }
    : null;

  const forGenus = lower(genus);
  // Not while a cross is being written: iNaturalist has no crosses to give.
  const crossing = s.includes("×");
  const listed = useLookup(
    speciesWanted && forGenus && !crossing ? forGenus : null,
    () => speciesOf(forGenus),
  );
  const speciesList = (listed ?? []).filter(
    (taxon) => !ownSpecies.has(lower(taxon.species)),
  );

  const speciesUnmatched =
    forGenus !== "" &&
    !crossing &&
    s.length >= 4 &&
    listed !== undefined &&
    ![...ownSpecies, ...speciesList.map((taxon) => lower(taxon.species))].some(
      (name) => name.includes(s),
    );
  const speciesFix = useLookup(
    speciesUnmatched ? `${forGenus} ${s}` : null,
    () => respell(genus, s),
  );
  // Only a species of the genus already on the line: anything else would
  // quietly move the plant to another genus from the species line.
  const speciesSpelling =
    speciesFix && lower(speciesFix.genus) === forGenus && speciesFix.species
      ? speciesFix.species
      : null;

  return {
    taxa,
    genusSpelling,
    species: speciesList,
    speciesSpelling,
    setGenusQuery,
    setSpeciesQuery,
    lookForSpecies: () => setSpeciesWanted(true),
  };
}

/**
 * The genera, species, crosses and cultivars already in the collection, for
 * the lists. Species and crosses are the typed genus's own, cultivars that
 * species's (or, with no species yet, the genus's), compared without case.
 * Plants no longer in the collection count: a name once spelled right is
 * still spelled right.
 */
function knownNames(plants: readonly Plant[], genus: string, species: string) {
  const same = (a: string, b: string) =>
    a.trim().toLowerCase() === b.trim().toLowerCase();
  const counted = (values: string[]): Usage[] => {
    const counts = new Map<string, number>();
    for (const value of values.map((v) => v.trim()).filter(Boolean)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const live = plants.filter((p) => !p.deleted);
  const ofGenus = genus.trim() ? live.filter((p) => same(p.genus, genus)) : [];
  const ofSpecies = species.trim()
    ? ofGenus.filter((p) => same(p.species, species))
    : ofGenus;

  return {
    genera: counted(live.map((p) => p.genus)),
    species: counted(ofGenus.map((p) => p.species)),
    crosses: counted((ofGenus.length ? ofGenus : live).map((p) => p.cross)),
    cultivars: counted(ofSpecies.map((p) => p.cultivar)),
  };
}

/** A genus, species or cultivar on the list, with how many plants carry it. */
function nameRow(usage: Usage, current: string, italic: boolean) {
  return {
    key: usage.name,
    value: usage.name,
    italic,
    meta: plantCount(usage.count),
    selected: usage.name.toLowerCase() === current.trim().toLowerCase(),
  };
}
