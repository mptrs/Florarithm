---
name: Florarithm
description: A plant logbook opened by tapping the tag on the pot.
colors:
  paper: "oklch(0.968 0.008 85)"
  surface: "oklch(0.995 0.003 85)"
  sunk: "oklch(0.944 0.01 85)"
  line: "oklch(0.886 0.01 80)"
  line-strong: "oklch(0.8 0.012 80)"
  ink: "oklch(0.255 0.014 65)"
  ink-muted: "oklch(0.51 0.014 68)"
  ink-faint: "oklch(0.655 0.012 72)"
  leaf: "oklch(0.455 0.098 152)"
  leaf-tint: "oklch(0.944 0.026 152)"
  water: "oklch(0.455 0.104 236)"
  water-tint: "oklch(0.944 0.028 236)"
  ember: "oklch(0.52 0.13 47)"
  ember-tint: "oklch(0.948 0.034 47)"
  on-accent: "oklch(0.985 0.004 85)"
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
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
  full: "9999px"
spacing:
  touch: "2.75rem"
  control: "3rem"
  primary: "4rem"
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
  chip-filter-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    height: "2.25rem"
  input-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "{spacing.control}"
    padding: "0 0.875rem"
---

# Design System: Florarithm

## Overview

**Creative North Star: "The Specimen Ledger"**

Florarithm reads like a herbarium record card crossed with an accounting ledger: square-cornered, typed rather than drawn, and quiet by default so that the one fact worth noticing — a plant is thirsty, a task is done — is the only thing that speaks. Names are set in a serif, like a specimen label; everything a machine produced (codes, dates, day counts) is set in mono so columns of numbers line up without effort. Color is treated as ink applied for meaning, not decoration: leaf and water sit at the same lightness and chroma so neither competes with the other, and warmth (ember) is the only color allowed to be louder, because a warning that is exactly as loud as everything else has stopped being a warning.

The system rejects anything that reads as playful, glossy, or gamified. There are no gradients, no drop shadows on resting surfaces, no rounded-everything softness — chips are the sole exception, and that exception is meaningful (see Shapes). Density and warmth come from a slightly warm, low-chroma paper tone rather than from ornament.

**Key Characteristics:**
- Square-ish, ledger-like forms; roundness is reserved for chips alone.
- Serif for what a person named; mono for what a machine recorded.
- One saturated color per meaning, never color for its own sake.
- Flat at rest; the only shadow in the system belongs to an ephemeral toast.
- Warm, low-chroma parchment neutrals rather than true gray or true white.

## Colors

A restrained, warm-neutral palette (hue ~65–85, chroma ≤0.014) carries the page; three saturated hues each own exactly one meaning, and nothing else is allowed to use them.

### Primary
- **Deep Water Blue** (`oklch(0.455 0.104 236)`, token `water`): the WATER action and anything meaning "hydration" — the only filled, saturated color on the plant screen.

### Secondary
- **Deep Moss Green** (`oklch(0.455 0.098 152)`, token `leaf`): growth and additive actions — adding to the collection, active navigation state, checkmarks. Deliberately the same lightness and chroma as Water so the two never compete for attention.

### Tertiary
- **Warm Ember** (`oklch(0.52 0.13 47)`, token `ember`): warnings and the one thing that must read as more urgent than everything around it — data-loss risk, danger actions. The only accent with intentionally higher chroma.

### Neutral
- **Parchment Paper** (`oklch(0.968 0.008 85)`, token `paper`): the page ground.
- **Warm Surface** (`oklch(0.995 0.003 85)`, token `surface`): raised panels, cards, sheets, inputs.
- **Sunk Parchment** (`oklch(0.944 0.01 85)`, token `sunk`): pressed/active row background.
- **Hairline** (`oklch(0.886 0.01 80)`, token `line`) / **Hairline Strong** (`oklch(0.8 0.012 80)`, token `line-strong`): dividers and borders, in that order of emphasis.
- **Ink** (`oklch(0.255 0.014 65)`, token `ink`) / **Ink Muted** (`oklch(0.51 0.014 68)`) / **Ink Faint** (`oklch(0.655 0.012 72)`): primary, secondary, and tertiary text, in that order.

