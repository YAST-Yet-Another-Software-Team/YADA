/**
 * Design System colours as sRGB hex, for the Google Maps JS API.
 *
 * Everywhere else in the app, colour comes from a token — either a Tailwind
 * class or `var(--token)`. Maps is the one exception: marker and polyline
 * options are passed to canvas/SVG rendering that does not accept `var()`
 * references, and does not reliably accept `oklch()` either. So these are the
 * flattened equivalents.
 *
 * Each value is the exact sRGB conversion of the OKLCH token named beside it,
 * from `Design/tokens/colors.css`. **If a ramp changes there, these must
 * be regenerated** — they cannot track it automatically.
 */
export const MAP_COLORS = {
  /** --color-primary → --red-500: oklch(60% 0.215 27) */
  primary: '#e4312f',
  /** --color-secondary → --orange-500: oklch(68% 0.19 55) */
  secondary: '#ed6f00',
  /** --color-success → --green-600: oklch(53% 0.15 149) */
  success: '#008236',
  /** --color-info → --blue-600: oklch(50% 0.15 250) */
  info: '#0065b4'
} as const;

/**
 * The marker ring and glyph colour, which is the one map colour that has to
 * follow the theme.
 *
 * Everything in `MAP_COLORS` is a brand or status hue and means the same thing
 * against light or dark cartography. This does not: it is the *surface* showing
 * through, and a white ring that separates a pin from pale streets turns into a
 * glare against Google's dark basemap. It is a plain record rather than a
 * `light-dark()` token because its consumer is canvas-rendered marker options,
 * which resolve no CSS at all — see the note at the top of this file.
 *
 * Values are the sRGB conversions of `--neutral-0` and `--neutral-900`, the two
 * halves of `--color-surface`.
 */
export const MAP_SURFACE = {
  light: '#ffffff',
  dark: '#14110f'
} as const;

/**
 * Semantic role → colour, for every marker on every map.
 *
 * Two hues, split by what the marker *is* rather than by which screen drew it:
 *
 * - **Brand red for the parties.** A rider and a business are a *who*, drawn as
 *   glyphs, and red is what makes them findable in a glance across a whole map.
 * - **Secondary orange for the destination.** It is a *where* — a dropped pin —
 *   and it used to be red as well, which put the loudest colour on the map in
 *   two places at once and left the eye nothing to sort them by. Orange is the
 *   same hue the request form gives the destination row, so the pin and the
 *   field that set it match.
 *
 * There is no `pickup`: the origin of a YADA delivery is always the business,
 * so it is a `business` glyph on every map rather than a second pin competing
 * with the destination for meaning.
 */
export const MAP_ROLE_COLORS = {
  dropoff: MAP_COLORS.secondary,
  /** A pin mid-placement in the picker — the destination before it is fixed. */
  search: MAP_COLORS.secondary,
  rider: MAP_COLORS.primary,
  business: MAP_COLORS.primary
} as const;
