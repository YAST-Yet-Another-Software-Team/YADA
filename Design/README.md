# Design

Everything visual for YADA in one place: the tokens the app imports, the component
system built on them, the screens, and captures of the running product.

Licensed [CC BY 4.0](../LICENSE-DOCS), like everything in `Docs/` — the application
code is Apache-2.0 instead.

This folder was two — `Design/` and `Design System/` — and is now one. Nothing that
follows is aspirational: `App/src/lib/styles/app.css` imports `tokens/*.css` from
here and `App/tailwind.config.ts` exposes every one as a utility, so **changing a ramp
in this folder changes the product**.

## What is here

| Path | What it is |
| --- | --- |
| `tokens/` | `colors.css`, `typography.css`, `spacing.css`, `base.css` — **imported directly by the app**. The single source of truth for colour, type, spacing, radii and shadows. |
| `styles.css` | Import-only entry point that pulls the four token files in. |
| `components/` | The component system — forms, feedback, surfaces. Each ships `.jsx`, `.d.ts` and a `.prompt.md`. |
| `guidelines/` | Specimen cards for colour, type, spacing, elevation, radius and brand. Open them in a browser. |
| `screenshots/` | 51 captures of the running app, 2026-08-22 — `mobile/` at 390x844, `desktop/` at 1440x900, both 2x. |
| `canvas/` | Sources for the design canvas: `lib.mjs` plus three builders that generate the `.dc.html` artboards, and `canvas.json` for the layout. |
| `yada-screens.html` | The seeded canvas — 33 artboards over four pages. Opens in a browser; also published as an artifact. |
| `SKILL.md` | Portable description of this system for Claude Code. |
| `_ds_manifest.json`, `_ds_bundle.js`, `_adherence.oxlintrc.json` | Tooling for the component system. Generated — don't hand-edit. |

### Captures

Every stage of a real delivery, driven end to end through the API — not mocked.

| Prefix | What it shows |
| --- | --- |
| `public-*` | Landing, sign-in, password reset |
| `biz-*` | Dashboard (empty and with a live row), new request, history, profile |
| `biz-searching-*` → `biz-completed-*` | One trip, stage by stage: searching → en route → arriving → delivering → delivered |
| `rider-*` | Offline, offer, pickup, delivering, complete, orders, trips, settings |

### Screens

Working files in `canvas/`; the `.dc.html` files are **generated**, so edit the
builders, not the output. Four pages:

- **Business** — new request, dashboard, finding a rider, rider en route, delivered +
  rate, orders, profile. Mobile and desktop.
- **Courier** — offline, new request, heading to pickup, delivering, delivered + rate,
  trips, profile & settings. Mobile, plus three desktop artboards.
- **Entry** — landing, sign-in on both viewports.
- **Lo-fi wireframes** — the six core screens as structure, with the governing rule
  annotated on each.

Drawn from the captures screen by screen rather than from the token files. Where a
screen and a token disagree, the screen is what shipped. Maps in the artboards are
placeholders — the real ones render MapLibre tiles, which cannot load in a sandboxed
artboard.

Two layout facts the captures settle, neither guessable from the tokens:

- **Business desktop** is a centred 1232px column under a fixed top bar. Tracking splits
  into map + a 318px right rail, and stays under the *Request* nav item.
- **The courier app has no desktop layout.** On a wide screen the same 390px column is
  centred on `--color-shell`, reading as a device against a desk — which is exactly what
  that token's comment in `App/src/lib/styles/app.css` says it is for.

## Provenance

Authored from brand notes alone — "red (primary), orange (secondary)" plus a
one-paragraph product description — with no Figma file, no fonts and no product
screens to work from. That gap is now closed: the app is built, it imports these
tokens, and `screenshots/` is the ground truth the system can be checked against.

What the running app confirms:

- Red (`--red-500`) carries the brand; orange is a real secondary — the drop-off pin
  and the *en route* state, not decoration.
- `--font-display` and `--font-body` both resolve to Plus Jakarta Sans, as authored.
- `--font-mono` earns its place: plates, ETAs, countdowns, order refs, phone numbers
  and prices are all set in JetBrains Mono on the real screens.
- **StatusPill** — the component this system added on its own initiative — is exactly
  what the trip lifecycle needed, and the real screens use it at every stage.

Still open: **no licensed brand fonts.** Plus Jakarta Sans and JetBrains Mono are
Google Fonts substitutions. If YADA has licensed faces, this should be rebuilt on them.

