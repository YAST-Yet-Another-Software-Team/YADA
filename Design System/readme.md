
# YADA Design System

**YADA — Yet Another Delivery App.** A webapp for fast-food businesses to find,
request, and track delivery couriers. Think Bolt/Uber/Lyft, but for delivery
riders instead of car rides — no payments handling, just courier discovery,
request, and live tracking.

This design system was authored **from scratch** for this brief. No Figma
file, codebase, or slide deck was attached to the project at build time —
there was no existing brand source to recreate. Everything here (palette,
type choice, components, UI kit) is a first-pass system derived from the
brand notes below, intended to be iterated against real brand material as
it becomes available.

**Sources provided:**
- Brand notes only: "red (primary), orange (secondary) — matches the
  business colours"; product description ("simple version of Bolt/Uber/Lyft
  for delivery riders, no payments, just locates riders").
- No Figma link, no codebase, no slide deck, no logo files were attached.

If you have a Figma file, repo, or brand guidelines for YADA, attach them and
this system should be rebuilt against that ground truth — treat everything
below as a reasonable starting point, not a locked brand spec.

---

## Index

- `styles.css` — root stylesheet, import-only entry point
- `tokens/`
  - `colors.css` — red/orange/neutral ramps + semantic aliases
  - `typography.css` — font stack, @font-face import, type scale
  - `spacing.css` — spacing, radius, elevation, motion tokens
  - `base.css` — minimal document reset
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `assets/` — iconography reference, wordmark treatment
- `components/`
  - `forms/` — Button, IconButton, Input, Select, Checkbox, Radio, Switch
  - `feedback/` — Badge, StatusPill, Toast, Tooltip
  - `surfaces/` — Card, Avatar, Tabs, Dialog
- `ui_kits/yada-app/` — the request → match → track → history flow
- `SKILL.md` — portable skill description for Claude Code

## Intentional additions (no source to enumerate a component list from)

Since no Figma/codebase defined a component inventory, the standard set
(Button, IconButton, Input, Select, Checkbox, Radio, Switch, Card, Badge,
Tabs, Dialog, Toast, Tooltip) was authored, sized to the brand's needs, plus:
- **StatusPill** — courier/order lifecycle chip (searching, en route,
  arrived, delivered, cancelled). Core to a delivery-tracking product; no
  generic "Badge" alone captures a lifecycle state well.
- **Avatar** — courier photo/initials circle, needed throughout tracking UI.

## Font substitution — FLAG for follow-up

No brand font files were supplied. Substituted **Plus Jakarta Sans** (display
+ body) and **JetBrains Mono** (fare/ETA/order-code figures) from Google
Fonts as the closest fit for a fast, friendly, geometric-but-warm consumer
delivery app. **If YADA has licensed fonts, please share the files** and
this system will be rebuilt on them.

## Logo — none provided

No logo or brand mark will be provided for this project. Nothing has been
drawn or approximated in its place — wherever a mark would go, the wordmark
"YADA" is set in `--font-display` at `--weight-extrabold`. See
`assets/README.md`.

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
  (a real map tile provider in production) is the only "imagery" — everywhere
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

Icons are sourced via **Iconify** (icones.js.org's engine), using its
**Lucide** icon set by default — 1.5–2px stroke weight and rounded joins sit
comfortably next to Plus Jakarta Sans's rounded terminals. Any other set on
icones.js.org is a one-line swap (change the `lucide:` prefix), so this is
easy to revisit once a final icon direction is picked.

- **System:** Iconify web component (`<iconify-icon icon="lucide:...">`),
  stroke icons only (no filled variants), sized at 16/20/24px inline with
  text.
- **Usage:** icons pair with a text label in most UI (buttons, nav) — icon-
  only usage is reserved for IconButton (map controls, close/back) and
  always ships an `aria-label`.
- **Emoji:** not used as icons or content (see Content fundamentals).
- **Unicode glyphs:** not used as icons.
- **Format:** the `<iconify-icon>` custom element renders inline SVG at
  runtime and inherits `currentColor`, so icons recolor with theme/state —
  no PNG icons, no manual icon-refresh calls needed.

See `assets/README.md` for the exact CDN snippet and the map-pin / courier
marker treatment used in the UI kit.

---

## Caveats & ask

This system was built with **no attached brand source** — no Figma, no
codebase, no logo, no font files, no existing product screens. Everything
above is a first, coherent pass grounded only in "red primary / orange
secondary" and the one-paragraph product description. Please treat every
color value, the font choice, and every screen in the UI kit as a draft to
react to, not a locked spec.

**Ask:** if you have any of the following, attach them and this system
should be rebuilt against real ground truth:
- Licensed brand fonts (currently substituted with Google Fonts)
- An existing app codebase, Figma file, or screenshots of the real product
- Any existing marketing material showing the red/orange usage in context

(No logo/wordmark file is expected — the type-set "YADA" wordmark is the
permanent treatment, not a placeholder.)

In the meantime — tell me what feels off (too saturated? too playful/not
playful enough? wrong font?) and I'll iterate quickly.
