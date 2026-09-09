---
name: Florarithm
description: A plant logbook opened by tapping the tag on the pot.
colors:
  paper: "light-dark(oklch(0.968 0.008 85), oklch(0.19 0.008 80))"
  surface: "light-dark(oklch(0.995 0.003 85), oklch(0.238 0.009 80))"
  sunk: "light-dark(oklch(0.944 0.01 85), oklch(0.155 0.008 80))"
  line: "light-dark(oklch(0.886 0.01 80), oklch(0.322 0.01 80))"
  line-strong: "light-dark(oklch(0.8 0.012 80), oklch(0.405 0.012 80))"
  ink: "light-dark(oklch(0.255 0.014 65), oklch(0.945 0.008 85))"
  ink-muted: "light-dark(oklch(0.51 0.014 68), oklch(0.735 0.012 80))"
  ink-faint: "light-dark(oklch(0.655 0.012 72), oklch(0.575 0.012 78))"
  leaf: "light-dark(oklch(0.455 0.098 152), oklch(0.76 0.11 152))"
  leaf-tint: "light-dark(oklch(0.944 0.026 152), oklch(0.3 0.04 152))"
  leaf-deep: "light-dark(oklch(0.405 0.098 152), oklch(0.815 0.11 152))"
  water: "light-dark(oklch(0.455 0.104 236), oklch(0.76 0.105 236))"
  water-tint: "light-dark(oklch(0.944 0.028 236), oklch(0.305 0.042 236))"
  water-deep: "light-dark(oklch(0.405 0.104 236), oklch(0.815 0.105 236))"
  ember: "light-dark(oklch(0.52 0.13 47), oklch(0.79 0.12 47))"
  ember-tint: "light-dark(oklch(0.948 0.034 47), oklch(0.322 0.048 47))"
  ink-deep: "light-dark(oklch(0.185 0.014 65), oklch(0.985 0.008 85))"
  on-accent: "light-dark(oklch(0.985 0.004 85), oklch(0.18 0.01 80))"
  scrim: "light-dark(oklch(0.255 0.014 65 / 0.45), oklch(0.12 0.008 80 / 0.62))"
  floating: "light-dark(oklch(0.995 0.003 85 / 0.9), oklch(0.238 0.009 80 / 0.9))"
  veil-strong: "light-dark(oklch(0.968 0.008 85 / 0.95), oklch(0.19 0.008 80 / 0.95))"
typography:
  display:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "2.125rem"
    fontWeight: 500
    lineHeight: "2.375rem"
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: "1.8125rem"
  heading:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: "1.375rem"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1rem"
    letterSpacing: "0.09em"
  metric:
    fontFamily: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "1.375rem"
    fontWeight: 500
    lineHeight: "1.5rem"
  code:
    fontFamily: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: "1rem"
    letterSpacing: "0.08em"
  micro:
    fontFamily: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "0.75rem"
    lineHeight: "1rem"
rounded:
  sm: "4px"
  md: "6px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  touch: "2.75rem"
  control: "3rem"
  primary: "4rem"
motion:
  ease-grow: "cubic-bezier(0.2, 0.8, 0.24, 1)"
  hover: "200ms"
components:
  button-primary:
    backgroundColor: "{colors.water}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: "0 1.5rem"
    height: "{spacing.primary}"
  button-accent:
    backgroundColor: "{colors.leaf}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
  button-outline:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
  button-tinted:
    backgroundColor: "{colors.water-tint}"
    textColor: "{colors.water}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
  chip-filter:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    height: "2.25rem"
  chip-choice:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    height: "{spacing.touch}"
  input-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "{spacing.control}"
    padding: "0 0.875rem"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    border: "{colors.line}"
  card-empty-state:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    border: "{colors.line}"
    padding: "1.75rem 1.25rem"
  nav-item-sidebar:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    height: "{spacing.touch}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
---

# Design System: Florarithm

Derived from the shipped app — `src/styles.css` holds every token, `src/ui/`
holds every component. Where this document and the code disagree, the code is
right and this document is the bug.

## Overview

**Creative North Star: "The Specimen Ledger, on warm paper"**

Florarithm reads like a herbarium record card: names set in a serif the way a
specimen label sets them, and everything a machine recorded — codes, dates, day
counts — set in mono so columns of figures line up without effort. It is quiet
by default so that the one fact worth noticing (a plant is thirsty, an entry is
logged) is the only thing that speaks.

