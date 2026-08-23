# YADA — API Reference

Every server endpoint under [`App/src/routes/api`](../App/src/routes/api), as implemented.
The machine-readable counterpart is [`api_schema.yaml`](api_schema.yaml).

YADA is a SvelteKit app, so this HTTP API is only half the server surface: the workspace
screens load their data through `+page.server.ts` loaders and form actions, and these routes
are what the client calls *after* a page is on screen — dispatch actions, location fixes,
profile edits. Anything not listed here is a page loader, not an endpoint.

- **Base URL** — the app's own origin (`http://localhost:5173` in dev).
- **Content type** — `application/json` in both directions, except `GET` routes which take
  query parameters.
- **Authentication** — a Better Auth session cookie. `src/hooks.server.ts` resolves it into
  `locals.user` on every request; `apiRoute` in
  [`$lib/server/api-guard`](../App/src/lib/server/api-guard.ts) turns a missing one into `401`.

## The response envelope

Success is always `{ "ok": true, ... }`. Failure is always:

```json
{ "ok": false, "code": "conflict", "message": "Another rider has already taken this delivery." }
```

`code` is for the caller's logic; `message` is written to be shown to a person as-is. Every
authenticated route answers in this shape — `apiError(status, code, message)` is the only
way these routes fail.

### Error codes

| Code | Status | Meaning |
| --- | --- | --- |
| `denied` | 401, 403 | No session, or the wrong workspace for the route. |
| `email_unverified` | 403 | The action reaches other people and the address isn't confirmed. |
| `invalid_request` | 400 | Missing or malformed body / query. |
| `invalid_photo` | 400 | The data URL isn't an accepted image, or is too large. |
| `confirm_mismatch` | 400 | Account closure confirmation text didn't match. |
| `no_results` | 404 | No such trip — **also** what a trip you aren't on returns. |
| `conflict` | 409 | The row moved, or the transition isn't legal from here. |
| `too_far` | 409 | The courier's last fix is outside the proximity radius for this phase. |
| `open_trips` | 409 | Account closure blocked by a delivery still running. |
| `no_business_address` | 409 | The business has no stored dispatch address yet. |
| `quota` | 429 | Upstream routing quota exhausted. |
| `unavailable` | 502, 503 | Routing is unconfigured or the upstream failed. |

Two conventions worth knowing before reading any individual route:

- **A trip you are not a participant in returns `404`, not `403`.** A miss and someone else's
  delivery are deliberately indistinguishable, so probing ids reveals nothing.
- **`409 conflict` is normal, not exceptional.** Every state change is a conditional UPDATE
  against the status the handler read (`applyTripChange`). Two riders tapping Accept, a
  double-tapped Complete, or a business cancelling as the rider arrives all resolve as one
  winner and one `409` — the loser's screen is expected to re-read and move on.

## Access rules

Three gates, applied in this order by `apiRoute`:

1. **Session** — every route below except `GET /api/health` requires one.
2. **Role** — `business` or `courier`, where the route is workspace-specific.
3. **Confirmed email** — only on the two actions that reach other people: raising a delivery
   and going online (plus accepting a delivery, as a backstop). Confirmation is otherwise a
   soft gate: an unverified account signs in and reads its whole workspace.

## Endpoints

| Method | Path | Role | What it does |
| --- | --- | --- | --- |
| GET | `/api/health` | *public* | Liveness check. |
| GET | `/api/trips?id=` | either | Read one trip, scoped to its participants. |
| POST | `/api/trips` | business ✉ | Raise a delivery request. |
| POST | `/api/trips/cancel` | business | Withdraw a request, before the rider arrives. |
| POST | `/api/trips/confirm-pickup` | business | Confirm the parcel changed hands. |
| POST | `/api/trips/retry` | business | Re-ring a request whose search timed out. |
| POST | `/api/trips/rate` | either | Rate the other party on a completed trip. |
| PUT | `/api/business/profile` | business | Set the dispatch address and/or trading name. |
| GET | `/api/couriers/nearby` | business | Anonymised online riders around the shop. |
| POST | `/api/courier/accept-trip` | courier ✉ | Claim a ringing request. |
| POST | `/api/courier/decline-trip` | courier | Turn down an offer, for this rider only. |
| POST | `/api/courier/cancel-trip` | courier | Release an accepted job back to the ring. |
| POST | `/api/courier/trip-status` | courier | Start or complete the delivery leg. |
| POST | `/api/courier/availability` | courier ✉ | Go online / offline. |
| PUT | `/api/courier/profile` | courier | Update the plate number. |
| POST | `/api/location` | courier | Report a position fix. |
| PUT | `/api/account/photo` | either | Set or remove the profile photo. |
| DELETE | `/api/account` | either | Close the signed-in account. |
| POST | `/api/geo/route` | either | Driving route, proxied to OpenRouteService. |

