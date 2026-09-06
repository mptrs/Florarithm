# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The builder themself (and possibly a partner sharing the same household), tending a personal collection of houseplants. Used in the moment of watering or caring for a plant, standing in front of the pot with a phone in hand. Not built or positioned for other households to adopt as a product.

## Product Purpose

A plant logbook you open by tapping an NFC tag stuck to the pot. It exists so that logging care (watering, fertilizing, repotting, new leaves, blooming, notes) is as close to zero-friction as possible — tap the tag, tap WATER, done, with undo always available. Success is a complete, trustworthy history of each plant's care without the app ever feeling like a chore to update.

## Positioning

Most plant-care apps push notifications and try to predict when a plant needs water next. Florarithm deliberately does not: watering happens on fixed days regardless of the plant, so a prediction would just be echoing the user's own calendar back at them. Instead it shows the historical average interval and its spread, looking backward only. The other differentiator is the physical trigger — an NFC tag on the pot opens straight to that plant's page, no search, no account, no server.

## Operating Context

- Physical NFC tags stuck to pots, each encoding a URL like `…/Florarithm/#p=MON-8F3A` that opens directly to that plant.
- Used standing near the plant, one-handed, phone in the other hand — hence one-tap logging with no confirmation dialogs.
- Runs as a static web app (GitHub Pages), phone as the primary surface and desktop as a secondary one (same markup, breakpoint-driven layout).
- No account and no server. Data lives on-device (IndexedDB); from M2 onward, a private GitHub repo syncs two devices for the same person.
- Backup is a single JSON file shared out via the OS share sheet (e.g. into iCloud Drive on iOS).
- Tags are written externally via NFC Tools; the app can only read NFC (via the URL), not write it, since Web NFC write support is Chrome/Android only.

## Capabilities and Constraints

- Logs watering, fertilizing, repotting (updates the plant's pot/medium), new leaves, blooming, and free-form notes.
- Wishlist entries live in the same table as owned plants; "I have this now" flips a flag and preserves code/name/date.
- Family lineage: cuttings and corms point at a parent plant; a name generator continues the line (Fluweel, Fluweel II, Fluweel III) so the family tree reads without a diagram.
- Events are append-only (soft-deleted via a `deleted` flag, never removed) so multi-device sync can merge by union safely.
- No derived values are ever stored — days since watering, average rhythm, leaves this year, collection value are all computed at render time from the event log, to avoid the log and a cached value disagreeing.
- Every regrettable mutation returns an `UndoAction`.
- Three runtime dependencies only: React, ReactDOM, `idb`.
- Roadmap: M1 (done) single device; M2 (done) private-repo sync; M3 photos + QR fallback for a dead sticker; M4 multi-generation family tree, pest tracking with repeat treatments, achievements.

## Brand Commitments

Name: Florarithm. Voice is dry, precise, and understated rather than cheerful or gamified — e.g. "always an undo," "the day the sticker gives up." No decorative copy beyond what's functionally true.

## Evidence on Hand

- Live app: https://mptrs.github.io/Florarithm/
- README.md documents the full feature set, architecture, and conventions in detail.
- Existing design mockups/system under `design/` (Main, Today, Plant, Collection, Wishlist, Settings, New — phone and desktop — plus a components/patterns reference and `florarithm-design-system.html`).
- No user testimonials, benchmarks, or third-party evidence exist or should be fabricated — this is a personal project with one (or two) real users.

## Product Principles

- Frictionless logging beats complete logging: one tap, no confirmation, undo instead of "are you sure?".
- Show history, don't predict it — the app reflects the user's own fixed watering schedule back at them rather than guessing.
- No derived state is ever the source of truth; the event log is, always.
- No account, no server, no dependency the user didn't choose — data stays on-device with an opt-in private sync.
- One markup serves phone and desktop; layout differs only by breakpoint, never by branching logic.

## Accessibility & Inclusion

No specific accessibility requirement has been established beyond the general practices already in code (44px minimum touch targets for anything that writes data, 16px+ inputs to avoid iOS zoom, token-driven color/dark-mode).