### Logo

There *is* a mark, contrary to what this system was first told. The wordmark lives at
`App/static/logo.svg` (and `App/static/favicon.svg`), and it is what the landing page,
the sign-in screen and the business top bar render. The hi-fi artboards inline that
same file. Two unused source images sit in the repository root: `yada logo.png` and
`Favoire Logo.jpg`.

## Two rules the designs must keep honouring

- **The courier is never shown the order's value.** `GET /api/trips` nulls `orderPrice`
  for the rider. A price on a courier screen is a design bug, not a missing field.
- **The business confirms the handover, not the courier** — and both confirmations are
  gated on the rider's own reported position. Any layout that puts "picked up" under the
  rider's thumb contradicts the server.

---

## Content fundamentals

YADA's copy voice is **direct, calm, and operational** — it is describing a
live logistics process (a rider on their way to pick something up), and
copy should read like a competent dispatcher, not a hype machine.

- **Voice:** plain, short sentences. State what is happening or what to do
  next — never "we're thrilled to..." marketing filler in-product.
  - Good: "Finding a rider near you." / "Courier is 4 min away." /
    "Delivered at 2:41 PM."
  - Avoid: "Yay! Your snacks are on the way! 🎉"
- **Person:** address the user directly as **you**; refer to the courier in
  third person by first name once assigned ("Kwame is on the way").
  The product speaks *to* the user, never *as* "I/we" outside of system
  status ("We couldn't find a rider nearby" is acceptable for a system-level
  failure state, but action confirmations stay in second person / passive:
  "Request sent," not "We sent your request!").
- **Casing:** sentence case everywhere — buttons, headings, labels. No
  Title Case, no ALL CAPS body copy. ALL CAPS is reserved for small
  eyebrow/overline labels only (e.g. `ORDER #4521`), set at `--text-xs`
  with `--tracking-widest`.