✉ = also requires a confirmed email.

---

### `GET /api/health`

Public. No session needed.

```json
{ "ok": true, "service": "yada", "scope": "api" }
```

---

### `GET /api/trips?id={uuid}`

The single read every tracking and courier screen polls. It is the one place that decides
what each side of a delivery may know about it.

**Query:** `id` — trip UUID (`400 invalid_request` if malformed).

**Response** — `trip` object:

| Field | Notes |
| --- | --- |
| `id`, `status`, `businessId`, `assignedCourierId` | |
| `courier` | `{ id, name, initials, image, phone, vehicleType, plateNumber, rating, ratingCount, isDeleted }`, or `null` before anyone accepts. `rating` is `null` until the first rating exists — an average over nothing is noise, not a score. |
| `myRating` | The stars **this viewer** already gave, or `null`. Keyed by rater, so the two directions are separate answers. |
| `orderName`, `orderPrice` | **Business only** — `null` in the courier's copy. A rider is carrying the parcel either way, and a value on their screen is a reason to be robbed for it. |
| `releasedByCourier` | Business only. `true` when this search follows a rider dropping out rather than being the original one. Inferred from `accepted_at` surviving the release. |
| `dispatchElapsedSeconds` | Seconds since the dispatch clock started, `null` unless `requested`. Elapsed rather than a timestamp so the ring display doesn't inherit browser clock skew. |
| `courierLocation` | `{ lat, lng, recordedAt }` — the rider's last stored fix, so a freshly matched business doesn't watch an empty map until the next one. |
| `pickupAddress`, `dropoffAddress`, `pickupLat/Lng`, `dropoffLat/Lng` | |
| `estimatedDistanceKm`, `estimatedDurationMinutes`, `completedAt` | ISO for the timestamp. |
| `pickupInZone`, `dropoffInZone` | Whether each end falls inside the KNUST/Ayeduase service polygon. Informational — neither end is refused for being outside it. |

**Errors:** `400 invalid_request`, `401 denied`, `404 no_results` (not found *or* not yours).

---

### `POST /api/trips`

Raise a delivery. Business only, confirmed email required.

```json
{
  "dropoffAddress": "Ayeduase North Gate",
  "dropoffLat": 6.6745,
  "dropoffLng": -1.5626,
  "orderName": "2x large pancakes + syrup",
  "orderPrice": 45.00,
  "notes": "Call on arrival",
  "estimatedDistanceKm": 1.8,
  "estimatedDurationMinutes": 7
}
```

Only the destination comes off the wire. **Pickup is the business's stored address**, read
server-side — the business doesn't move, so letting a request nominate its own origin would
only ever be a way to disagree with the profile.

`orderName` (≤ 120 chars) and `orderPrice` (0 – 1,000,000 cedis, rounded to 2dp) are
required: the columns are `NOT NULL` because a delivery record that can't say what was in the
parcel is not an audit record. `orderPrice` is the **order's** value, not a delivery fee.

Neither end is zone-checked. A delivery that starts or finishes outside the zone is still one
somebody wants; whether a rider takes it is the rider's call, which is what the ring is for.

**Response:** `{ ok, trip: { id, status, pickupAddress, dropoffAddress, pickupLat, pickupLng, dropoffLat, dropoffLng, estimatedDistanceKm, estimatedDurationMinutes } }`

**Errors:** `400 invalid_request`, `403 email_unverified`, `409 no_business_address`,
`422` (a `GeoError` code), `502 unavailable`.

---

### `POST /api/trips/cancel`

Body: `{ "tripId": "<uuid>" }`. Business only.

The window closes when the rider **reaches the counter**, not when they accept: until
`courier_arriving` a business changing its mind is calling off a journey; from there someone
is standing in the shop, and the way out of that is a conversation, not a button.

**Response:** `{ ok, tripId, status: "cancelled" }` · **Errors:** `400`, `404`, `409 conflict`.

---

### `POST /api/trips/confirm-pickup`

Body: `{ "tripId": "<uuid>" }`. Business only.

The **business** ends the pickup phase, not the courier — a rider who could mark their own
pickup could mark it from the road. The rider still has to be at the counter: their last
stored fix is checked against the pickup point within `PICKUP_PROXIMITY_KM` (15 m).

`accepted` or `courier_arriving` → `picked_up`.