Every color has a `-tint` sibling at the same hue (e.g. `water-tint`) for a filled-but-quiet state — "already done," a selected filter, a warning banner background — without repeating the fully saturated color.

Dark mode remaps every token above to the same names at inverted lightness; no component ever branches on theme.

### Named Rules
**The One Loud Color Rule.** Only `ember` is allowed to sit at a visibly higher chroma than its siblings. Every other accent is tuned to match `leaf` and `water`'s lightness and chroma exactly, so urgency is never accidentally implied by a color choice alone.

## Typography

**Display Font:** Newsreader (serif), with Georgia / Times New Roman fallback
**Body Font:** system-ui (native SF/Segoe), matching the OS rather than branding the chrome
**Mono Font:** IBM Plex Mono, with tabular figures forced on everywhere it's used

**Character:** A specimen-label serif for anything a person named (a plant, a screen title) against an invisible, native sans for interface chrome and a mono for anything a machine produced. The pairing is the whole point: it tells you, without a label, whether you're looking at what someone wrote or what the system recorded.

### Hierarchy
- **Display** (500, 2.125rem/2.375rem, -0.015em tracking): screen titles, in the serif.
- **Title** (500, 1.5rem/1.8125rem): sheet and section titles.
- **Heading** (600, 1.0625rem/1.375rem): sub-section headings.
- **Body** (400, 1rem/1.5rem): all copy and form input text — never smaller, or Safari zooms on focus and never zooms back out.
- **Label** (600, 0.75rem/1rem, 0.09em tracking, uppercase): field labels and section eyebrows.
- **Metric** (500, 1.375rem/1.5rem, mono): the single most important number on a row (days since water).
- **Code** (500, 0.8125rem/1rem, 0.08em tracking, mono): plant codes and other short machine strings.

### Named Rules
**The Specimen Label Rule.** A plant's own name is always set in Newsreader; nothing else in the interface is. If it's a name someone gave a living thing, it gets the serif — everything else, including a screen title for a non-plant screen, uses the interface sans or mono instead.

## Layout

Phone and desktop share one markup; layout differs only by Tailwind breakpoint, never by a JavaScript viewport check, so there is no flash of the wrong layout and the two can't drift apart. Navigation is a bottom tab bar below `md`, a `15.5rem`-wide left sidebar from `md` up. Main content sits in a `max-w-5xl` centered column with `px-4`/`pt-6` on phone growing to `px-10`/`pt-8` on desktop, and `pb-32` on phone to clear the fixed tab bar. Lists are hairline-divided row stacks on phone; the same rows gain explicit table columns (species, system, pot size, price) on desktop rather than becoming a different component.

## Elevation & Depth

The system is flat by default: resting surfaces (cards, sheets, banners, rows) carry no shadow at all — depth comes from a one-step lightness change (`surface` sitting just above `paper`, `sunk` just below it) and hairline borders, never from a cast shadow. The single exception is the undo toast, which is genuinely floating and temporary, and is the only element in the app allowed a shadow.

### Shadow Vocabulary
- **Floating** (`shadow-lg`, Tailwind default): the undo toast only — an element that is deliberately not part of the page's resting layout.

### Named Rules
**The Flat-By-Default Rule.** If it's still on screen a second from now, it has no shadow. Shadows are reserved for things that are about to disappear.

## Shapes

Square-ish corners throughout — 4px (`sm`, badges), 6px (`md`, buttons/inputs/cards), 10px (`lg`, larger panels) — deliberately reading as a ledger rather than a soft app UI. Chips are the one fully round (`rounded-full`) element in the whole system, and that exception is load-bearing: it's how a chip visually announces "this is a filter or a choice, not a data field or an action button" before you read a single word on it.

### Named Rules
**The One Round Thing Rule.** Full roundness is reserved for chips. If a new component needs to feel selectable-and-transient the way a chip does, it can round fully; anything that holds or writes data stays square-ish.

## Components

Components should read as restrained and precise: flat at rest, color spent only where it carries meaning, and a filled-but-quiet "already done" state (the `tinted` variant) instead of a louder confirmation. Nothing raises its voice except the one saturated color that's supposed to.