- **Tense:** present or immediate-future for live status ("Arriving in 6
  min"), simple past for completed events ("Picked up at 2:12 PM").
- **Numbers:** always digits, never spelled out (4 min, not "four minutes").
  Currency is out of scope (no payments in this product) but distances/times
  use tabular figures in `--font-mono` wherever they update live, so digits
  don't jitter the layout as they change.
- **Emoji:** not used in-product. This is an operational tool used
  repeatedly throughout a workday, not a social/celebratory surface.
  Status is communicated with color + StatusPill, not emoji.
- **Errors:** state the problem and the next step, no blame, no apology
  padding. "No riders available nearby. Try again in a few minutes." not
  "Oops! Something went wrong 😢".
- **Vibe in one line:** *a dispatcher's radio, not a delivery-app confetti
  cannon.* Confident, fast, low-drama.

---

## Visual foundations

- **Color:** Red (`--color-primary`) is the action color — primary buttons,
  active states, the brand mark. Orange (`--color-secondary`) is the accent
  for secondary emphasis (in-progress/en-route highlights, secondary CTAs)
  — the two are never used for the same element at full saturation
  simultaneously (no red-to-orange gradients; see below). Neutrals carry a
  faint warm tint so grays don't read cold next to red/orange. Semantic
  colors are intentionally separated from the brand hues: success is green,
  warning is amber, info is blue — danger deliberately **reuses** the primary
  red ramp (a red-primary brand doesn't need a second alarm-red).
- **Type:** Plus Jakarta Sans across display and body — one family, weight
  does the work of differentiating hierarchy (800 for display, 600 for
  headings/labels, 400 for body). JetBrains Mono is reserved for live
  numeric data (ETAs, distances, order codes) so digits stay tabular and
  don't reflow as they tick.
- **Spacing:** 4px base scale. Generous padding inside cards/panels
  (`--space-6`–`--space-8`) — this is a map-forward app, chrome should feel
  light so the map/content underneath stays legible.
- **Backgrounds:** flat surfaces, no gradients, no photographic full-bleed
  backgrounds, no illustration or texture/pattern fills. The map itself
  (MapLibre GL over OpenStreetMap tiles) is the only "imagery" — everywhere
  else is solid `--color-bg` / `--color-surface`. This keeps the operational,
  utility tone from content fundamentals consistent visually: no decoration
  competing with live status information.
- **Gradients:** none. Flat fills only, including on primary buttons — a
  flat `--color-primary` fill plus `--shadow-primary-glow` on hover carries
  enough visual weight without a gradient.
- **Animation:** minimal and functional, never decorative-only. Transitions
  use `--ease-out` for anything appearing/expanding (courier pin dropping in,
  panel sliding up) and `--ease-standard` for state swaps (status pill
  color change). Durations are short (`--duration-fast`/`--duration-normal`)
  — this is a tool people check quickly and often, not a showcase. No
  infinite decorative loops; the one continuous animation permitted is a
  subtle "searching" pulse on the courier-matching state, since that is
  communicating real waiting time, not decoration.
- **Hover states:** solid color steps down the ramp (`--color-primary` →
  `--color-primary-hover`, i.e. red-500 → red-600) — no opacity fades, no
  lightening. Ghost/outline buttons pick up a `--color-primary-subtle`
  background fill on hover.
- **Press/active states:** step one more down the ramp
  (`--color-primary-active`) plus a 1px scale-down (`transform: scale(0.98)`)
  — a light, fast "press" feel, not a bouncy one.
- **Borders:** hairline `--border-width-sm` (1px) `--color-border` on cards
  and inputs at rest; inputs step up to `--border-width-md` in
  `--color-primary` on focus, paired with a soft `--color-focus-ring` outline
  glow rather than a heavy box-shadow ring.
- **Shadows:** soft and warm-tinted (never pure black — shadows use a low-
  chroma warm oklch black so they don't read cold/blue against red/orange
  content). Cards at rest use `--shadow-xs`/`--shadow-sm`; raised surfaces
  (bottom sheets, dialogs) use `--shadow-lg`. Primary CTAs get
  `--shadow-primary-glow` on hover only, not at rest.
- **Capsules vs. protection gradients:** status/StatusPill chips are full
  `--radius-full` capsules with a flat subtle-tint background
  (`--color-*-subtle`) and full-strength text/icon color — no scrim or
  gradient-protection treatment anywhere (no text-over-image needs it, since
  there's no photographic imagery in the UI chrome).
- **Layout rules:** the map is the fixed base layer; UI panels are anchored
  bottom-sheet style on mobile widths and left-rail/floating-panel on wider
  viewports — chrome floats over the map with a shadow, never a hard-edged
  full-width bar competing with it.
- **Transparency & blur:** used sparingly and only for the dialog/sheet
  scrim (`--color-overlay`, a warm-tinted black at 55% — no blur) — no
  frosted-glass panels over the map, since a map needs clean unobstructed
  visibility while a courier is en route.
- **Imagery color vibe:** none of YADA's own chrome uses photography.
  Courier avatars are a plain photo circle or initials fallback — if photos
  are used they should be shot warm/natural-light, not desaturated or
  heavily filtered, to match the food/hospitality context.
- **Corner radii:** moderate rounding throughout — `--radius-md` (12px) on
  buttons/inputs, `--radius-lg` (18px) on cards/panels, `--radius-full` on
  chips/pills/avatars. Never fully square, never the pill-everywhere look.
- **Cards:** `--color-surface` fill, `--radius-lg`, 1px `--color-border`,
  `--shadow-sm` — no colored left-border accent stripe (explicitly avoided
  as an overused pattern), no colored background tints in default state.

---

## Iconography

Icons are sourced via **Iconify** (icones.js.org's engine), using the
**mdi** set — 1.5–2px stroke weight and rounded joins sit
comfortably next to Plus Jakarta Sans's rounded terminals. Any other set on
icones.js.org is a one-line swap (change the `lucide:` prefix), so this is
easy to revisit once a final icon direction is picked.

- **System:** `unplugin-icons`, resolved at build time from `@iconify-json/mdi`,
  stroke icons only (no filled variants), sized at 16/20/24px inline with
  text.
- **Usage:** icons pair with a text label in most UI (buttons, nav) — icon-
  only usage is reserved for IconButton (map controls, close/back) and
  always ships an `aria-label`.
- **Emoji:** not used as icons or content (see Content fundamentals).
- **Unicode glyphs:** not used as icons.
- **Format:** icons compile to inline SVG components that inherit `currentColor`, so icons recolor with theme/state —
  no PNG icons, no manual icon-refresh calls needed.

The app wires this through `unplugin-icons` (`~icons/<set>/<name>`) rather than
the web component, and the set in use is **mdi**, not Lucide — 92 of the 94 icon
imports in `App/src` are `~icons/mdi/`, with one each from `solar` and `devicon`.
The stroke-weight and sizing rules above still hold.

---
