# YADA

On-demand motor courier dispatch for Favoire, a food business in the KNUST /
Ayeduase area of Kumasi. A business raises a delivery request, the app rings
nearby riders until one accepts, and both sides watch the trip to completion.

This directory is the application. Product background and the SRS live in the
repository root.

## Stack

| | |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 |
| Database | Postgres on Neon, via Drizzle ORM |
| Auth | Better Auth — email/password, Google OAuth, email verification |
| Maps | Google Maps JavaScript API (Maps, Places, Geocoding, Routes) |
| Realtime | Polling. Socket.IO in `vite dev` only — Workers has no always-on process |
| Email | Brevo |
| Deploy | Cloudflare Workers (`adapter-cloudflare`) |
| Styling | Tailwind CSS |

## Roadmap

### Shipped

**Accounts and access**
- [x] Email/password sign-up and sign-in, with the role (business or courier) chosen at sign-up
- [x] Email verification as a *soft* gate — it blocks sending a delivery and going online, never sign-in
- [x] Password reset by email
- [x] Google OAuth, including carrying the chosen role across the redirect in the signed OAuth state
- [x] `/welcome` completion flow for accounts that arrive missing a phone number, photo or plate
- [x] Profile photos, avatar-grade (~256 px data URLs — there is no object storage yet)

**Business**
- [x] Dashboard board of live and recent deliveries
- [x] New request: drop a pin or search with Places autocomplete, plus order name, value and notes
- [x] Nearby riders drawn on the map — anonymised, positions rounded to ~11 m
- [x] Live tracking: the rider's position, the ring the search has reached, and ETA
- [x] Cancel a delivery, up until the rider reaches the counter
- [x] Manual re-ring once a 60-second search has found nobody
- [x] Confirm the handover, gated on the rider's own reported position
- [x] Delivery history, and a business profile carrying the dispatch address and rating

