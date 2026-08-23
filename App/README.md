# YADA

**Yet Another Delivery App** is on-demand motor courier dispatch, built as one SvelteKit
application serving two workspaces. A business raises a delivery request, the app rings nearby
riders until one accepts, and both sides watch the trip through to completion.

The audience is two classes of people: businesses that lean on motor delivery, and motor couriers
looking for that work. **Favorie**, a food business in the KNUST / Ayeduase area of Kumasi, is the
first business using it, the first user rather than the specification. Nothing in the system is
named after them and no code path is special-cased for them.

There are exactly two actors and no administrator. Everything a person can do, they do for their
own account or for a delivery they are personally on. There is no privileged role, and no endpoint
that takes someone else's id.

This directory is the application. The repository map is in the [root README](../README.md), and
the SRS, ERD and API reference are in [`Docs/`](../Docs).

## Contents

- [Features](#features)
- [Stack](#stack)
- [Getting started](#getting-started)
- [The `.env`](#the-env), which is where the credentials come from
- [Scripts](#scripts)
- [Layout](#layout)
- [How dispatch works](#how-dispatch-works)
- [Trip lifecycle](#trip-lifecycle)
- [Roadmap](#roadmap)
- [Notes for contributors](#notes-for-contributors)

## Features

### Many deliveries at once

This is the thing YADA is built around. A busy kitchen has several orders leaving within the same
few minutes, so nothing in the system is a queue of one.

**A business can have as many deliveries in flight as it has orders.** Each request carries its own
dispatch clock, rings its own set of riders, and is tracked on its own screen. The dashboard is a
board of every live delivery rather than a single active job, and two requests raised seconds apart
never queue behind one another, because the ring serving each one is computed per request at the
moment it is read.

**A rider can chain the next job onto the one they are carrying.** A courier who is already
carrying a parcel keeps hearing offers, filtered to those whose pickup sits within 400 m of where
their current trip ends. A rider finishing on one street can take the next job on the same street
instead of going idle and starting the search over. Idle riders keep priority, since a busy rider's
alert opens three seconds later, so chaining never costs a free rider the work.

**Concurrency is handled where it actually happens, in the claim.** The ring alerts several riders
for the same request at the same moment, so two riders tapping Accept is the normal case rather
than an edge one. Every state change is a single conditional UPDATE, so the race resolves as one
winner and one "gone already", with no lock, no queue and no double assignment.

### Dispatch that widens on its own

A request rings riders in expanding rings: 400 m for the first 15 seconds, 800 m until 35, then the
whole 6 km match radius until a 60-second timeout. Priority is emergent rather than orchestrated.
Each rider's alert opens at a second derived from their distance, whether they are already carrying
a parcel, and their rating, so nearer beats further, idle beats busy, and higher rated beats lower
rated, without anyone being excluded outright.

A decline is remembered, so a re-ring never asks the same rider twice. If the 60 seconds pass with
nobody accepting, the request returns to the business, which re-rings or cancels rather than
watching it disappear.

There is no scheduler and no timers anywhere. The ring in force is a pure function of
`now − dispatch_started_at`, recomputed wherever it is needed, so an idle request costs nothing and
a server restart forgets nothing.

### For the business

- A board of live and recent deliveries, each with its stage, its rider and its measured ride time.
- A new request takes the destination by dropped pin or address search, plus the order name, its
  value and optional notes. The pickup is the business's stored dispatch address, so a request
  cannot nominate its own origin.
- Nearby riders drawn on the map before booking, anonymised: no names, no ratings, a salted marker
  reference, and positions rounded to about eleven metres. It shows supply, not people.
- A route estimate, distance and duration, drawn before the request is confirmed and stored with
  the trip, so the business books against a number and the dashboard can show an ETA before the
  first position fix arrives.
- Live tracking: the rider's position, the ring the search has reached, and the ETA.
- Cancel up until the rider reaches the counter, and a manual re-ring for a search that found
  nobody.
- The handover confirmation, gated on the rider's own reported position.
- Delivery history, and a profile carrying the dispatch address and trading name.

### For the courier

- An availability toggle, which dispatch reads before it reads a position.
- An offer board fed by the ring, showing the distance the dispatcher actually ranked them by.
- Accept, decline or release a job already accepted. Releasing returns it to the board rather than
  cancelling it, because the business still wants their parcel moved.
- Pickup, delivery and completion screens, with completion gated on proximity to the drop-off.
- Orders and Trips lists, with a deliveries and distance summary.
- Background location reporting, tiered at 10 s idle and 2.5 s mid-trip, which runs only while the
  rider is online or on a trip.
- A plate number, so the business can match the bike at the counter.

**The courier is never shown the order's value.** A rider carries the parcel either way, and a
value on their screen is a reason to be robbed for it.

### Accounts

Email and password sign-up and sign-in, with the role, business or courier, chosen at sign-up and
set server-side only. Google OAuth carries that role across the redirect in signed OAuth state, and
registers only when credentials are configured. Password reset by email.

Email verification is a soft gate. It never blocks sign-in or reading your own workspace, only the
two actions that reach other people: sending a delivery, and going online. Accounts arriving
without a phone number, photo or plate get a `/welcome` completion flow, and profile photos are
avatar grade at roughly 256 px.

Closing your own account is a soft delete. Credentials, sessions, email, phone and photo go, the
name stays so past deliveries can still say who was on them, and closure is refused while a
delivery is still in flight.

### Everywhere

- Light and dark themes, over the tokens in [`Design/tokens`](../Design/tokens).
- Bell alerts on both sides, synthesised in Web Audio so there is no audio asset to ship, and
  silenceable from Settings.
- Dropped pins named against a landmark table, so an address reads like somewhere in Kumasi rather
  than a pair of coordinates.
- Two purpose-built workspaces rather than one screen with role switches. The courier side is used
  one-handed on a bike, so it has large controls and shallow interaction depth.
- Every transition written to a `trip_events` audit log, alongside the trip's own telemetry.

## Stack

|           |                                                                               |
| --------- | ----------------------------------------------------------------------------- |
| Framework | SvelteKit 2 with Svelte 5                                                     |
| Database  | Postgres on Neon, via Drizzle ORM                                             |
| Auth      | Better Auth: email and password, Google OAuth, email verification             |
| Maps      | Google Maps JavaScript API (Maps, Places, Geocoding, Routes)                  |
| Realtime  | Polling, plus Socket.IO in `vite dev`, since Workers has no always-on process |
| Email     | Brevo                                                                         |
| Deploy    | Cloudflare Workers (`adapter-cloudflare`)                                     |
| Styling   | Tailwind CSS, over the tokens in [`Design/tokens`](../Design/tokens)          |

Maps, geocoding, autocomplete and routing all bill against one Google Maps key, and that key
reaches the browser by design, because the Maps JavaScript API authenticates the client directly
and cannot be proxied. It is protected by an HTTP referrer restriction and a quota cap in Google
Cloud rather than by secrecy, and it is withheld from signed-out visitors, since every map sits
behind a workspace gate and the public landing page never carries it.

Because they are one vendor they also fail together, so a disabled key takes out the map, the
address search and the ETA at once. The landmark table is what still names a dropped pin when that
happens.

## Getting started

**Prerequisites**

- Node 20 or newer, which `engines` enforces
- A Neon Postgres database, where the free tier is enough
- A Google Cloud project with billing enabled, if you want maps to render

```bash
npm install
# create .env, described in the next section, which is the step that matters
npm run db:migrate     # apply migrations to the database in DATABASE_URL
npm run dev            # http://localhost:5173
```

`npm run dev` starts Vite with Socket.IO attached, so live rider position works locally. Without a
`.env` the server starts and then fails on the first database call, so do that first.

## The `.env`

`.env` lives in this directory, at `App/.env`, and it is gitignored. So is `.env.example`, which is
why the template below lives in this README instead of in a file you can copy. Nothing here is
generated for you: every value is one you go and obtain.

Start from this template and fill it in:

```bash
# --- required ---------------------------------------------------------------
DATABASE_URL=postgresql://user:pass@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:5173

# --- maps (everything map-shaped is dead without these) ---------------------
GOOGLE_MAPS_API_KEY=
GOOGLE_MAPS_MAP_ID=

# --- optional ---------------------------------------------------------------
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
BREVO_API_KEY=
EMAIL_FROM=
EMAIL_FROM_NAME=YADA
```

### `DATABASE_URL`, from Neon

1. Sign up at [neon.tech](https://neon.tech) and create a project. Pick the region nearest your
   users, since the Workers deployment talks to it over HTTP rather than a persistent socket.
2. In the project dashboard, open **Connect** and copy the connection string.
3. Take the **pooled** one, whose host contains `-pooler`. The unpooled string works locally and
   then exhausts connections in deployment, where every request opens its own pool.
4. Keep `?sslmode=require`.

`npm run db:migrate` applies [`drizzle/`](drizzle) to whatever this points at, and
`npm run db:studio` opens a browser table browser against the same database.

### `BETTER_AUTH_SECRET`, which you generate

```bash
openssl rand -base64 32
```

Any long random string will do. It signs sessions and also salts the marker references in
`GET /api/couriers/nearby`, so changing it invalidates every session and reshuffles those
anonymised ids. That is harmless, but it is a reason not to rotate it casually.

### `BETTER_AUTH_URL`, the origin, exactly

Use `http://localhost:5173` in development and the deployed origin in production. It must exactly
match the origin the browser uses, because Better Auth derives cookie and trusted-origin behaviour
from it. A mismatch, `127.0.0.1` in one place and `localhost` in the other, produces sign-ins that
appear to succeed and then do not stick, with no error anywhere.

`BETTER_AUTH_TRUSTED_ORIGINS` takes a comma-separated list of extra origins if you need one, such
as a preview deployment.

### `GOOGLE_MAPS_API_KEY` and `GOOGLE_MAPS_MAP_ID`, from Google Cloud

In the [Google Cloud console](https://console.cloud.google.com):

1. Create a project and **enable billing on it**. Maps Platform will not serve a project without a
   billing account attached, free credit or not.
2. Open **APIs & Services → Library** and enable all four, which are separate products sharing one
   key:
   - **Maps JavaScript API**, the map itself
   - **Places API (New)**, the as-you-type predictions in the location pickers
   - **Geocoding API**, which names a dropped pin and resolves a typed address
   - **Routes API**, which produces the distance and duration estimate
3. Open **APIs & Services → Credentials → Create credentials → API key**, and copy it into
   `GOOGLE_MAPS_API_KEY`.
4. Restrict it, because it is served to the browser:
   - Under _Application restrictions_, choose **HTTP referrers** and list `http://localhost:5173/*`
     along with your deployed origin.
   - Under _API restrictions_, select the four APIs above and nothing else.
   - Set a **quota cap** per API while you are there. The referrer restriction is what makes a
     copied key worthless off your domains, and the cap is what makes a mistake survivable.
5. Open **Google Maps Platform → Map management → Create map ID**, with map type **JavaScript** and
   rendering **Vector**, then copy the id into `GOOGLE_MAPS_MAP_ID`.

> **The Map ID is the one that fails silently.** Advanced Markers require a vector Map ID. A wrong
> or raster value draws the basemap perfectly and then renders no markers at all, with nothing in
> the console. If the map looks fine and is empty, suspect this before anything else. Left unset it
> falls back to `DEMO_MAP_ID`, which is watermarked and for development only.

With no `GOOGLE_MAPS_API_KEY` at all, every map degrades to the grid placeholder and address search
and ETAs stop working. The rest of the app still runs.

### `OAUTH_GOOGLE_CLIENT_ID` and `OAUTH_GOOGLE_CLIENT_SECRET`, optional

Google sign-in registers only when both are set. Otherwise the provider is skipped entirely and the
button stays disabled. Use the same Cloud project:

1. Open **APIs & Services → OAuth consent screen** and configure it. External is fine, and you can
   add yourself as a test user while it is unpublished.
2. Open **Credentials → Create credentials → OAuth client ID → Web application**.
3. Set the authorised redirect URI to `<BETTER_AUTH_URL>/api/auth/callback/google`, so
   `http://localhost:5173/api/auth/callback/google` locally. That path is where the Better Auth
   handler is mounted, in `hooks.server.ts`.
4. Copy the client id and secret in.

### `BREVO_API_KEY`, `EMAIL_FROM` and `EMAIL_FROM_NAME`, optional

Email carries verification and password reset. SMTP is impossible on Workers, because workerd has
no raw TCP sockets, so nodemailer and every other SMTP client is out regardless of `nodejs_compat`.
It has to be an HTTP API, and the choice is Brevo, which verifies a single sender address by
emailing you a link. That is the only thing that works when there is no domain to publish DNS into,
and it gives 300 sends a day free.

1. Create an account at [brevo.com](https://www.brevo.com).
2. Open **Senders, Domains & Dedicated IPs → Senders**, add your address, and click the link it
   sends you.
3. Open **SMTP & API → API keys** and create one. That is `BREVO_API_KEY`.
4. Set `EMAIL_FROM` to the address you just verified, since Brevo rejects any sender it has not
   verified.

Leaving all of this unset is a supported configuration and the right one locally. The app falls
back to a console transport that prints the mail to the terminal, so you can copy the verification
link out of the log with no inbox involved. `EMAIL_TRANSPORT=console` forces that even where a key
is set.

Setting `BREVO_API_KEY` while leaving `EMAIL_FROM` unset also falls back to the console, and says
so at start-up, because Brevo refuses every send from an address nobody has verified. Watch the
logs for `[email]`.

> **Deliverability wants a domain you control.** Verifying an address satisfies Brevo and nothing
> else, because Gmail, Yahoo and Microsoft check the domain: they want SPF and DKIM that align with
> the `From:` domain. Sending as an address whose DNS you cannot edit means neither can align, and
> a `p=quarantine` policy on that domain will spam-folder the mail. The fix is a sending domain of
> your own, authenticated under Brevo → Domains with the `brevo-code`, DKIM and DMARC TXT records
> it generates, with `EMAIL_FROM` pointed at it.

### The rest

| Variable                      | Default           | What it is                                                                                |
| ----------------------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| `REALTIME_ENABLED`            | on unless `false` | `false` in deployment, since there is no socket server on Workers. Leave it unset locally |
| `EMAIL_TRANSPORT`             | unset             | `console` forces log-only mail even where `BREVO_API_KEY` is set                          |
| `EMAIL_ASSET_ORIGIN`          | `BETTER_AUTH_URL` | Where email templates load images from, when that differs from the app origin             |
| `BETTER_AUTH_TRUSTED_ORIGINS` | unset             | Comma-separated extra origins accepted alongside `BETTER_AUTH_URL`                        |
| `SOCKET_CORS_ORIGIN`          | unset             | The origin allowed to reach the dev Socket.IO server                                      |

### When something is missing

| Missing                    | What you see                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | Every page 500s on the first query                                                    |
| `BETTER_AUTH_SECRET`       | Auth refuses to start                                                                 |
| `BETTER_AUTH_URL` wrong    | Sign-in appears to succeed, then the session is gone on the next request              |
| `GOOGLE_MAPS_API_KEY`      | The grid placeholder instead of every map, with no address search or ETA              |
| `GOOGLE_MAPS_MAP_ID` wrong | The basemap renders and every marker silently vanishes                                |
| The OAuth pair             | Google sign-in is disabled, and password sign-in is unaffected                        |
| `BREVO_API_KEY`            | Mail is printed to the console instead of sent, which is what local development wants |

### Deployment

The same variables go to Cloudflare, with secrets through `wrangler secret put` and the rest as
vars in [`wrangler.jsonc`](wrangler.jsonc). `REALTIME_ENABLED` must be `false` there,
`BETTER_AUTH_URL` must be the deployed origin, and the Maps key's referrer restriction must list
it. `DEPLOYMENT.md` in this directory carries the full walkthrough and the reasoning behind each
choice. Note that it is untracked by git, since `.gitignore` excludes `*.md` except this README, so
it is a local document.

## Scripts

```bash
npm run dev          # Vite dev server, with Socket.IO attached
npm run build        # Cloudflare Workers build
npm run cf:dev       # build + wrangler dev, to exercise the Workers runtime locally
npm run check        # svelte-check
npm run lint         # Prettier, check only
npm run format       # Prettier, write
npm run db:generate  # generate a migration from schema.ts
npm run db:migrate   # apply pending migrations
npm run db:studio    # Drizzle Studio against DATABASE_URL
npm run test:e2e     # Playwright
npm run deploy       # build + wrangler deploy
```

> The `drizzle/meta` snapshot chain was rebuilt on 2026-08-20 and verified against the live
> database, so `db:generate` produces correct incremental migrations. Generate them rather than
> hand-writing them, and never edit `drizzle/meta` by hand. See `drizzle/README.md` for the detail.

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
                  data/           the query layer: courier-profile, courier-trips,
                                  dispatch, matching, ratings, trip-transition
                  api-guard.ts    apiRoute(), the session/role/verified checks
                                  every /api route shares
                  email/          Brevo, templates, throttle
                  validation/     phone, plate, photo
    client/     maps loader, geocoding, routing, theme, sound alerts
    components/ shared UI
  routes/
    (business)/ dashboard, request, tracking, history, profile
    (courier)/  home, pickup, deliver, complete, orders, trips, settings
    auth/       sign-in and sign-up, plus the Better Auth config
    api/        JSON endpoints: trips, courier actions, location, ratings
  hooks.server.ts  the only mount of the Better Auth handler, and the request DB scope
drizzle/        SQL migrations
```

One SvelteKit application serves both workspaces. Each route group has a `+layout.server.ts` that
gates the whole workspace, so signed-out visitors go to `/auth` and an account in the wrong role is
redirected to its own home rather than shown an error. There are eleven tables: four for Better
Auth, two role profiles, and the dispatch domain around `delivery_requests`. See
[`Docs/database_erd.md`](../Docs/database_erd.md).

## How dispatch works

A request rings riders in expanding rings: 400 m for the first 15 seconds, 800 m until 35, then the
whole 6 km match radius until a 60-second timeout. After that nobody is ringed and the business
re-rings manually, so the request returns to the business rather than being silently dropped.

There is deliberately no timer or scheduler anywhere. The ring in force is a pure function of
`now − dispatch_started_at`, recomputed wherever it is needed. The courier board evaluates it when
it polls, the tracking screen evaluates it to show the business what is happening, and a server
restart forgets nothing because nothing was remembered. An idle request costs nothing.

Priority is emergent rather than orchestrated. `offerWindow` gives each courier the second their
alert opens, by distance, delayed by three seconds if they are already carrying a parcel, and
staggered by up to five seconds by rating. Nearer beats further, idle beats busy, and higher rated
beats lower rated within a ring, without anything ever being excluded outright. Ordering among
riders already ringing uses `courierMatchScore`, which weights proximity at 0.7 against rating at
0.3, with the rating smoothed by a cold-start prior so a newcomer is neither gifted the top of the
board nor buried beneath it.

A busy rider is ringed from where their current trip ends rather than where they are, and only when
that drop-off is inside the first ring of the new pickup. That is what makes chaining a second job
onto the first work without sending a rider backwards. Declines are remembered in `trip_declines`,
so a rider who said no is not asked again, including after a manual re-ring.

## Trip lifecycle

```
requested ──accept──▶ accepted ──rider nears pickup──▶ courier_arriving
                                                              │
                                        business confirms handover
                                                              ▼
completed ◀──rider at drop-off── in_progress ◀──start── picked_up
```

Two phases, with an explicit handover between them:

- The business confirms the pickup, not the courier, because a rider who could mark their own could
  mark it from the road. Both handover confirmations are gated on the rider's last reported
  position, at 15 m for the pickup and 31 m for the drop-off.
- Reaching the pickup is observed rather than declared. The rider's own location fix flips the trip
  to `courier_arriving`, so neither app has to remember to say so.
- Either side can call the trip off until the rider reaches the counter. After that it is a
  conversation, not a button.
- A courier releasing a job they had accepted returns it to the board rather than cancelling it,
  because the business still wants their parcel moved.
- Every transition is written to a `trip_events` audit log, alongside the trip's own telemetry.

The SRS states the machine as requested, accepted, courier arriving, arrived, picked up, then
completed or cancelled. The build carries no separate `arrived`, because the business's handover
confirmation is what moves the trip on, which makes arrival at the counter a position rather than a
state. The leg from pickup to drop-off is `in_progress`. The order and the cancellation rules are
unchanged.

## Roadmap

### Shipped

- Accounts: email and password, Google OAuth, the soft email gate, password reset, the `/welcome`
  completion flow, avatar-grade photos, and self-service closure as a soft delete
- Business: the dashboard board, new requests by pin or autocomplete, anonymised nearby riders,
  live tracking with an ETA, cancellation, manual re-ring, the position-checked handover, history
  and profile
- Courier: the availability toggle, the ring-fed offer board, accept, decline and release, the
  pickup through completion screens, Orders and Trips with a distance summary, settings, and tiered
  background location reporting
- Dispatch: the expanding-ring dispatcher with no scheduler, staggered offer windows, chaining for
  busy riders, remembered declines, the two-phase lifecycle, the `trip_events` audit log, two-way
  ratings with a cold-start prior, and the KNUST and Ayeduase service area with landmark naming
- Platform: the Cloudflare Workers deployment, Socket.IO in development with polling in deployment,
  light and dark themes, and silenceable Web Audio bell alerts

### Planned

- Durable Object WebSockets with hibernation, replacing polling on the Cloudflare path.
  `REALTIME_ENABLED` is the flag that switches back on.
- Push notifications, for which the courier settings screen already has the toggles.
- Unit tests for `dispatch.ts`, `matching.ts` and `trip-status.ts`, all of which are pure functions.
- Tuning the dispatch constants against field data, which is expected to move the numbers while the
  shape stays.
- Scheduling deliveries in advance, and demand indicators that help riders position themselves.
- Localisation of language and currency per market, behind the picker that already stores a choice.
- Object storage on R2 for full-resolution photos, if courier verification ever needs the original.

**Deliberately out of scope.** YADA does not price, charge for or settle deliveries. The order value
is captured so a disputed handover has a number attached to it, and it is never sent to the courier
app. The business rating is informational and does not feed matching, because riders are ranked for
a job and businesses are not.

## Notes for contributors

- **Nothing that touches the database may escape `withRequestDatabase`.** On Workers the pool is
  per-request, and a pool cached across requests hands the next one a WebSocket from a dead I/O
  context, after which the query never settles. See the comment in `src/lib/server/db/index.ts`.
- **State transitions are conditional UPDATEs, not check-then-write.** Go through `applyTripChange`
  in `data/trip-transition`. The predicates your checks assumed belong on the `UPDATE ... WHERE`,
  and whether a row matched is the only trustworthy answer to "did it happen". Several riders are
  ringed at once, so races are the normal case.
- **Authenticated `/api` routes are wrapped in `apiRoute`**, which handles the session, the
  workspace role and the email gate. Per-route authorisation is a question about a row, so it stays
  in the query that loads it. A trip you are not on answers `404` rather than `403`, so a miss and
  someone else's delivery are indistinguishable to anyone probing ids.
- **A deleted route export is invisible to `svelte-check` and to `npm run build`.**
  `src/routes/api/routes.e2e.ts` asserts that every endpoint answers `401` rather than `405` for a
  signed-out caller, so run it before trusting a refactor that touched route files.
- `$lib/shared` cannot import `$lib/server`, and components cannot import either one's server half.
  `$lib/utils/types.ts` is the neutral ground.
- Roles are set server-side only. `role` is `input: false` in the Better Auth config precisely so no
  request body can set it.
- Email verification is a soft gate. It never blocks sign-in, only the two actions that reach other
  people: sending a delivery, and going online.
- Profile photos are restricted to `data:image/(png|jpeg|webp)`, because that string ends up in an
  `<img src>` and `data:text/html` can carry script.
- The three `better-auth` packages are pinned exactly rather than caretted, for the reason spelled
  out in `package.json` under `//better-auth`. Lift all three together or none.
