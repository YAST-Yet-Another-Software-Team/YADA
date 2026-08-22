# YADA – Motor Courier Request Web Application

YADA is a web application that streamlines on-demand motor courier delivery for Favoire, a food
business in the KNUST / Ayeduase area of Kumasi. It replaces manual delivery coordination — phone
calls and text messages — with a single platform where the business raises a request, the app rings
nearby riders until one accepts, and both sides watch the trip through to completion.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Actors](#actors)
- [Non-Functional Requirements](#non-functional-requirements)
- [Getting Started](#getting-started)
- [Repository Layout](#repository-layout)
- [Project Status](#project-status)
- [References](#references)

## Overview

**Favoire** is a business that relies on motor delivery and coordinates couriers manually, which is
slow, time-consuming and hard to track. YADA solves this by letting the business request a courier,
matching the request to a nearby available **Courier**, and tracking the delivery in real time from
request through completion.

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
- Every transition is written to a `trip_events` audit log.

### Ratings & Feedback

- Two-way ratings on completed deliveries: the business rates the rider who carried it, the rider
  rates the business they carried for. One row per rater, so the two directions are independent.
- Averages are smoothed by a cold-start prior, so a newcomer is neither gifted the top of the board
  nor buried beneath it.
- The courier's rating feeds matching. The business's is informational — riders are ranked for a
  job, businesses are not.

### Customer Support *(planned)*

In-app support is not yet built. The feedback form currently only clears itself; routing it
somewhere is on the roadmap, along with push notifications and multi-language.

## Tech Stack

|            |                                                                                     |
| ---------- | ----------------------------------------------------------------------------------- |
| Framework  | SvelteKit 2 + Svelte 5                                                              |
| Database   | Postgres on Neon, via Drizzle ORM                                                   |
| Auth       | Better Auth — email/password, Google OAuth, email verification                      |
| Maps       | MapLibre GL with OpenStreetMap tiles                                                |
| Geocoding  | Photon, with Nominatim as the fallback — both keyless, both reading the same OSM data |
| Routing    | OpenRouteService, proxied server-side through `/api/geo/route`                       |
| Realtime   | Polling. Socket.IO in `vite dev` only — Workers has no always-on process             |
| Email      | Brevo                                                                                |
| Deploy     | Cloudflare Workers (`adapter-cloudflare`)                                            |
| Styling    | Tailwind CSS                                                                         |

The whole map stack is keyless in the browser on purpose. The single credential left is the
OpenRouteService key, and it never reaches the client — ORS keys cannot be referrer-locked the way
a browser Maps key could, so routing is proxied instead.

## System Architecture

YADA has two active actors — **Business** and **Courier** — both accessing the system directly and
simultaneously through a browser-based client. It is one SvelteKit application serving both
workspaces: route groups (`(business)`, `(courier)`) with a server layout that gates each one, page
loaders for the screens, and a JSON API for everything the client does after a page is on screen.

- **Client** — Svelte 5 in the browser, mobile-first. MapLibre for maps; geocoding and route caching
  on the client; alerts synthesised in Web Audio, so there is no audio asset to ship.
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

**Performance**

- Dispatch does no scheduled work: the ring is computed on read, so an idle request costs nothing.
- Ratings are cached on the profile row and refreshed when a rating lands, so no screen
  re-aggregates to name a rider or a business.
- Poll intervals are deliberate: 4 s on the tracking and pickup screens, 10 s for nearby riders,
  10 s / 2.5 s for location reporting. Retuning tracking to 8 s and pausing polls on
  `visibilitychange` is queued before real usage.

**Security**

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
- The routing key stays server-side; the proxy is signed-in-only, so it can't become someone else's
  free routing API.

**Scalability**

- Stateless by construction — no timers, no in-memory dispatch state, nothing to lose on restart.
- A per-request Neon pool, which is what the Workers runtime requires; a pool cached across requests
  hands the next one a socket from a dead I/O context.
- Polling is the deployment realtime path today. Durable Object WebSockets with hibernation are the
  planned replacement, behind the `REALTIME_ENABLED` flag.

**Usability**

- Two purpose-built workspaces rather than one screen with role switches.
- Light and dark themes.
- Dropped pins are named against a landmark table, so an address reads like somewhere in Kumasi
  rather than a coordinate.
- Bell alerts on both sides — a rider when a request rings them, a business when a rider is
  assigned, reaches the counter and reaches the drop-off — silenceable from Settings.
- Email confirmation never stands between someone and their own workspace.

**Privacy & Compliance**

- Nearby riders are anonymised: no names, no ratings, a per-process salted marker reference, and
  positions rounded to about eleven metres. There is no way to follow one particular person.
- The order's value is never sent to the courier app. A rider carries the parcel either way, and a
  value on their screen is a reason to be robbed for it.
- Closing an account is a soft delete that keeps only what delivery history needs — the name.
- Location fixes are timestamped by the client but never trusted: an implausible time falls back to
  the server clock, so a stale position cannot be kept permanently "fresh".

**Compatibility**

- Browser-based; no install, no app store, no native build.
- Keyless map stack, so the client needs no credential of its own.
- Cloudflare Workers runtime — code must stay inside it (no Node-only APIs on the request path).

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
| `MAP_STYLE_URL`                      | no       | MapLibre style document. Defaults to the OpenFreeMap Liberty style                |
| `ORS_API_KEY`                        | no       | OpenRouteService. Without it, routing returns `503` and the app falls back to estimates |
| `OAUTH_GOOGLE_CLIENT_ID` / `_SECRET` | no       | Google sign-in is skipped unless both are set                                     |
| `BREVO_API_KEY`                      | no       | Without it, mail is logged to the console instead of sent                         |
| `EMAIL_FROM` / `EMAIL_FROM_NAME`     | no       | `EMAIL_FROM` must be a **verified sender** in Brevo                               |
| `REALTIME_ENABLED`                   | no       | `false` in deployment — there is no socket server on Workers. Leave unset locally |

Full script list, contributor notes and the deeper architecture walkthrough are in
[`App/README.md`](App/README.md).

## Repository Layout

```
App/                 the application — see App/README.md
  src/lib/shared/    pure logic, safe on either side (dispatch clock, trip status, geo)
  src/lib/server/    db, query layer, api-guard, email, validation
  src/routes/        (business), (courier), auth, api
  drizzle/           SQL migrations
Docs/
  database_erd.md    the schema, as a mermaid ERD
  api_schema.md      every endpoint, written from the handlers
  api_schema.yaml    the OpenAPI counterpart
  SRS Document.pdf   Software Requirements Specification v1.0
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

**Deliberately out of scope.** YADA does not price, charge for or settle deliveries. The order value
is captured so a disputed handover has a number attached to it, and it is never shown to the courier.

## References

- [Software Requirements Specification v1.0](Docs/SRS%20Document.pdf)
- [Database ERD](Docs/database_erd.md)
- [API reference](Docs/api_schema.md) · [OpenAPI schema](Docs/api_schema.yaml)
- [Application README](App/README.md) — scripts, layout, contributor notes
- [Deployment guide](App/DEPLOYMENT.md)