The system started as a strict ledger — square corners everywhere, no shadows at
all — and softened deliberately as the app grew. Cards group the plant page
rather than hairlines, so corners are rounded (12px, 16px) where a 4px corner on
a padded card read as a mistake. Round shapes are now common rather than a single
exception. Shadows exist, but only ever for something genuinely off the page:
something floating over a photograph, a menu, a toast, and the pressed state of a
filled button. Nothing resting on paper casts one.

Colour is ink applied for meaning, never decoration: leaf and water sit at the
same lightness and chroma so neither competes, and ember is the only colour
allowed to be louder, because a warning exactly as loud as everything else has
stopped being a warning.

**Key Characteristics:**
- Serif for what a person named; mono for what a machine recorded.
- One saturated colour per meaning, never colour for its own sake.
- Warm, low-chroma parchment neutrals rather than true grey or true white.
- Flat on paper; shadow only for what is actually above the page.
- Every interactive element answers a pointer, and the answer always deepens.
- One markup for phone and desktop, split by breakpoint alone.

## Colors

A restrained warm-neutral palette (hue ~65–85, chroma ≤ 0.014) carries the page;
three saturated hues each own exactly one meaning, and nothing else may use them.

### Primary
- **Deep Water Blue** (`water`): the WATER action and anything meaning hydration
  — the only filled, saturated colour on the plant screen.

### Secondary
- **Deep Moss Green** (`leaf`): growth and additive actions — adding a plant,
  the active navigation stop, checkmarks, the focus ring. Deliberately the same
  lightness and chroma as water so the two never compete.

### Tertiary
- **Warm Ember** (`ember`): warnings and the one thing that must read as more
  urgent than what surrounds it — data-loss risk, a broken sync, danger actions,
  and a plant past its usual watering gap. The only accent with higher chroma.

### Neutral
- **Parchment Paper** (`paper`): the page ground.
- **Warm Surface** (`surface`): cards, sheets, inputs, both navigations.
- **Sunk Parchment** (`sunk`): a hovered or pressed row, and the ground behind a
  photograph that has not loaded.
- **Hairline** (`line`) / **Hairline Strong** (`line-strong`): dividers and
  borders, in that order of emphasis.
- **Ink** / **Ink Muted** / **Ink Faint**: primary, secondary and tertiary text.

### The three families every accent carries
- **`-tint`** — the same hue stepped away from the ink: a filled-but-quiet
  ground for "this already happened", a selected filter, a warning banner.
- **`-deep`** — the same hue stepped *towards* the ink, for hover. Light mode
  darkens, dark mode brightens: a hovered filled control gains presence in both.
  `leaf-deep`, `water-deep` and `ink-deep` exist; ember has no `-deep` because
  the one hover on an ember surface fills with flat `ember` instead.
- **`on-accent`** — what text sits in on a filled accent, in either theme.

### Colours that carry their own transparency
`scrim` (behind a sheet, the fan and the overflow menu), `floating` (a chip or
button laid over a photograph) and `veil-strong` (the QR overlay on the plant
hero) bake their alpha into the token rather than using an opacity modifier.
Two reasons, both load-bearing: an opacity modifier on `ink` produced a *pale*
scrim in dark mode, which is the opposite of what a scrim is for; and Tailwind
compiles a modifier to `color-mix()`, whose inner `light-dark()` is not
recomputed when the colour scheme changes under an already-open page.

### Dark mode
Every colour is one declaration carrying both themes via `light-dark()`, read
against a `color-scheme` set once at `:root`. `[data-theme='light'|'dark']` pins
it; nothing in the app sets that yet. No component branches on theme, and there
is no second copy of the palette to forget to update.

### Named Rules
**The One Loud Colour Rule.** Only `ember` sits at a visibly higher chroma than
its siblings. Every other accent matches `leaf` and `water`'s lightness and
chroma exactly, so urgency is never implied by a colour choice alone.

**No Colour Outside the Tokens.** `@theme` clears Tailwind's stock palette with
`--color-*: initial`, so `bg-red-500` does not exist. A design system you can
step around is a suggestion.

## Typography

