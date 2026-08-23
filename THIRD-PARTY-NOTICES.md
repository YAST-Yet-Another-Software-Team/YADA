# Third-party notices

YADA is licensed under Apache-2.0 (see [`LICENSE`](LICENSE)). It builds on the work below.

This file covers what **ships to a user** — the browser bundle and the Cloudflare Worker bundle.
Build and development tooling (TypeScript, Vite, Playwright, Wrangler, Miniflare, drizzle-kit,
Prettier, Tailwind's compiler) is not distributed and is not listed. That distinction matters in one
place: `sharp`'s libvips binaries are LGPL-3.0-or-later and are pulled in by Miniflare. They run at
build time only, never enter either bundle, and therefore place no obligation on YADA or on anyone
deploying it.

## Software

### Apache-2.0

- **drizzle-orm 0.45.2** — https://github.com/drizzle-team/drizzle-orm
- **Material Design Icons** (`@iconify-json/mdi` 1.2.3) by Pictogrammers —
  https://github.com/Templarian/MaterialDesign — 92 icons are inlined into the UI bundle.

Both are used unmodified. Full licence text: https://www.apache.org/licenses/LICENSE-2.0

### CC-BY-4.0

- **Solar** icon set (`@iconify-json/solar` 1.2.5) by **480 Design** —
  https://www.figma.com/community/file/1166831539721848736 — licensed
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

One icon from this set ships: `solar/shop-bold`, used as the pickup marker in
`App/src/lib/components/MapBackdrop.svelte`. CC BY requires attribution, which this entry provides.

### MIT

- **SvelteKit 2.70.2** and **Svelte 5.56.8** — https://github.com/sveltejs/kit
- **better-auth 1.6.25** and **@better-auth/drizzle-adapter 1.6.25** — https://better-auth.com
- **@neondatabase/serverless 1.1.0** — https://github.com/neondatabase/serverless
- **socket.io-client 4.8.3** — https://socket.io
- **@googlemaps/js-api-loader 2.1.1** — https://github.com/googlemaps/js-api-loader — loads the
  Maps JavaScript API at runtime; the SDK itself is served by Google, not bundled.
- **zod 4.4.3** — https://zod.dev
- **Devicon** (`@iconify-json/devicon` 1.2.62) by konpa — https://github.com/devicons/devicon —
  one icon ships: the Google mark on the sign-in button. Google's own brand guidelines govern the
  use of that mark on a sign-in control, which is the use here.

Each carries the standard MIT permission notice in its own `LICENSE` file. Minification strips
those comments from the shipped bundle, so this file is where the notices travel.

## Data and services

- **Google Maps Platform** — the Maps JavaScript API (basemap and Advanced Markers), Places API
  (New) for as-you-type predictions, the Geocoding API for naming a dropped pin and resolving a
  typed address, and the Routes API for the driving leg and its ETA. All four bill against one
  browser key. Use is governed by the
  [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms), which
  carry their own obligations — most relevantly: the SDK's on-map attribution and logo must not be
  hidden, and geocoding results may be cached only for performance and only for up to 30 days.
  `App/src/lib/client/maps/route-cache.ts` and the picker's geocode cache are both short-lived TTL
  caches sized for that rule.

- **OpenStreetMap** — the landmark table in `App/src/lib/shared/geo/landmarks.ts` holds 36
  coordinates read from OpenStreetMap, © OpenStreetMap contributors, licensed under the
  [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/).
  https://www.openstreetmap.org/copyright

  This is the one piece of the OSM stack that outlived it. Thirty-six hand-picked points is an
  insubstantial extract, so ODbL's share-alike provision is not triggered on this repository, but
  the source is credited here, in NOTICE, and in the file itself. Displaying these names over a
  Google basemap is fine in both directions: Google's terms restrict taking *their* content
  elsewhere, not bringing your own.

- **Cloudflare Workers** (hosting) and **Neon** (Postgres) are services rather than distributed
  components, and impose no attribution requirement.
