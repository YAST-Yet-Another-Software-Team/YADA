# Third-party notices

YADA is licensed under Apache-2.0 (see [`LICENSE`](LICENSE)). It builds on the work below.

This file covers what **ships to a user** — the browser bundle and the Cloudflare Worker bundle.
Build and development tooling (TypeScript, Vite, Playwright, Wrangler, Miniflare, drizzle-kit,
Prettier, Tailwind's compiler) is not distributed and is not listed. That distinction matters in one
place: `sharp`'s libvips binaries are LGPL-3.0-or-later and are pulled in by Miniflare and
MapLibre's own dev dependencies. They run at build time only, never enter either bundle, and
therefore place no obligation on YADA or on anyone deploying it.

## Software

### BSD-3-Clause

**maplibre-gl 6.5.0** — https://github.com/maplibre/maplibre-gl-js

```
Copyright (c) 2023, MapLibre contributors

All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of MapLibre GL JS nor the names of its contributors
      may be used to endorse or promote products derived from this software
      without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

MapLibre GL JS contains code from mapbox-gl-js v1.13 and earlier, Copyright (c) 2020 Mapbox, also
under a BSD-3-Clause licence. Both notices appear in full in `maplibre-gl`'s `LICENSE.txt`.

The minified client bundle carries only a short banner —
`@license 3-Clause BSD. Full text of license: https://github.com/maplibre/maplibre-gl-js/blob/v6.5.0/LICENSE.txt`
— because the minifier strips comment blocks. That is why the copyright notice is reproduced above:
BSD-3-Clause asks that a binary redistribution carry it "in the documentation and/or other materials
provided with the distribution", and this file is those materials.

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
- **zod 4.4.3** — https://zod.dev
- **Devicon** (`@iconify-json/devicon` 1.2.62) by konpa — https://github.com/devicons/devicon —
  one icon ships: the Google mark on the sign-in button. Google's own brand guidelines govern the
  use of that mark on a sign-in control, which is the use here.

Each carries the standard MIT permission notice in its own `LICENSE` file. Minification strips
those comments from the shipped bundle, so this file is where the notices travel.

## Data and services

YADA's entire map stack reads OpenStreetMap data. Attribution is required, and is rendered in the
app through MapLibre's attribution control on every map screen.

- **OpenStreetMap** — map data © OpenStreetMap contributors, licensed under the
  [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/).
  https://www.openstreetmap.org/copyright

  The landmark table in `App/src/lib/shared/geo/landmarks.ts` holds 36 coordinates read from
  OpenStreetMap. That is an insubstantial extract, so ODbL's share-alike provision is not triggered
  on this repository, but the source is credited here and in the file itself.

- **OpenFreeMap** — vector tiles and the Liberty style, served without an API key.
  https://openfreemap.org — tiles are built from OpenStreetMap data (ODbL, as above).

- **Photon** by komoot — geocoding and place search, used keyless from the browser.
  https://photon.komoot.io — data from OpenStreetMap (ODbL).

- **Nominatim** (OpenStreetMap Foundation) — reverse-geocoding fallback.
  https://nominatim.openstreetmap.org — data from OpenStreetMap (ODbL). Use is subject to the
  [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/): an
  identifiable client and no more than one request per second. YADA calls it only when Photon fails,
  from the browser, well inside that ceiling.

- **OpenRouteService** — driving routes and durations, proxied server-side through
  `/api/geo/route` so the API key never reaches the client. https://openrouteservice.org — routing
  is computed over OpenStreetMap data (ODbL). Their terms require visible attribution wherever a
  route is shown; "Routing by openrouteservice" appears in the map attribution control.

- **Cloudflare Workers** (hosting) and **Neon** (Postgres) are services rather than distributed
  components, and impose no attribution requirement.
