import { expect, test } from "@playwright/test";

/**
 * The route surface itself.
 *
 * These assert only that each endpoint *exists with the method it is called
 * with*, which sounds too trivial to test until it isn't: `GET /api/trips` was
 * silently deleted by a bad refactor and shipped to production, because a
 * missing export is neither a type error nor a build error and nothing else
 * looked. The business tracking screen polls that endpoint every four seconds
 * and simply stopped working.
 *
 * The signal is the status code. `405` means SvelteKit matched the route but
 * found no handler for the method — the exact shape of that regression. `401`
 * means the handler is there and did its job on a signed-out caller, which is
 * all these need to prove; what the endpoints actually *do* is covered by
 * signing in, which these deliberately don't, so they stay fast and need no
 * fixtures.
 */

const SIGNED_OUT_ENDPOINTS = [
  { method: "GET", path: "/api/trips?id=00000000-0000-0000-0000-000000000000" },
  { method: "POST", path: "/api/trips" },
  { method: "GET", path: "/api/couriers/nearby" },
  // OSM stack: the ORS proxy. Signed-in only, because an ORS key cannot be
  // referrer-locked and an open proxy is someone else's free routing API.
  { method: "POST", path: "/api/geo/route" },
  { method: "POST", path: "/api/location" },
  { method: "POST", path: "/api/courier/accept-trip" },
  { method: "POST", path: "/api/courier/decline-trip" },
  { method: "POST", path: "/api/courier/cancel-trip" },
  { method: "POST", path: "/api/courier/trip-status" },
  { method: "POST", path: "/api/courier/availability" },
  { method: "PUT", path: "/api/courier/profile" },
  { method: "POST", path: "/api/trips/cancel" },
  { method: "POST", path: "/api/trips/confirm-pickup" },
  { method: "POST", path: "/api/trips/retry" },
  { method: "POST", path: "/api/trips/rate" },
  { method: "PUT", path: "/api/business/profile" },
  { method: "PUT", path: "/api/account/photo" },
  { method: "DELETE", path: "/api/account" },
] as const;

for (const endpoint of SIGNED_OUT_ENDPOINTS) {
  test(`${endpoint.method} ${endpoint.path} exists and refuses a signed-out caller`, async ({
    request,
  }) => {
    const response = await request.fetch(endpoint.path, {
      method: endpoint.method,
      data: {},
      failOnStatusCode: false,
    });

    expect(
      response.status(),
      `${endpoint.method} ${endpoint.path} answered ${response.status()} — 405 means the handler is missing`,
    ).toBe(401);
  });
}

test("GET /api/health needs no session", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
});