**Courier**
- [x] Availability toggle — dispatch reads it before it reads a position
- [x] Offer board fed by the expanding-ring dispatcher
- [x] Accept, decline (remembered, so a re-ring doesn't ask again), or release a job already accepted
- [x] Pickup, delivery and completion screens, with completion gated on proximity to the drop-off
- [x] Orders and Trips lists, with a deliveries/distance summary
- [x] Settings: profile, plate number, theme
- [x] Background location reporting, tiered — 10 s idle, 2.5 s mid-trip

**Dispatch and trips**
- [x] Expanding-ring dispatcher (400 m → 800 m → 6 km → timeout) with no scheduler or timers
- [x] Offer windows staggered by rating, idle riders ringed before busy ones
- [x] Two-phase lifecycle with an explicit, position-checked handover between them
- [x] `trip_events` audit log behind every transition
- [x] Two-way ratings, smoothed by a cold-start prior so a newcomer is neither gifted the top nor buried
- [x] KNUST/Ayeduase service area, with landmark naming for dropped pins

**Platform**
- [x] Cloudflare Workers deployment — the only target
- [x] Live rider position over Socket.IO in `vite dev`; deployment polls `GET /api/trips`
- [x] Light/dark theme

### Next

- [ ] Apply migrations `0011` (business ratings) and `0012` (courier profile uniqueness)
- [ ] Retune polling before real usage — tracking 4 s → 8 s, and pause every poll on `visibilitychange`
- [ ] Enable Google sign-in by configuring the OAuth credentials (the button is built and disabled until then)
- [ ] Tune the provisional constants against field data: the 150 m proximity radii, the
      proximity/rating weights, and the cold-start prior. The *shape* should survive; the numbers may not
- [ ] Verify the two hand-entered landmarks (`knust-commercial`, `ayeduase-new-site`) — neither matched
      an OSM feature, and a landmark in the wrong place misnames every pin near it
- [ ] Unit tests for `dispatch.ts`, `matching.ts` and `trip-status.ts` — all pure functions, no runner configured yet

### Later

- [ ] Durable Object WebSockets with hibernation, replacing polling on the Cloudflare path.
      `REALTIME_ENABLED` is the flag this switches back on
- [ ] Push notifications — the courier settings screen has the toggles, nothing is wired behind them
- [ ] In-app support, and routing the feedback form somewhere (it currently only clears itself)
- [ ] Multi-language — the picker stores a choice in `localStorage`; there are no translations behind it
- [ ] Object storage (R2) for full-resolution photos, if courier verification ever needs the original
- [ ] Hyperdrive, only if Neon latency actually shows up in practice

**Deliberately out of scope.** YADA does not price, charge for or settle deliveries — the order value
is captured so a disputed handover has a number attached to it, and it is never sent to the courier app.
The business rating is informational and does not feed matching: riders are ranked for a job, businesses
are not.

## Getting started

Requires Node 20+ and a Neon Postgres database.

```bash
npm install
cp .env.example .env   # then fill it in — see below
npm run db:migrate
npm run dev            # http://localhost:5173
```

### Environment

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon **pooled** connection string (the one containing `-pooler`) |
| `BETTER_AUTH_SECRET` | yes | Random string. Also salts the `/api/couriers/nearby` marker refs |
| `BETTER_AUTH_URL` | yes | Must exactly match the origin the browser uses, or sign-ins won't stick |
| `GOOGLE_MAPS_API_KEY` | yes | Browser-restricted key; served only to signed-in users |
| `GOOGLE_MAPS_MAP_ID` | no | Defaults to `DEMO_MAP_ID` |
| `OAUTH_GOOGLE_CLIENT_ID` / `_SECRET` | no | Google sign-in is skipped if unset |
| `BREVO_API_KEY` | no | Without it, mail is logged to the console instead of sent |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | no | `EMAIL_FROM` must be a **verified sender** in Brevo |
| `REALTIME_ENABLED` | no | `false` in deployment — there is no socket server on Workers. Leave unset locally |

## Scripts

```bash
npm run dev          # Vite dev server, with Socket.IO attached
npm run build        # Cloudflare Workers build
npm run cf:dev       # build + wrangler dev, to exercise the Workers runtime locally
npm run check        # svelte-check
npm run format       # Prettier
npm run db:generate  # generate a migration from schema.ts
npm run db:migrate   # apply pending migrations
npm run test:e2e     # Playwright
npm run deploy       # build + wrangler deploy
```

## Layout

```
src/
  lib/
    shared/     pure logic, safe to import from either side
                  dispatch.ts     the ring clock
                  trip-status.ts  the status vocabulary and state machine
                  geo/            distance, service area, framing, landmarks
    server/     never reaches the browser
                  db/             schema, numeric-column helpers, the per-request
                                  Neon connection
                  data/           the query layer — courier-profile, courier-trips,
                                  dispatch, matching, ratings, trip-transition
                  api-guard.ts    apiRoute(): the session/role/verified checks
                                  every /api route shares
                  email/          Brevo, templates, throttle
                  validation/     phone, plate, photo
    client/     maps loader, geocoding, routing, theme
    components/ shared UI
  routes/
    (business)/ dashboard, request, tracking, history, profile
    (courier)/  home, pickup, deliver, complete, orders, trips, settings
    auth/       sign-in and sign-up, plus the Better Auth config
    api/        JSON endpoints — trips, courier actions, location, ratings
drizzle/        SQL migrations
```

Route groups each have a `+layout.server.ts` that gates the whole workspace:
signed-out visitors go to `/auth`, and an account in the wrong role is redirected
to its own home rather than shown an error.

## How dispatch works

A request rings riders in **expanding rings** — 400 m for the first 15 seconds,
800 m until 35, then the whole 6 km match radius until a 60-second timeout. After
that nobody is ringed and the business re-rings manually.

There is deliberately **no timer or scheduler anywhere**. The ring in force is a
pure function of `now − dispatch_started_at`, recomputed wherever it's needed: the
courier board evaluates it when it polls, the tracking screen evaluates it to show
the business what's happening, and a server restart forgets nothing because
nothing was remembered.

Priority is emergent rather than orchestrated. `offerWindow` gives each courier
the second their alert opens — by distance, delayed if they're already carrying a
parcel, staggered by rating — so nearer beats further, idle beats busy, and
higher-rated beats lower-rated within a ring, without anything ever being
excluded outright. Declines are remembered in `trip_declines`, so a rider who
said no is not asked again, including after a manual re-ring.

## Trip lifecycle

```
requested ──accept──▶ accepted ──rider nears pickup──▶ courier_arriving
                                                              │
                                        business confirms handover
                                                              ▼
completed ◀──rider at drop-off── in_progress ◀──start── picked_up
```

Two phases with an explicit handover between them. The business confirms the
pickup, not the courier — a rider who could mark their own could mark it from the
road — and both confirmations are gated on the rider's last reported position.
Either side can call the trip off until the rider reaches the counter; after that
it's a conversation, not a button. A courier releasing a job they'd accepted
returns it to the board rather than cancelling it, since the business still wants
their parcel moved.

## Notes for contributors

- **Nothing that touches the database may escape `withRequestDatabase`.** On
  Workers the pool is per-request; a pool cached across requests hands the next
  one a WebSocket from a dead I/O context, and the query then never settles. See
  the comment in `src/lib/server/db/index.ts`.
- **State transitions are conditional UPDATEs, not check-then-write.** Go through
  `applyTripChange` in `data/trip-transition`: the predicates your checks assumed
  belong on the `UPDATE ... WHERE`, and whether a row matched is the only
  trustworthy answer to "did it happen". The ring alerts several riders at once, so
  races are the normal case, not an edge one.
- **Authenticated `/api` routes are wrapped in `apiRoute`**, which handles the
  session, the workspace role and the email gate. Per-route authorisation is a
  question about a *row* and stays in the query that loads it.
- `$lib/shared` cannot import `$lib/server`, and components cannot import either
  one's server half. `$lib/utils/types.ts` is the neutral ground.
- Roles are set server-side only. `role` is `input: false` in the Better Auth
  config precisely so no request body can set it.
- Email verification is a **soft** gate: it never blocks sign-in, only the two
  actions that reach other people — sending a delivery, and going online.