**Display Font:** Newsreader — a true variable font, one file per subset, weight
axis 200–800, self-hosted from `src/assets/fonts/` rather than fetched from
Google.
**Body Font:** system-ui (SF / Segoe), matching the OS rather than branding the
chrome.
**Mono Font:** IBM Plex Mono, self-hosted at 400/500/600, with `tabular-nums`
forced on wherever `font-mono` appears.

**Character:** a specimen-label serif for anything a person named, against an
invisible native sans for interface chrome and a mono for anything a machine
produced. The pairing tells you, without a label, whether you are looking at
what someone wrote or what the system recorded.

### Hierarchy
- **Display** (500, 2.125rem/2.375rem, −0.015em): screen titles, in the serif.
- **Title** (500, 1.5rem/1.8125rem): sheet and panel titles.
- **Heading** (600, 1.0625rem/1.375rem): sub-section headings.
- **Body** (400, 1rem/1.5rem): all copy and every form control — never smaller,
  or Safari zooms on focus and never zooms back out.
- **Label** (600, 0.75rem/1rem, 0.09em, uppercase): field labels, eyebrows,
  table column heads.
- **Metric** (500, 1.375rem/1.5rem, mono): the one number that matters on a row
  — days since water.
- **Code** (500, 0.8125rem/1rem, 0.08em, mono): plant codes and short machine
  strings.
- **Micro** (0.75rem/1rem, mono in practice): a count beside a chip, a date at
  the end of a history row.

Screens also set one-off sizes with arbitrary values — a plant's own name at
2.5rem, a sheet title at 1.625rem, a `Section` heading at 1.3125rem. These are
deliberate optical adjustments on top of the ramp, always in the serif and always
at weight 500; they are not a second ramp.

### Named Rules
**The Specimen Label Rule.** A plant's own name is always Newsreader. So is any
title that names a screen or a sheet, and a `Section` heading — because a heading
in `text-label uppercase` sitting above more `text-label uppercase` is a heading
you have to work out rather than see. Everything else is the interface sans or
the mono.

## Layout

Phone and desktop share one markup; layout differs only by Tailwind breakpoint
(`md` 768px, `lg` 1024px), never by a JavaScript viewport check — no flash of the
wrong layout, and the two cannot drift apart.

- Navigation is a bottom tab bar below `md`, a `15.5rem` left sidebar from `md`.
- Content sits in a `max-w-5xl` centred column: `px-4 pt-6 pb-32` on phone (the
  bottom padding clears the fixed tab bar), `px-10 pt-8 pb-12` from `md`.
- Lists are hairline-divided row stacks on phone and gain real table columns
  (species, system, pot size, price) at `lg` — the same component, more columns.
- The collection is a photo grid on a phone and a table with 40px thumbnails on
  a desktop, both reading the plant's picture through the same helper.
- The plant page runs its two tabs (Care, History) below `lg` and puts them side
  by side above it, where the facts that never change also appear.
- `safe-bottom` adds `env(safe-area-inset-bottom)` on top of resting padding
  rather than instead of it, so a phone with no home indicator still has margin.

## Elevation & Depth

Depth comes first from a one-step lightness change — `surface` above `paper`,
`sunk` below it — plus hairline borders. Shadow is reserved for things that are
genuinely above the page, and the scale reads as distance:

### Shadow Vocabulary
- **`shadow-sm`** — hover only, never at rest: a filled button under the cursor,
  a plant tile the pointer is over. It is the pressed-away-from-paper half of the
  `lift`, not a resting elevation.
- **`shadow-md`** — a control laid over a photograph (the back button, the QR
  button, the place chip on the plant hero), which needs separation from an
  image it cannot predict. Steps to `shadow-lg` on hover.
- **`shadow-lg`** — genuinely floating and temporary: the drop and its fanned
  options, the toast.
- **`shadow-xl`** — a menu panel that has opened over the page: the split
  button's caret menu, the wishlist overflow menu.

### Named Rules
**Nothing on paper casts a shadow.** Cards, sheets, banners, rows, inputs and
navigation are flat at rest, in both themes. If something has a shadow it is
either over a photograph, over the page, or under a pointer.

## Shapes

Four steps plus round: 4px (`sm`, inputs, badges, checkboxes), 6px (`md`,
buttons, nav stops, banners), 12px (`lg`, calendar days, the empty state), 16px
(`xl`, cards, sheets on desktop, menu panels, plant tiles). A phone sheet is
1.625rem and the plant page's record shelf 1.75rem — full-bleed edges that sit a
step above `xl` because they meet the screen edge rather than sitting on paper.

