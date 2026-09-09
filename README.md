# Florarithm

A plant logbook you open by tapping the tag on the pot. Stick an NFC tag on a
plant, hold your phone against it, and the app opens on that plant with a drop
in the corner that never scrolls away.

Live at **https://mptrs.github.io/Florarithm/**

Everything is stored on your own device. There is no account, no server and no
database — and from M2 on, a private GitHub repository keeps two devices in
step without either of those things.

## What it does

- **A tag opens the plant.** The sticker carries `…/Florarithm/#p=MON-8F3A`,
  which lands on that plant with the actions already in view.
- **The drop logs a watering.** On a phone it sits in the corner a thumb rests
  in and never scrolls away; tapping it fans out three things: watered, watered
  with fertilizer, and everything else. No confirmation step — the water splashes
  and the entry is in. A desktop has no thumb, so the same three things become a
  split button on the plant's title row.
- Also logged: repotting (which updates the pot and medium of the plant
  itself), new leaves, blooming, and free notes — each of them datable, so the
  watering you forgot on Tuesday can still be recorded on Thursday.
- **A wrong entry is dragged away.** Pull a row left to delete it, right to
  edit it. There is no undo bar: the record is right there, so a correction
  happens where you can see it.
- **Wishlist.** Plants you want, in the same table as plants you have. "I have
  this now" flips one flag and keeps the code, the name and the date.
- **Family.** Cuttings and corms point at their parent, and the name generator
  continues the line — Fluweel, Fluweel II, Fluweel III — so the family tree
  reads without a diagram.
- **Photographs, as entries in the log.** A picture belongs to the thing that
  prompted it — the new leaf, the note, the day it was repotted — so it is a
  field on an event rather than a gallery of its own. The plant's picture is
  the newest one unless you pick another in the edit form; a plant without any
  keeps the drawn plate. The timeline is the history filtered to the entries
  that have one.
- **Backup.** One JSON file with everything, through the iOS share sheet into
  Files and so into iCloud Drive.
- **QR fallback.** Every plant page carries a QR code alongside its written
  code, for the day the NFC sticker gives up.

What it deliberately does **not** do is predict when a plant needs water. You
water on fixed days, so every measured gap lands on 7 or 14 and the app would be
predicting your calendar back at you. It shows the average with its spread,
looking backwards, and stops there.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173/Florarithm/
npm run build      # typecheck, then a static build into dist/
npm test           # Playwright: logic, then the app on WebKit and Chromium
```

Pushing to `main` runs the tests and, if they pass, deploys to GitHub Pages.

## How it is put together

```
src/
  lib/         no dependencies on anything else here
    plantCode  the code algorithm, straight from the Shortcut
    router     hash routing, because that is what a tag can carry
    image      downscaling a phone photo to something worth keeping
    date, format, nameGenerator, cn, id
  data/        the model and everything that touches storage
    types      the whole data model, in one file
    db         IndexedDB, one record at a time
    store      the in-memory snapshot and every mutation
    selectors  everything derived, computed and never stored
    photos     the photographs, read on demand and cached by event
    backup     export and import
  ui/          the design system as components (see DESIGN.md)
  layout/      the shell: tab bar on a phone, sidebar on a desktop
  screens/     one file per screen
```

The dependency direction is one-way: `screens` use `ui`, `data` and `lib`;
`ui` uses `lib`; `lib` uses nothing. Four runtime dependencies — React,
ReactDOM, `idb` and `qrcode-generator` — and no others. (`@mlc-ai/web-llm`
is a fifth in `package.json`, but it is only ever loaded through a dynamic
`import()`, so a build that never touches the AI name suggester never fetches
it.)

### Conventions worth knowing before you change something

**Never store a derived value.** Days since water, average rhythm, leaves this
year, collection value: all of it lives in `selectors.ts` and is computed at
render time. The moment one is written back into a record it can disagree with
the event log, and then there are two answers and no way to tell which is true.

**Events are append-only.** Deleting one sets `deleted: true` rather than
removing the row, because the sync in M2 merges by union and a forgotten row
comes straight back. The two flags an event can gain after the fact —
`deleted` and `photo` — both only ever go one way, which is what lets the merge
resolve them without a timestamp.

**A photograph is written before the entry that claims it.** The bytes go into
IndexedDB under an id drawn in advance, and only then is the event logged with
that id. The other order leaves a row promising a picture that never loads if
the write fails; this one leaves bytes nobody points at, which nobody can see.

**Every mutation a person could regret is reversible where it is visible.**
Nothing in `store.ts` hands back an undo closure: an entry is corrected or
removed from the row it is written on, which survives a reload in a way a
three-second bar does not — and, unlike a hard delete behind an undo bar, a
tombstone merges correctly with another device. What is left of the toast is a
confirmation for actions that navigate away before you can see the result.

**Colour, type, spacing and motion come from tokens.** `src/styles.css` clears
Tailwind's stock palette, so `bg-red-500` does not exist — every colour has to
be a token like `bg-water` or `text-ink-muted`. Each one carries both themes in
a single `light-dark()` declaration read against the root's `color-scheme`, so
there is no second copy of the palette to forget and no component knows which
theme is on. Hover has its own tokens (`-deep`) and its own two utilities
(`lift` for anything pressable, `warm` for a row), both on the app's one curve,
`--ease-grow`. `DESIGN.md` is the full system.

**Components choose their look with variant props, never with passed-in
utilities.** `className` is for placement only — margin, width, `hidden md:block`.
Utility conflicts are resolved by CSS order rather than class order, so a
passthrough could not reliably override anything anyway. See `lib/cn.ts`.

**One markup, two layouts.** Phone and desktop differ by breakpoint, not by a
JavaScript viewport check: columns appear at `lg`, the sidebar replaces the tab
bar at `md`. Nothing to keep in sync and no flash of the wrong layout.

**Anything that writes data is at least 44px tall.** Filter chips are the single
documented exception at 36, because a mis-tap there changes a filter rather than
a record. Inputs never go below 16px, or Safari zooms the page in on focus and
never zooms back out.

**Nothing resting on paper casts a shadow.** Cards, sheets, banners, rows,
inputs and both navigations are flat. A shadow means the thing is over a
photograph, over the page, or under a pointer — see Elevation in `DESIGN.md`.

## Writing a tag

1. Add the plant. It gets a code like `MON-8F3A`.
2. On the plant page, tap the code in the top corner to copy its link.
3. Paste it into NFC Tools and write the sticker.
4. Write the code on the pot in marker too, and print the QR code alongside
   it — both outlast the sticker.

The app cannot write tags itself: that needs the Web NFC API, which only exists
in Chrome on Android. Reading works everywhere, because the tag just holds a URL.

## Where this is going

- **M1 — done.** Everything above, on one device.
- **M2 — done.** A private repository holding `plants.json`, one
  `events/YYYY-MM.json` per month and `meta.json`, merged with a pure function
  and pushed with a fine-grained token. Sync doubles as the backup.
- **M3 — done.** A QR code on the plant page as a fallback for a dead sticker,
  behind the overflow menu. Photographs attached to log entries, capped at a
  1600px JPEG on the way in, kept in their own IndexedDB store and synced to
  the same private repository as `photos/YYYY-MM/<event id>.jpg` — one file
  each, next to the log that describes them. They are still out of the backup
  file, which stays a single readable JSON.
- **M4 — later.** A family tree over several generations, pests with repeat
  treatments, achievements.