### Buttons
- **Shape:** 6px radius (`rounded-md`), same as every other control.
- **Primary** (`water`, on-accent text): the single WATER action per plant — full width, 64px tall (`primary` spacing), the loudest primary that exists.
- **Accent** (`leaf`, on-accent text): additive actions (add plant, add note), 48px tall.
- **Outline:** transparent fill, `line-strong` border, `ink` text — the default, unopinionated button.
- **Tinted** (`water-tint` bg, `water` text): a filled state that has already happened and doesn't need to shout about it.
- **Quiet:** transparent, `ink-muted` text, no border — the lowest-emphasis action on a screen.
- **Danger:** transparent, `ember` border and text.
- **Hover / Focus:** no hover-darken; `active:opacity-70` on press, a 2px `leaf`-colored focus-visible ring offset from the control.
- **Disabled:** `opacity-40`, pointer-events removed — never a separate disabled palette.

### Chips
- **Style:** fully round, two kinds — `filter` (36px, unselected: transparent + `line-strong` border) and `choice` (44px, meets the touch floor because it writes data).
- **Selected state:** `filter` selected → solid `ink` fill with `paper` text; `choice` selected → solid `water` fill with `on-accent` text. The two selected colors are different on purpose, matching each kind's stakes.

### Cards / Containers (Empty State, Sheet panel)
- **Corner Style:** 10px (`lg`) for the empty-state card; a sheet is `rounded-t-[14px]` on phone (14px, sitting just above the `lg` step because it's a full-bleed edge) and `rounded-lg` from `md` up.
- **Background:** `surface`.
- **Shadow Strategy:** none at rest (see Elevation & Depth); a sheet's separation comes from a `line` border plus a `bg-ink/45` scrim behind it, not a shadow on the sheet itself.
- **Border:** `line` (empty state), `line` top border only (phone sheet), full `line` border (desktop sheet).
- **Internal Padding:** `px-5 py-7` (empty state); `px-4 pt-2.5 pb-6` phone / `px-6` desktop (sheet).

### Inputs / Fields
- **Style:** `surface` background, `line-strong` 1px border, 6px (`sm`) radius, 48px tall (`control`), 16px (`body`) text — never smaller, to avoid iOS Safari's zoom-on-focus.
- **Focus:** border shifts to `leaf`, no glow or outline ring on the field itself.
- **Segmented field:** selected option gets solid `ink` fill with `paper` text, siblings divided by a single hairline.
- **Toggle:** a 32px track, `leaf` when on, `line-strong` when off — the whole label row is the hit target, not just the switch.

### Navigation
- **Sidebar (`md`+):** `surface` background, `line` right border, active item gets `leaf-tint` fill with `leaf` text and semibold weight; inactive items are `ink-muted` with an `sunk`-tint hover.
- **Bottom tab bar (phone):** `surface` background, `line` top border, active icon+label in `leaf`, inactive in `ink-faint`.
- **Icons:** one 24×24 stroke set, `currentColor` throughout, drawn inline rather than pulled from a font — recolors and rescales with whatever it sits inside.

### Undo Toast (signature component)
The one component allowed to float: `ink` background, `paper` text, `shadow-lg`, fixed above the tab bar. It exists because logging is one tap with no confirmation — every regrettable action must have a way back, and the toast is that way back made visible.

## Do's and Don'ts

### Do:
- **Do** put a plant's own name in Newsreader and machine-produced data (codes, dates, day counts) in IBM Plex Mono with tabular figures.
- **Do** keep `leaf` and `water` visually equal in weight; let `ember` alone carry extra urgency.
- **Do** use a `-tint` color for a "this already happened, calm down" state instead of a second confirmation UI.
- **Do** keep every control that writes data at least 44px tall (`touch`) and every text input at 16px, full stop.

### Don't:
- **Don't** add a shadow to anything that stays on screen — shadows are reserved for the undo toast alone.
- **Don't** round anything fully except chips; a rounded data field or button reads as off-system.
- **Don't** introduce a fourth saturated accent color; every meaning in the app is already assigned to `leaf`, `water`, or `ember`.
- **Don't** style a component with passed-in utility classes for anything but placement (margin, width, visibility) — look comes from `variant`/`size`/`tone` props only.