`rounded-full` is the app's most common radius, not an exception: chips, the
toggle track and knob, icon chips, circular icon buttons, the sheet grabber, the
drop and its options, the tab bar's action disc, the toast, and every splash
ring. What it means is consistent — **a round thing is a control or a mark, not
a container that holds data.**

### Named Rules
**Round is for controls, corners are for containers.** Anything that holds or
writes a value — a field, a card, a row, a panel — keeps a corner. Anything you
press, choose, or that marks a moment may be round.

## Motion

One curve for the whole app: `--ease-grow`, `cubic-bezier(0.2, 0.8, 0.24, 1)` —
quick off the mark, long settle. Nothing springs and nothing overshoots.
Every animation below is dropped or reduced under `prefers-reduced-motion`.

### The two hovers
- **`lift`** (200ms) — what everything pressable does: the colour change, plus
  one pixel towards the light. `:active` puts it back down under the finger, and
  a disabled control never rises. One shared utility rather than four repeated
  ones, so a button, a chip and a tile read as one material.
- **`warm`** (200ms) — colour, background and border only, no rise. For rows,
  menu items and nav stops: a hundred of them rising under a travelling cursor
  is weather, not feedback. Same curve, same duration, so the app keeps one
  sense of time.

The colour change is the state; the rise only ornaments it. Under reduced motion
the rise is dropped and the hover still reads.

### Entrances
Everything that covers the page arrives rather than appears, each from where it
actually comes from — `veil-in` (220ms) for a scrim fading in place, `rise-in`
(280ms) for a sheet coming off the edge it is attached to, `panel-in` (190ms) for
a menu or a centred desktop sheet scaling up a hair from its own corner. These
are entrances only: closing unmounts, so there is nothing left to animate out.

### The splash (signature motion)
Watering answers with a handful of drops thrown outward from the button that was
pressed, plus a ring spreading past it. The drops are redrawn on every press —
a splash that lands identically stops being a splash and becomes an icon of one,
and this button is pressed every day — bounded so every drop clears the button's
edge and weighted upward, because thrown water goes up first. On a phone the
mark opens where the thumb actually landed, not on the drop that opened the fan.
The drop itself turns `leaf` and shows a checkmark while the mark is up, saying
the same thing the record will.

## Components

Restrained and precise: flat on paper, colour spent only where it carries
meaning, and a filled-but-quiet "already done" state instead of a louder
confirmation. Nothing raises its voice except the one colour that is supposed to.

### Buttons (`ui/Button.tsx`)
Seven variants, three sizes, all `rounded-md`.

- **Primary** (`water`): the WATER action — `h-primary` (64px), full width.
- **Accent** (`leaf`): additive actions — add a plant, add a note.
- **Solid** (`ink` on `paper`): what commits a sheet you opened to do one thing
  — "Use this date", "Save note", "Log repot". Ink, because none of those is a
  watering or an addition.
- **Outline:** transparent, `line-strong` border, `ink` text — the default.
- **Tinted** (`water-tint` / `water`): already done, and it does not start
  shouting on hover either — the ground holds and only the mark deepens.
- **Quiet:** transparent, `ink-muted`, no border — the lowest emphasis on a
  screen.
- **Danger:** transparent with an `ember` border and text; fills `ember-tint`.

**Sizes** map onto the reach rule: `lg` `h-primary` (64px, always full width),
`md` `h-control` (48px), `sm` `h-touch` (44px) — the floor. There is no size
below it, which is why a filter chip is a different component.

**States:** hover deepens (`-deep` for a fill, `sunk` ground for an outline or
quiet one) and never fades — `opacity` dims the label with the ground and reads
as disabled. Press is `active:opacity-70`; focus is a 2px `leaf` ring, offset.
Disabled is `opacity-40` with pointer events removed, never a separate palette.

**`IconButton`** is the same variants at `size-control`, square, and requires a
label. **`BackButton`** is a round 40px arrow in two renderings: `chip`
(`floating` ground, `shadow-md`) over a photograph, `bare` on paper. It falls
back to Collection when there is no history — arriving by sticker opens a fresh
tab, and a back button that does nothing is worse than none.