**Response:** `{ ok, tripId, status: "picked_up" }` · **Errors:** `400`, `404`, `409 conflict`,
`409 too_far`.

---

### `POST /api/trips/retry`

Body: `{ "tripId": "<uuid>" }`. Business only.

Re-ring a request whose 60-second search found nobody. Manual by design, and only **after**
the timeout — a reset mid-search would shrink the ring back to 400 m around riders already
being alerted. Nothing else changes: declines persist, the trip keeps its id, the business
keeps its tracking page.

**Response:** `{ ok, tripId }` · **Errors:** `400`, `404`, `409 conflict` ("Riders are still
being alerted", or the request is no longer searching).

---

### `POST /api/trips/rate`

Either role. One endpoint for both directions.

```json
{ "tripId": "<uuid>", "stars": 5, "comment": "Fast, polite" }
```

`stars` is a whole number 1–5; `comment` is optional, ≤ 500 chars.

Who may rate whom falls out of the **trip row**, not the account role: the business rates the
rider who carried it, the rider rates the business they carried for. Anyone who is neither
gets the same `404` a nonexistent trip gets. Only `completed` trips can be rated — cancelled
ones are excluded on purpose, since a rating is about how a delivery went and a cancelled trip
is one that didn't.

Once per rater, enforced by the `trip_ratings_once_per_rater` constraint rather than a
read-then-write, so two racing submissions can't both land. The rated party's cached average
updates in the same transaction.

**Response:** `{ ok, tripId, stars, rated: { role, rating, ratingCount } }`

**Errors:** `400 invalid_request`, `404 no_results`, `409 conflict` (not completed, nobody
carried it, or already rated).

---

### `PUT /api/business/profile`

Business only. Send an address, a trading name, or both:

```json
{ "businessName": "Kaeya Kitchen", "address": "KNUST Commercial Area", "lat": 6.6745, "lng": -1.5716 }
```

Sign-up normally captures the address, so this exists for the two cases sign-up can't cover:
an account that predates address capture, and a business that has moved. It never sets a
per-order origin — `POST /api/trips` still reads the stored row. No zone check: a business
says where it is, and refusing an address for being the wrong side of a polygon is the app
arguing with the person who knows.

**Response:** `{ ok, profile: { businessName, address, lat, lng } | null }` · **Errors:** `400`.

---

### `GET /api/couriers/nearby`

Business only. No parameters — the centre is the business's **own stored address**, read
server-side. Taking a point off the wire would turn this into a "who is near this arbitrary
spot" endpoint for anyone with an account.

This is the "cars on the map" a ride-hailing app opens with: supply, not surveillance. No
names, no ratings, no way to follow one person. Each rider is a per-process salted hash of
their id — stable enough for a marker to move rather than blink, useless anywhere else — and
positions are rounded to 4dp (~11 m).

```json
{ "ok": true, "couriers": [{ "ref": "9f2c1a7b4e05", "lat": 6.6745, "lng": -1.5716, "minutesAway": 4 }],
  "minutes": 10, "radiusKm": 3.67 }
```

Only riders who are online **and** have a fix newer than the freshness window are listed. A
business with no address yet gets an empty list and `200` — the map is asking, not the person.

---

### `POST /api/courier/accept-trip`

Body: `{ "tripId": "<uuid>" }`. Courier, confirmed email.

The claim is a single conditional UPDATE on `status = 'requested' AND assigned_courier_id IS
NULL`, so exactly one of two simultaneous riders wins. A courier who previously declined this
request is refused — "no" is final for this request, including through a stale screen.

There is deliberately **no ring/timeout check**: the board only *shows* what's ringing, but a
just-in-time accept at second 61 still beats telling the business nobody came.

**Response:** `{ ok, tripId }` · **Errors:** `400`, `403 email_unverified`, `404 no_results`,
`409 conflict` (declined, or another rider got it).

---

### `POST /api/courier/decline-trip`

Body: `{ "tripId": "<uuid>" }`. Courier only.

Declines it **for this rider**: the request keeps ringing everyone else, and the decline is
remembered so a manual re-ring doesn't alert them again. Declining twice is the same answer,
not an error.

**Response:** `{ ok, tripId }` · **Errors:** `400`, `404 no_results` (no longer a ringing,
unassigned request).

---

### `POST /api/courier/cancel-trip`

Body: `{ "tripId": "<uuid>" }`. Courier only.

**Not** a cancellation of the delivery. The business still wants their parcel moved — they
didn't change their mind, a rider did — so the job goes back to everyone else:

- the trip returns to `requested` and loses its assignment;
- the dispatch clock restarts, so the ring begins again from the tightest radius;
- a decline is written, so the ring never offers it back to the rider who let it go.

`accepted_at` is left in place — it's what tells the tracking screen this search follows a
dropout (`releasedByCourier`). The window closes on arrival: from `courier_arriving`, walking
away is not something to do through an API.

**Response:** `{ ok, tripId, status: "requested" }` · **Errors:** `400`, `404`, `409 conflict`.

---

### `POST /api/courier/trip-status`

Courier only. The two transitions a rider drives, one at each end of the delivery leg:

```json
{ "tripId": "<uuid>", "action": "start_delivery" }
```

| `action` | From | To | Extra check |
| --- | --- | --- | --- |
| `start_delivery` | `picked_up` | `in_progress` | The business must have confirmed the handover first. |
| `complete` | `in_progress` | `completed` | Rider's last fix within `DELIVERY_PROXIMITY_KM` (31 m) of the drop-off. Sets `completed_at`. |

Reaching the pickup is **not** here — that's written automatically from the rider's position
by `POST /api/location` — and neither is the pickup itself, which only the business confirms.

**Response:** `{ ok, tripId, status }` · **Errors:** `400`, `404`, `409 conflict`, `409 too_far`.

---

### `POST /api/courier/availability`

Body: `{ "online": true }`. Courier only; going **on** requires a confirmed email, going off
never does — refusing that would strand an unverified account as available with no way to stop.

The toggle used to live in `localStorage` alone, which meant the server had no idea who was on
shift. Going offline has to bite immediately: a fix stays "fresh" for minutes, so without this
flag a rider who just clocked off would keep ringing until it aged out.

**Response:** `{ ok, online }` · **Errors:** `400 invalid_request`, `403 email_unverified`.

---

### `PUT /api/courier/profile`

Body: `{ "plateNumber": "GT 4521-20" }`. Courier only.

The plate is the only part of a rider's profile that lives on `courier_profiles` rather than
the account — name, phone and password belong to Better Auth. Deliberately loose about format
(≤ 16 chars, letters/digits/spaces/dashes): a rider whose plate doesn't match the pattern still
has to be able to type it. An empty string clears it. The stored value is read back rather
than echoed, so the screen shows the normalised form.

**Response:** `{ ok, profile: { vehicleType, plateNumber } }` · **Errors:** `400`.

---

### `POST /api/location`

Courier only. The fix the rider's app posts while moving.

```json
{ "lat": 6.6745, "lng": -1.5716, "heading": 132, "tripId": "<uuid>", "recordedAt": "2026-08-22T19:04:11.000Z" }
```

`recordedAt` is accepted but **never taken on trust** — it's honoured only when parseable, not
in the future, and no older than the matching freshness window; anything else falls back to the
server clock. It gates dispatch and both handovers, so a client free to name its own time could
keep a stale position permanently "fresh".

`tripId` is optional and only honoured if it is this rider's own live trip; anything else is
dropped and echoed back as `null`, so a stale id can't attach fixes to someone's delivery.

Two side effects when a valid `tripId` is present:

- a `rider_location` trip event is recorded;
- **arrival is observed, not declared** — an `accepted` trip whose rider comes within
  `PICKUP_PROXIMITY_KM` of the pickup flips to `courier_arriving` automatically, so neither app
  has to remember to say so;
- the fix is emitted to the `trip:{id}` socket room.

**Response:** `{ ok, location: { courierId, tripId, lat, lng, heading, recordedAt } }`
· **Errors:** `400 invalid_request`.

---

### `PUT /api/account/photo`

Either role. `{ "image": "data:image/jpeg;base64,..." }` to set, `{ "image": null }` to remove.

Removal must be an explicit `null` — never an omitted or empty field — so a malformed body can
never be read as "delete the photo". The data URL must be `png`, `jpeg` or `webp`: the string
ends up in an `<img src>`, and `data:image/...` cannot carry script while `data:text/html` can.
YADA has no file storage; `users.image` is a text column.

**Response:** `{ ok, image }` · **Errors:** `400 invalid_request`, `400 invalid_photo`.

---

### `DELETE /api/account`

Either role. `{ "confirm": "<the account's own email>" }` — or the literal `DELETE` for an
account with no address on file.

Self-service only, and that is the whole security model: **there is no id in the request**, so
the only account this can reach is the caller's own. The email is typed back rather than a
password re-entered, because Google accounts have no password and a gate that works for half
the users is a gate that gets worked around.

A soft delete: `users.deleted_at` is stamped and credentials, sessions, email, phone and photo
are stripped, but the row stays so delivery history can still say who sent a parcel. Blocked
while any delivery is still running — a trip with one of its two parties missing is worse than
an account that outlives the person's patience by ten minutes.

**Response:** `{ ok: true }`. The session rows are gone, so the browser's cookie now resolves to
nobody; the client navigates to `/auth` itself.

**Errors:** `400 confirm_mismatch`, `409 open_trips`.

---

### `POST /api/geo/route`

Either role, session required.

```json
{ "origin": { "lat": 6.6745, "lng": -1.5716 }, "destination": { "lat": 6.6702, "lng": -1.5626 } }
```

A thin proxy to OpenRouteService, and it exists for exactly one reason: an ORS key can't be
restricted by HTTP referrer, so a key in the browser is a key anyone can spend. Everything else
about routing stayed on the client. Signed-in only — the quota is shared, and an open proxy
would be someone else's free routing API.

Uses the `driving-car` profile (ORS has no motorcycle profile), which errs slow rather than
fast for a rider filtering through traffic.

**Response:** `{ ok, distanceMeters, durationSeconds, path: [{ lat, lng }] }` — GeoJSON
coordinates, no polyline decoder needed.

**Errors:** `400 invalid_request`, `401`, `404 no_results`, `429 quota`, `502 denied|unavailable`,
`503 unavailable` (no `ORS_API_KEY` configured).

---

## Authentication endpoints

`/api/auth/*` is mounted by Better Auth inside `src/hooks.server.ts` — matched on pathname
before routing, which is why there is deliberately no `/api/auth/[...all]` route to back it up.
It serves sign-up, sign-in, sign-out, Google OAuth, email verification and password reset, and
it does **not** use the envelope above; it answers in Better Auth's own shapes.

- Credentials are email + password. Google is registered as a social provider **only when
  `OAUTH_GOOGLE_CLIENT_ID` and `OAUTH_GOOGLE_CLIENT_SECRET` are both set**; otherwise the app
  runs password-only.
- `phoneNumber` and `role` ride along as Better Auth `additionalFields`. `role` is declared
  `input: false`, so it is never taken from a request body — otherwise any client could switch
  itself between workspaces, or into a role that doesn't exist, through the auth API.
- Email confirmation is a soft gate (`requireEmailVerification` is off) — see *Access rules*.
- Better Auth's own rate limiting is enabled. It covers its HTTP endpoints only; the form
  actions call `auth.api.*` in process, which is what the email throttle covers instead.

## Realtime

A Socket.IO server runs alongside (`realtime-handlers.js`). The handshake rejects anonymous
sockets; room membership is authorised per join.

| Event | Direction | Payload |
| --- | --- | --- |
| `yada:ready` | server → client | `{ connectedAt }`, on connect. |
| `trip:join` | client → server | Trip id. Authorised against the same participant rule as `GET /api/trips`. |
| `trip:leave` | client → server | Trip id. |
| `rider:location` | server → room | `{ courierId, tripId, lat, lng, heading, recordedAt }`, emitted by `POST /api/location` to `trip:{id}` only. |

There is deliberately **no inbound `rider:location` listener**: positions are broadcast only by
`POST /api/location`, so a socket cannot be used to write a fix.

Sockets are an accelerator, not the source of truth — every screen still polls
`GET /api/trips`, so a dropped socket degrades to slower updates rather than a stuck screen.

## Constants the API enforces

| Constant | Value | Where it bites |
| --- | --- | --- |
| `RING_STEPS` | 400 m → 800 m (15s) → 6 km (35s) | Which riders a request is ringing right now. Computed from `dispatch_started_at`; never stored, no timers. |
| `DISPATCH_TIMEOUT_SECONDS` | 60 | After this nobody is ringed; `POST /api/trips/retry` is the only restart. |
| `MAX_MATCH_RADIUS_KM` | 6 | Beyond this a rider isn't a candidate at all. |
| `PICKUP_PROXIMITY_KM` | 0.015 (15 m) | `confirm-pickup`, and the automatic `courier_arriving` flip. |
| `DELIVERY_PROXIMITY_KM` | 0.031 (31 m) | `trip-status` `complete`. |
| `NEARBY_RADIUS_KM` | ~3.67 (10 min at 22 km/h) | `GET /api/couriers/nearby`. |
| `MAX_ORDER_NAME` / `MAX_ORDER_PRICE` | 120 chars / 1,000,000 | `POST /api/trips`. |

Both proximity radii are **provisional** and sit at or below the error on a typical phone GPS
fix: someone genuinely at the door can still read as out of range. If a confirm button refuses
to appear where it should, these are the first suspect — not the freshness window.
