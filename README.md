# YADA, Yet Another Delivery App

YADA is a web application for on-demand motor courier dispatch. A business raises a delivery
request, the app rings nearby riders until one accepts, and both sides watch the trip through to
completion, replacing the phone calls and text messages that coordination usually runs on.

It is built for two kinds of people: businesses that lean on motor delivery, and motor couriers
looking for that work. **Favorie**, a food business in the KNUST / Ayeduase area of Kumasi, is the
first business on it, the first user rather than the specification. Nothing in the system is named
after them, and nothing about the design assumes a single tenant.

A business can run as many deliveries at once as it has orders, each with its own dispatch clock
and its own tracking screen, and a rider carrying a parcel can chain the next job onto it. There
are exactly two actors and no administrator: everything a person can do, they do for their own
account or for a delivery they are personally on.

## What is in this repository

| Path                                                                   | What it is                                                                                                                                                      |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`App/`](App)                                                          | **The application.** SvelteKit 2 with Svelte 5 on Cloudflare Workers. Features, setup, environment and architecture are all in [`App/README.md`](App/README.md) |
| [`Docs/`](Docs)                                                        | The SRS, the database ERD and the API reference, written from the handlers                                                                                      |
| [`Design/`](Design)                                                    | Design tokens, which the app imports, plus the component system, guidelines, screen captures and the design canvas                                              |
| [`LICENSE`](LICENSE)                                                   | Apache-2.0, covering the code                                                                                                                                   |
| [`LICENSE-DOCS`](LICENSE-DOCS)                                         | CC BY 4.0, covering everything in `Docs/` and `Design/`                                                                                                         |
| [`NOTICE`](NOTICE), [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) | Attribution that travels with the code, and dependency and data credits                                                                                         |

### Docs

- [`Docs/SRS Document.pdf`](Docs/SRS%20Document.pdf), Software Requirements Specification v2.0
- [`Docs/database_erd.md`](Docs/database_erd.md), the schema as a mermaid ERD, with `erd.png`
  alongside it
- [`Docs/api_schema.md`](Docs/api_schema.md), every endpoint, written from the route handlers

### Design

`Design/tokens/*.css` is imported directly by `App/src/lib/styles/app.css`, so changing a ramp in
that folder changes the product. See [`Design/README.md`](Design/README.md).

## Getting started

The application lives in [`App/`](App) and needs Node 20 or newer and a Neon Postgres database.

```bash
git clone <repo-url>
cd YADA/App
npm install
npm run db:migrate
npm run dev            # http://localhost:5173
```

That leaves out the `.env`, which the app will not start usefully without.
**[`App/README.md`](App/README.md) is the setup guide.** It lists every variable, where each
credential comes from, and what breaks when one is missing.

## Status

The first build is shipped: accounts, dispatch, the full two-phase trip lifecycle, two-way ratings
and the Cloudflare Workers deployment. The feature list and the roadmap are in
[`App/README.md`](App/README.md).

## License

Code is **Apache-2.0**, in [`LICENSE`](LICENSE). It is permissive, and it was picked over MIT for
the patent grant and the §5 contribution terms that a multi-author project with no CLA wants.
Documentation and design assets in `Docs/` and `Design/` are **CC BY 4.0**, in
[`LICENSE-DOCS`](LICENSE-DOCS).

Maps, address search and routing come from Google Maps Platform under its
[terms of service](https://cloud.google.com/maps-platform/terms). The landmark table in
`App/src/lib/shared/geo/landmarks.ts` holds 36 coordinates read from OpenStreetMap,
**© OpenStreetMap contributors** under the [ODbL 1.0](https://www.openstreetmap.org/copyright).
It is an insubstantial extract, so share-alike does not reach this repository. Dependency and data
credits are recorded in [`NOTICE`](NOTICE) and [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

No dependency imposes a copyleft obligation: the tree is MIT, Apache-2.0, ISC, BSD and CC-BY
throughout.