### Chips (`ui/Chip.tsx`)
Fully round, two kinds whose difference is stakes, not decoration:
- **`filter`** (36px) narrows a list. Below the reach floor on purpose — a
  mis-tap changes what you are looking at and nothing else. Unselected is a
  `line-strong` outline; selected is solid `ink` on `paper`.
- **`choice`** (44px) picks a value that gets written down, so it obeys the
  floor. Selected is solid `water` on `on-accent`.

`ChipStrip` scrolls rather than wraps, so the list below never jumps a row.
`SortSwitch` is the shared sort control — Collection and Today sort the same
plants, and a switch that looked different on the two would read as two controls.

### Cards and containers
- **`Card`** — `rounded-xl`, `surface`, `line` border, no shadow. The plant page
  groups by card rather than hairline: a run of label/value rows all weighing the
  same is what made it unreadable.
- **`IconChip`** — a round tinted or filled disc leading a row inside a card.
  One tone per meaning: `water` the action, `leaf` the plant, `ink` bookkeeping.
  Tinted in a list, filled for something you press.
- **`EmptyState`** — `rounded-lg`, `surface`, `line`, `px-5 py-7`. Never a blank
  page: an empty collection is a state, not an error, and it says what to do next.
- **`Sheet`** — rises from the bottom edge on a phone (`1.625rem` top corners,
  `line` top border) and becomes a centred `rounded-xl` panel from `md`. Grabber,
  centred serif title, close on the right and an optional back on the left so the
  title stays put while the sheet swaps its contents. Escape closes it, the page
  behind stops scrolling, and a `scrim` with a blur separates it — not a shadow.

### Inputs and fields (`ui/fields.tsx`)
Every control shares one face: `surface` ground, `line-strong` 1px border,
`rounded-sm`, `h-control` (48px), `text-body` (16px). Hover firms the border to
`ink-faint`, focus turns it `leaf` with no glow or ring on the field itself.

`TextField`, `SuggestField` (a `<datalist>` over a growing list — what you typed
for the first plant is there to pick for the second), `NumberField` (mono, with
its unit inside the field so the value stays numeric), `TextAreaField` (the one
control that is not `h-control`), `SelectField`, `SearchField`, and:
- **`SegmentedField`** — options divided by a single hairline; the selected one
  is solid `ink` on `paper`.
- **`ToggleField`** — a 52px track, `leaf` on and `line-strong` off, with the
  whole label row as the hit target. The knob translates rather than swapping
  justification, so it moves with the colour instead of arriving before it.
- **`CheckField`** — a 24px `rounded-sm` box, `water` when checked.

**`DatePickerField`** and the log sheet's **`DateChip`** open the same calendar:
Today/Yesterday chips, a Monday-first mono grid, future days visible but
unreachable, committed by a `solid` button. One picker everywhere — the form used
to hand this to `<input type="date">` and the operating system, which looked like
nothing else in the app.

### Rows and tables (`ui/rows.tsx`)
`RowLink` (a whole-row link, `min-h-touch`, `sunk` on hover) and `Row` for one
that is not. `Cell` is a single column carrying its width and breakpoint as
placement classes; `ColumnHeader` is the uppercase label row above a desktop
table. `DrawerLabel` draws a place as a drawer in a cabinet — the name, a
hairline running out to a mono count, no box.

**`SwipeRow`** is how a history entry is corrected: drag left for Delete, right
for Edit, the gesture Mail already taught. From `md` up the drag turns off and
the same two actions appear on hover or focus instead — the two ways never
overlap.

### Navigation (`layout/AppShell.tsx`)
- **Sidebar (`md`+):** `surface`, `line` right border, the wordmark in the serif,
  five stops with mono counts. Active is `leaf-tint` ground with `leaf` semibold
  text; inactive is `ink-muted` warming to `sunk`. The sync line sits at the foot
  unless Settings is showing its own.
- **Bottom tab bar (phone):** `surface`, `line` top border, `safe-bottom`. Active
  is `leaf`, inactive `ink-faint`. "New plant" is the one action on a bar of
  destinations, drawn as a filled `leaf` disc that cuts the bar's own hairline so
  it reads as a button rather than a fifth place to be.

