# Florarithm

A plant logbook you open by tapping the tag on the pot. Stick an NFC tag on a
plant, hold your phone against it, and the app opens on that plant with one
button: **WATER**.

Live at **https://mptrs.github.io/Florarithm/**

Everything is stored on your own device. There is no account, no server and no
database — and from M2 on, a private GitHub repository keeps two devices in
step without either of those things.

## What it does

- **A tag opens the plant.** The sticker carries `…/Florarithm/#p=MON-8F3A`,
  which lands on that plant with the actions already in view.
- **One tap logs a watering**, with no confirmation and always an undo.
- Also logged: fertilizer, repotting (which updates the pot and medium of the
  plant itself), new leaves, blooming, and free notes.
- **Wishlist.** Plants you want, in the same table as plants you have. "I have
  this now" flips one flag and keeps the code, the name and the date.
- **Family.** Cuttings and corms point at their parent, and the name generator
  continues the line — Fluweel, Fluweel II, Fluweel III — so the family tree
  reads without a diagram.
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
    date, format, nameGenerator, cn, id
  data/        the model and everything that touches storage
    types      the whole data model, in one file
    db         IndexedDB, one record at a time
    store      the in-memory snapshot and every mutation
    selectors  everything derived, computed and never stored
    backup     export and import
  ui/          the design system as components
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
comes straight back.

**Every mutation a person could regret returns an `UndoAction`.** Logging is one
tap with no confirmation, so there has to be a way back.

**Colour, type and spacing come from tokens.** `src/styles.css` clears
Tailwind's stock palette, so `bg-red-500` does not exist — every colour has to
be a token like `bg-water` or `text-ink-muted`. Dark mode redefines the same
variable names, so no component knows which theme is on.

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
- **M3 — in progress.** A QR code on the plant page as a fallback for a dead
  sticker — done. Photos in a separate private repository, one file each —
  next.
- **M4 — later.** A family tree over several generations, pests with repeat
  treatments, achievements.
