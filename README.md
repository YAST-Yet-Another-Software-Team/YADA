# YADA – Motor Courier Request Web Application

YADA — *Yet Another Delivery App* — is a web application that streamlines on-demand motor courier
delivery for Favoire, a food business in the KNUST / Ayeduase area of Kumasi. It replaces manual
delivery coordination — phone calls and text messages — with a single platform where the business
raises a request, the app rings nearby riders until one accepts, and both sides watch the trip
through to completion.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Actors](#actors)
- [Non-Functional Requirements](#non-functional-requirements)
- [Assumptions & Dependencies](#assumptions--dependencies)
- [Getting Started](#getting-started)
- [Repository Layout](#repository-layout)
- [Project Status](#project-status)
- [License](#license)
- [References](#references)

## Overview

**Favoire** is a business that relies on motor delivery and coordinates couriers manually, which is
slow, time-consuming and hard to track. YADA solves this by letting the business request a courier,
matching the request to a nearby available **Courier**, and tracking the delivery in real time from
request through completion.

The SRS writes the audience as two classes of people: food businesses that lean heavily on motor
delivery, and motor couriers looking for that work. Favoire is the first of the former, not a
special case in the code — nothing in the system is named after it.

The system has exactly two actors and no administrator. Everything a person can do, they do for
their own account or for a delivery they are personally on — there is no privileged role, and no
endpoint that takes someone else's id.

## Key Features

### User Registration & Authentication

- Email/password sign-up and sign-in, with the role — business or courier — chosen at sign-up.
- Google OAuth, carrying the chosen role across the redirect in signed OAuth state.
  Registered only when OAuth credentials are configured; the app otherwise runs password-only.
- Password reset by email.
- Email verification as a **soft gate**: it never blocks sign-in or reading your own workspace,
  only the two actions that reach other people — sending a delivery, and going online.
- A `/welcome` completion flow for accounts that arrive missing a phone number, photo or plate.
- Profile photos at avatar grade (~256 px data URLs; there is no object storage yet).
- Self-service account closure — a **soft delete**: credentials, sessions, email, phone and photo
  go, the name stays so past deliveries can still say who was on them, and closure is refused
  while a delivery is still in flight.

### Ride (Delivery) Request & Matching

- A request captures the destination (dropped pin or address search), the order name, its value
  and optional notes. The pickup is always the business's stored dispatch address.
- Matching is an **expanding-ring dispatcher**: 400 m for the first 15 seconds, 800 m until 35,
  then the full 6 km match radius until a 60-second timeout. After that nobody is ringed and the
  business re-rings manually.
- There is no scheduler and no timers. The ring in force is a pure function of
  `now − dispatch_started_at`, recomputed wherever it is needed — so a server restart forgets
  nothing, because nothing was remembered.
- Priority is emergent rather than orchestrated: each rider's alert opens at a moment derived from
  distance, whether they are already carrying a parcel, and their rating. Nearer beats further,
  idle beats busy, higher-rated beats lower-rated — without anyone being excluded outright.
- A decline is remembered, so a re-ring never asks the same rider twice.
- The route estimate — distance and duration — is drawn before the request is confirmed and stored
  with the trip, so the business books against a number and the dashboard can show an ETA before
  the first position fix arrives.
- If the 60 seconds pass with nobody accepting, the request is not silently dropped: it returns to
  the business, which re-rings or cancels.
- Businesses see anonymised nearby riders on the map before they book — supply, not surveillance.

### Trip Lifecycle

```
requested ──accept──▶ accepted ──rider nears pickup──▶ courier_arriving
                                                              │
                                        business confirms handover
                                                              ▼
completed ◀──rider at drop-off── in_progress ◀──start── picked_up
```

Two phases with an explicit handover between them:

- The **business** confirms the pickup, not the courier — a rider who could mark their own could
  mark it from the road. Both handover confirmations are gated on the rider's last reported position.
- Reaching the pickup is *observed*, not declared: the rider's own location fix flips the trip to
  `courier_arriving`, so neither app has to remember to say so.
- Either side can call the trip off until the rider reaches the counter; after that it is a
  conversation, not a button.
- A courier releasing a job they had accepted returns it to the board rather than cancelling it —
  the business still wants their parcel moved; a rider changed their mind, not them.
- Every transition is written to a `trip_events` audit log, alongside the trip's own telemetry —
  estimated distance, estimated duration and the timestamps of each state change.

The SRS states the machine as *requested → accepted → courier arriving → arrived → picked up →
completed / cancelled*. The build carries no separate `arrived`: the business's handover
confirmation is what moves the trip on, so arrival at the counter is a position, not a state. The
leg from pickup to drop-off is `in_progress`. The order and the cancellation rules are unchanged.

### Ratings & Feedback

- Two-way ratings on completed deliveries: 1–5 stars with an optional written comment. The business
  rates the rider who carried it, the rider rates the business they carried for. One row per rater,
  so the two directions are independent.
- Averages are smoothed by a cold-start prior, so a newcomer is neither gifted the top of the board
  nor buried beneath it.
- The courier's rating feeds matching. The business's is informational — riders are ranked for a
  job, businesses are not.

### Customer Support *(planned)*

The SRS asks for two things here: a feedback form for support and bug reports, and a short guide to
navigating the UI. Neither is finished — the feedback form currently only clears itself, and there
is no in-app guide. Routing the form somewhere is on the roadmap, along with push notifications and
localisation.

## Tech Stack

|            |                                                                                     |
| ---------- | ----------------------------------------------------------------------------------- |
| Framework  | SvelteKit 2 + Svelte 5                                                              |
| Database   | Postgres on Neon, via Drizzle ORM                                                   |
| Auth       | Better Auth — email/password, Google OAuth, email verification                      |
| Maps       | Google Maps JavaScript API (Advanced Markers)                                       |
| Geocoding  | Google Geocoding API, with Places Autocomplete for as-you-type search               |
| Routing    | Google Routes API, called from the browser on the same key                          |
| Realtime   | Polling. Socket.IO in `vite dev` only — Workers has no always-on process             |
| Email      | Brevo                                                                                |
| Deploy     | Cloudflare Workers (`adapter-cloudflare`)                                            |
| Styling    | Tailwind CSS                                                                         |

Maps, geocoding and routing all bill against one Google Maps key, and that key reaches the browser
by design: the Maps JavaScript API authenticates the client directly and cannot be proxied. It is
protected by an HTTP-referrer restriction and a quota cap in Google Cloud rather than by secrecy,
and it is withheld from signed-out visitors — every map sits behind a workspace gate, so the public
landing page never carries it.

## System Architecture

YADA has two active actors — **Business** and **Courier** — both accessing the system directly and
simultaneously through a browser-based client. It is one SvelteKit application serving both
workspaces: route groups (`(business)`, `(courier)`) with a server layout that gates each one, page
loaders for the screens, and a JSON API for everything the client does after a page is on screen.

- **Client** — Svelte 5 in the browser, mobile-first. The Maps JS API for maps; geocoding and route
  caching on the client, which is what keeps the billed calls rare; alerts synthesised in Web Audio,
  so there is no audio asset to ship.
- **Server** — SvelteKit endpoints on Cloudflare Workers. Every request gets its own Neon connection;
  nothing that touches the database escapes `withRequestDatabase`.
- **Data** — Postgres. Eleven tables: four for Better Auth, two role profiles, and the dispatch
  domain around `delivery_requests`. See [Docs/database_erd.md](Docs/database_erd.md).
- **Realtime** — the rider's position is pushed over Socket.IO in local development; deployment
  polls `GET /api/trips` instead, because Workers has no always-on process. Sockets are an
  accelerator, not the source of truth, so losing one degrades to slower updates rather than a
  stuck screen.

**Supported environments:**

- Modern evergreen browsers on Android, iOS and desktop — the courier app is used one-handed on a
  bike, so the courier screens are designed phone-first.
- Node 20+ and a Neon Postgres database for local development.
- Cloudflare Workers in deployment. It is the only deploy target.

## Actors

**Business**

Raises delivery requests and follows them. Sets a dispatch address and trading name, which is where
every one of its deliveries starts — a request cannot nominate its own origin. Sees nearby riders
before booking, cancels up until the rider reaches the counter, confirms the handover, re-rings a
search that found nobody, rates the rider afterwards, and keeps a delivery history.

**Courier**

Rides the deliveries. Toggles availability — dispatch reads that flag before it reads a position —
works an offer board fed by the ring, and accepts, declines or releases jobs. Runs the pickup,
delivery and completion screens, with completion gated on proximity to the drop-off. Reports
location in the background, tiered at 10 s idle and 2.5 s mid-trip. Keeps a plate number so the
business can match the bike at the counter, plus an orders/trips history and a distance summary.

## Non-Functional Requirements

SRS v2.0 puts numbers on most of these. They are quoted below as *targets*, with what the build
actually does next to them — a target and a measurement are different claims, and none of these
have been measured under load yet.

**Performance**

*SRS targets:* first courier offer within **5 s** of the request; courier position on the business
map with end-to-end latency under **3 s**; **95%** of API requests under 300 ms and **99%** under
1 s at normal load.

- The offer board polls at 5 s, so in deployment a request reaches the first rider's screen at the
  SRS ceiling rather than comfortably under it. The dev socket path makes it immediate.
- Position latency is the one target polling cannot reach: the rider reports every 2.5 s mid-trip
  and the business tracking screen polls every 4 s, so a fix can be ~6.5 s old on screen. The
  Durable Object WebSocket path below is what closes it; until then the number stands unmet.
- The API-latency targets are untested: there is no load harness and no timing in production. What
  the design gives them is cheap reads — see the two bullets below.
- Dispatch does no scheduled work: the ring is computed on read, so an idle request costs nothing.
- Ratings are cached on the profile row and refreshed when a rating lands, so no screen
  re-aggregates to name a rider or a business.
- Poll intervals are deliberate: 4 s on the tracking and pickup screens, 10 s for nearby riders,
  10 s / 2.5 s for location reporting. Retuning tracking to 8 s and pausing polls on
  `visibilitychange` is queued before real usage.

**Security**

*SRS targets:* TLS 1.2 or higher in transit, adaptive password hashing (scrypt), role-based access
control at least privilege, and rate-limited authentication.

- TLS is terminated by Cloudflare; nothing in the app speaks plaintext HTTP. Password hashing is
  Better Auth's scrypt.
- Rate limiting is partial. `allowSend` caps verification and password-reset mail at one per
  address per minute, deliberately best-effort — on Workers the cache lives in an isolate and there
  may be several. There is no distributed limiter on sign-in itself yet.
- Session-cookie authentication through Better Auth, resolved once per request in `hooks.server.ts`.
- Every authenticated endpoint shares one guard — session, workspace role, and where it matters a
  confirmed email — so a route cannot quietly ship without one.
- `role` is `input: false` in the auth config: no request body can set it, and no client can switch
  itself between workspaces.
- Trips are scoped to their participants, and a trip you are not on answers `404`, not `403` — a
  miss and someone else's delivery are indistinguishable to anyone probing ids.
- State changes are conditional UPDATEs, never check-then-write. The ring alerts several riders at
  once, so races are the normal case: two riders tapping Accept resolve as one winner.
- Profile photos are restricted to `data:image/(png|jpeg|webp)` — that string ends up in an
  `<img src>`, and `data:text/html` can carry script.
- The Google Maps key is browser-visible because the Maps JS API cannot be proxied. It is withheld
  from signed-out visitors, referrer-restricted to the deployment origin and quota-capped, so a
  copied key is worth nothing off this domain. That is a weaker guarantee than a server-side key,
  and it is the price of the SDK.

**Scalability**

*SRS targets:* at least 3 concurrent active trips and 3 location updates per second at launch, with
a documented path to 10x that; geospatial and trip data partitioned so a new city does not slow the
existing one down.

- Launch load is small by design — one business, a handful of riders — and a per-request Neon pool
  carries it without tuning. Partitioning is not implemented and is not needed at one city.
- Candidate selection is the piece that would have to change first: `nearbyCouriers` and the
  ringing board both read every active row and filter by haversine in application code. There is no
  geospatial index — correct and fast at this size, a table scan per poll at a larger one.
- Stateless by construction — no timers, no in-memory dispatch state, nothing to lose on restart.
- A per-request Neon pool, which is what the Workers runtime requires; a pool cached across requests
  hands the next one a socket from a dead I/O context.
- Polling is the deployment realtime path today. Durable Object WebSockets with hibernation are the
  planned replacement, behind the `REALTIME_ENABLED` flag.

**Usability**

*SRS targets:* a first-time business registers and requests a delivery in under a minute unaided;
the mobile view meets platform accessibility guidelines (screen readers, touch-target sizes,
contrast); the courier screens stay legible in sunlight and while vehicle-mounted; language and
currency localisation is phase 2.

- The courier screens are built for the bike case — large controls, shallow interaction depth, high
  contrast in both themes. Sunlight legibility has not been tested in the field.
- Accessibility has not been audited against a checklist; localisation is not started.
- Two purpose-built workspaces rather than one screen with role switches.
- Light and dark themes.
- Dropped pins are named against a landmark table, so an address reads like somewhere in Kumasi
  rather than a coordinate.
- Bell alerts on both sides — a rider when a request rings them, a business when a rider is
  assigned, reaches the counter and reaches the drop-off — silenceable from Settings.
- Email confirmation never stands between someone and their own workspace.

**Privacy & Compliance**

*SRS targets:* collect location only while it is needed for the delivery and say so in the privacy
policy; mask personal phone numbers in business-courier contact; honour account deletion within
statutory timelines.

- Location reporting runs only while a courier is online or on a trip, and stops when they clock
  off — the collection window is the service window.
- Phone numbers are **not** masked today: each side sees the other's real number for the handover.
  Masking needs a relay the project does not have, so it is listed as open work rather than done.
- Account closure is immediate and self-service, which clears the statutory-timeline requirement by
  not needing a queue.
- Nearby riders are anonymised: no names, no ratings, a per-process salted marker reference, and
  positions rounded to about eleven metres. There is no way to follow one particular person.
- The order's value is never sent to the courier app. A rider carries the parcel either way, and a
  value on their screen is a reason to be robbed for it.
- Closing an account is a soft delete that keeps only what delivery history needs — the name.
- Location fixes are timestamped by the client but never trusted: an implausible time falls back to
  the server clock, so a stale position cannot be kept permanently "fresh".

**Compatibility**

*SRS targets:* any device with a supported browser, smartphone preferred; usable on low-bandwidth
3G with graceful handling of intermittent connectivity.

- Browser-based; no install, no app store, no native build.
- Payloads are JSON and small, and map tiles are the only heavy asset. Dropped polls and failed
  location posts are retried on the next tick rather than surfacing an error, so a tunnel costs
  freshness, not the screen.
- One browser map credential, referrer-restricted and quota-capped in Google Cloud.
- Cloudflare Workers runtime — code must stay inside it (no Node-only APIs on the request path).

## Assumptions & Dependencies

The SRS is explicit about what YADA takes for granted. All of it still holds, and each one is a way
the system can fail that is not a bug in it:

- Both sides have an internet-capable device with a modern browser. Couriers are assumed to be on a
  smartphone with location services on and a live data connection for the whole shift.
- Users grant the location permission. Without it a courier cannot be matched at all — dispatch
  reads the availability flag, then the position, and a rider with no fix is not in any ring.
- Google Maps Platform is reachable and the key's billing account is in good standing. Tiles,
  geocoding, autocomplete and routing are one vendor now, so they fail together: a disabled key
  takes out the map, the address search and the ETA at once. The landmark table is what still names
  a dropped pin when it does.
- The hosting infrastructure and network stay up. There is no offline mode and no local queue.
- Couriers know how to read a map and follow a route; the app hands them a destination, not
  turn-by-turn navigation.

## Getting Started

The application lives in [`App/`](App). Requires Node 20+ and a Neon Postgres database.

```bash
git clone <repo-url>
cd YADA/App

npm install
npm run db:migrate     # apply migrations
npm run dev            # http://localhost:5173
```

Create `App/.env` with at least the three required variables:

| Variable                             | Required | Notes                                                                             |
| ------------------------------------ | -------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`                       | yes      | Neon **pooled** connection string (the one containing `-pooler`)                  |
| `BETTER_AUTH_SECRET`                 | yes      | Random string. Also salts the `/api/couriers/nearby` marker refs                  |
| `BETTER_AUTH_URL`                    | yes      | Must exactly match the origin the browser uses, or sign-ins won't stick           |
| `GOOGLE_MAPS_API_KEY`                | no       | Maps JS, Places, Geocoding and Routes. Without it every map is the grid placeholder |
| `GOOGLE_MAPS_MAP_ID`                 | no       | Required for Advanced Markers. Defaults to `DEMO_MAP_ID`, which is not for production |
| `OAUTH_GOOGLE_CLIENT_ID` / `_SECRET` | no       | Google sign-in is skipped unless both are set                                     |
| `BREVO_API_KEY`                      | no       | Without it, mail is logged to the console instead of sent                         |
| `EMAIL_FROM` / `EMAIL_FROM_NAME`     | no       | `EMAIL_FROM` must be a **verified sender** in Brevo                               |
| `REALTIME_ENABLED`                   | no       | `false` in deployment — there is no socket server on Workers. Leave unset locally |

Full script list, contributor notes and the deeper architecture walkthrough are in
[`App/README.md`](App/README.md).

## Repository Layout

```
LICENSE              Apache-2.0 — the code
LICENSE-DOCS         CC BY 4.0 — Docs/ and Design/
NOTICE               attribution that travels with the code
THIRD-PARTY-NOTICES.md
App/                 the application — see App/README.md
  src/lib/shared/    pure logic, safe on either side (dispatch clock, trip status, geo)
  src/lib/server/    db, query layer, api-guard, email, validation
  src/routes/        (business), (courier), auth, api
  drizzle/           SQL migrations
Docs/
  database_erd.md    the schema, as a mermaid ERD
  api_schema.md      every endpoint, written from the handlers
  api_schema.yaml    the OpenAPI counterpart
  SRS Document.pdf   Software Requirements Specification v2.0
Design/              tokens, components, screens, captures
YADA Wireframes.html early wireframes
```

## Project Status

The first build is complete: accounts, dispatch, the full two-phase trip lifecycle, two-way
ratings, and the Cloudflare Workers deployment are all shipped. `App/README.md` carries the
itemised roadmap.

Nearest work, in order:

- Retune polling and pause it on `visibilitychange`.
- Configure Google OAuth credentials — the button is built and disabled until then.
- Tune the provisional constants against field data: the proximity radii (15 m and 31 m, both at or
  below typical phone-GPS error), the proximity/rating weights, and the cold-start prior. The
  *shape* should survive; the numbers may not.
- Verify the two hand-entered landmarks — neither matched an OSM feature, and a landmark in the
  wrong place misnames every pin near it.
- Unit tests for `dispatch.ts`, `matching.ts` and `trip-status.ts`.
- Close the SRS gaps that are real work rather than tuning: masked phone numbers for the handover
  contact, a routed feedback form and an in-app UI guide (SRS 3.5), an accessibility pass against
  the mobile guidelines, and sign-in rate limiting that survives more than one Workers isolate.

**Phase 2, per the SRS.** Scheduling deliveries in advance, demand heat maps or zone indicators to
help riders position themselves, and localisation of language and currency per market. None are
started, and none are needed by the single-business deployment.

**Deliberately out of scope.** YADA does not price, charge for or settle deliveries. The order value
is captured so a disputed handover has a number attached to it, and it is never shown to the courier.

## License

The application code is licensed under the **Apache License 2.0** — see [`LICENSE`](LICENSE). It is
a permissive licence: use it, fork it, run it commercially. The patent grant and the §5 contribution
terms are why it was picked over MIT for a project with several authors and no CLA.

The documentation and design assets in [`Docs/`](Docs) and [`Design/`](Design) are licensed
**CC BY 4.0** — see [`LICENSE-DOCS`](LICENSE-DOCS).

Maps, address search and routing come from **Google Maps Platform** and are governed by its
[terms of service](https://cloud.google.com/maps-platform/terms), which the SDK's own attribution
satisfies on screen.

One dataset is not Google's: the landmark table in `App/src/lib/shared/geo/landmarks.ts` holds 36
coordinates read from OpenStreetMap, **© OpenStreetMap contributors** under the
[ODbL 1.0](https://www.openstreetmap.org/copyright). It survived the move back to Google and keeps
its attribution — an insubstantial extract, so ODbL's share-alike does not reach this repository.
Dependency and data credits are recorded in [`NOTICE`](NOTICE) and
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

No dependency imposes a copyleft obligation: the tree is MIT, Apache-2.0, ISC, BSD and CC-BY
throughout. The only LGPL code is `sharp`'s libvips binaries, which are build tooling and never
reach either bundle.

## References

- [Software Requirements Specification v2.0](Docs/SRS%20Document.pdf) — revised 30 Aug 2026
- [Database ERD](Docs/database_erd.md)
- [API reference](Docs/api_schema.md) · [OpenAPI schema](Docs/api_schema.yaml)
- [Application README](App/README.md) — scripts, layout, contributor notes
- [Deployment guide](App/DEPLOYMENT.md)
- [License](LICENSE) (Apache-2.0) · [Docs & design license](LICENSE-DOCS) (CC BY 4.0) ·
  [Third-party notices](THIRD-PARTY-NOTICES.md)