### The drop (signature component)
- **Phone (`ui/ActionDial.tsx`):** a 64px `water` drop fixed in the corner a
  thumb rests in, which never scrolls away. Tapping it fans three options on a
  quarter arc *around* it rather than stacking them above: watered (at the drop's
  own size, holding the middle of the arc), watered with fertiliser, and
  everything else. No labels — colour and glyph carry it, and three is few enough
  to learn once. `scale` and `translate` only, so it stays smooth on a phone.
- **Desktop (`ui/SplitButton.tsx`):** the same three things as a split button on
  the title row. A thumb rests near a screen's corner; a pointer does not, and a
  button pinned to the corner of a wide window drifts away from the record it
  belongs to. One click waters, the caret reaches the rest. Both segments deepen
  independently but the whole pill rises as one piece — half a pill lifting reads
  as broken.

### Banner, sync status, confirm, toast
- **`Banner`** — a line that stays until the thing it asks for is done, and is
  deliberately not dismissible: something you can tap away, you tap away.
  `warning` is `ember` on `ember-tint`; `info` is `line` on `surface`.
- **`SyncStatusPill`** — four states on one line: synced, syncing, waiting
  offline, and the one that borrows the alarm colour because a person has to act.
  Its "Fix" link fills flat `ember` on hover rather than tinting — a tint on a
  tinted panel is a state nobody can see.
- **`useConfirm`** — every "are you sure" is a Sheet, because `window.confirm`
  is silently a no-op in an installed standalone PWA on iOS, and this app is
  meant to live on a home screen.
- **`ToastHost`** — a round `ink` pill with `shadow-lg`, above the tab bar on a
  phone and bottom-right on a desktop, gone after 2.6 seconds with nothing to
  dismiss. It confirms an action whose own screen has already navigated away, so
  it lives at the shell, the one thing that survives a route change. It is not an
  undo bar: a regrettable entry is corrected on the row it is written on, which
  survives a reload in a way a three-second bar does not.

### Plant imagery (`ui/Plate.tsx`, `ui/plantPicture.tsx`)
A plant with no photograph gets `Plate`, a drawn leaf in `line-strong` that fills
any box at any size — one grey rectangle is a gap, a dozen is a broken screen.
`PlantPicture` resolves the chosen photograph, else the newest, else the plate,
so a plant can never look like one thing in the grid and another in the table.
`PlantTile` is the phone grid card: `rounded-xl`, a 4:3 frame that clips its own
picture, and a hover that grows the photograph 3% over 500ms while the card holds
still — slower than every other hover here, so it reads as growing rather than
reacting. `PlantThumb` is the same picture at 40px in a desktop row.

### Icons (`ui/Icon.tsx`)
39 glyphs from Lucide (ISC), vendored as inline paths rather than added as a
fifth runtime dependency. One 24×24 grid, 1.8 stroke, round caps and joins,
`currentColor` throughout — an icon takes its colour from whatever it sits in and
never needs a colour prop. Names are ours (what the icon *means* here) with the
Lucide name noted above each, so a swap is a lookup rather than a redraw.

## Do's and Don'ts

### Do:
- **Do** put a plant's own name in Newsreader, and anything a machine produced —
  codes, dates, day counts — in IBM Plex Mono with tabular figures.
- **Do** keep `leaf` and `water` visually equal in weight; let `ember` alone
  carry extra urgency.
- **Do** deepen on hover, with `-deep` for a fill and `sunk` for an outline.
- **Do** reach for `lift` on something you press and `warm` on a row.
- **Do** use a `-tint` for a "this already happened" state instead of a second
  confirmation UI.
- **Do** keep every control that writes data at least 44px tall and every text
  input at 16px, full stop.

### Don't:
- **Don't** give a resting surface a shadow. A shadow means over a photograph,
  over the page, or under a pointer.
- **Don't** fade on hover. `opacity` dims the label with the ground and reads as
  disabled — the one state a control under the cursor must not be in.
- **Don't** round a container that holds data, and don't put a corner on a mark.
- **Don't** introduce a fourth saturated accent; every meaning in this app is
  already assigned to `leaf`, `water` or `ember`.
- **Don't** write a colour, size or radius that is not a token. Tailwind's stock
  palette is cleared; an arbitrary value should be an optical adjustment to the
  ramp, not a new step in it.
- **Don't** style a component with passed-in utility classes for anything but
  placement (margin, width, visibility) — look comes from `variant` / `size` /
  `tone` props only. `cn` joins rather than merges, so a passthrough class could
  not reliably win anyway.
