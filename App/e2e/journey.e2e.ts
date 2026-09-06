import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

import {
  AT_DROPOFF,
  AT_PICKUP,
  BUSINESS,
  COURIER,
  DROPOFF,
  NEAR_PICKUP,
  ratingsForTrip,
  STORAGE,
  tripStatus,
} from "./fixtures";

/**
 * One delivery, end to end, with both actors on screen at once.
 *
 * User actions go through the UI, because that is what is being tested.
 * Position reporting goes through `POST /api/location` directly, because it is
 * a background timer rather than something anyone clicks — waiting on the
 * 10 s / 2.5 s reporter cadence would make this slow and flaky without testing
 * anything the endpoint doesn't already cover.
 *
 * The steps share state, so they run in order in one file rather than as
 * independent tests.
 */

test.describe.configure({ mode: "serial" });

const ORDER_NAME = "E2E Pancakes × 4";
const ORDER_PRICE = "55.00";

let businessPage: Page;
let courierPage: Page;
let courierApi: APIRequestContext;
let courierContext: BrowserContext;
let tripId: string;

/** Move the courier, as their phone would. */
async function reportPosition(
  api: APIRequestContext,
  point: { lat: number; lng: number },
  forTrip?: string,
) {
  const response = await api.post("/api/location", {
    data: {
      lat: point.lat,
      lng: point.lng,
      ...(forTrip ? { tripId: forTrip } : {}),
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

test.beforeAll(async ({ browser }) => {
  const businessContext = await browser.newContext({
    storageState: STORAGE.business,
  });
  businessPage = await businessContext.newPage();

  courierContext = await browser.newContext({
    storageState: STORAGE.courier,
    permissions: ["geolocation"],
    geolocation: { latitude: NEAR_PICKUP.lat, longitude: NEAR_PICKUP.lng },
  });
  courierPage = await courierContext.newPage();
  courierApi = courierContext.request;
});

test("the courier goes online", async () => {
  await courierPage.goto("/home");
  await courierPage.getByRole("button", { name: /go online/i }).click();

  // The switch flips to the other state once the server has taken it.
  await expect(
    courierPage.getByRole("button", { name: /go offline/i }),
  ).toBeVisible({ timeout: 15_000 });

  // Dispatch reads a position before it reads anything else.
  await reportPosition(courierApi, NEAR_PICKUP);
});

test("the business raises a delivery", async () => {
  await businessPage.goto("/request");

  await businessPage.getByLabel(/order name/i).fill(ORDER_NAME);
  await businessPage.getByLabel(/price/i).fill(ORDER_PRICE);

  // The destination is normally a pin or a prediction; the map is a live
  // Google surface and a poor thing to drive a test through, so the request is
  // raised through the same endpoint the form posts to.
  const created = await businessPage.request.post("/api/trips", {
    data: {
      dropoffAddress: "E2E Drop-off, KNUST Commercial Area",
      dropoffLat: DROPOFF.lat,
      dropoffLng: DROPOFF.lng,
      orderName: ORDER_NAME,
      orderPrice: Number(ORDER_PRICE),
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  tripId = (await created.json()).trip.id as string;
  expect(tripId).toBeTruthy();
  expect(await tripStatus(tripId)).toBe("requested");
});

test("the offer reaches the courier's board", async () => {
  await courierPage.goto("/home");

  // The first ring opens at dispatch, staggered by rating — a fresh account
  // sits mid-field, so a few seconds.
  await expect(courierPage.getByText(/new request/i)).toBeVisible({
    timeout: 30_000,
  });
  await expect(courierPage.getByText(ORDER_NAME)).toHaveCount(0);

  // The distance the dispatcher actually ranked them by is on the card.
  await expect(courierPage.getByText(/pickup/i).first()).toBeVisible();
});

test("the courier never sees what the order is worth", async () => {
  // The strongest privacy claim in the product, and until now it rested on a
  // code comment: a value on a rider's screen is a reason to be robbed for it.
  //
  // Asserted on the rendered price rather than the bare digits — "55" would
  // also match a distance, a duration or a slice of an id, and a test that
  // fails for those reasons teaches nobody anything.
  const body = await courierPage.locator("body").innerText();
  expect(body).not.toContain(ORDER_PRICE);
  expect(body).not.toContain(`GH₵${ORDER_PRICE}`);
  expect(body).not.toMatch(/GH₵/);
});

test("the courier accepts, and the business sees who is coming", async () => {
  await courierPage.getByRole("button", { name: /^accept$/i }).click();

  await expect(courierPage).toHaveURL(/\/pickup/, { timeout: 20_000 });
  expect(await tripStatus(tripId)).toBe("accepted");

  await businessPage.goto(`/tracking?trip=${tripId}`);
  await expect(businessPage.getByText(COURIER.name)).toBeVisible({
    timeout: 20_000,
  });
  // The plate is how the business identifies the bike at the counter.
  await expect(businessPage.getByText(/GT\s*4521-20/)).toBeVisible();
});

test("arriving at the counter is observed, not declared", async () => {
  // Neither app asks the rider to say they have arrived — their own fix does it.
  await reportPosition(courierApi, AT_PICKUP, tripId);

  await expect
    .poll(() => tripStatus(tripId), { timeout: 20_000 })
    .toBe("courier_arriving");
});

test("the business confirms the handover", async () => {
  await businessPage.reload();

  const confirm = businessPage.getByRole("button", { name: /confirm pickup/i });
  await expect(confirm).toBeVisible({ timeout: 20_000 });
  await confirm.click();

  await expect
    .poll(() => tripStatus(tripId), { timeout: 20_000 })
    .toBe("picked_up");
});

test("the courier starts the delivery leg", async () => {
  await courierPage.goto(`/pickup?tripId=${tripId}`);

  await expect(courierPage.getByText(/parcel collected/i)).toBeVisible({
    timeout: 20_000,
  });
  await courierPage.getByRole("button", { name: /start delivery/i }).click();

  await expect(courierPage).toHaveURL(/\/deliver/, { timeout: 20_000 });
  expect(await tripStatus(tripId)).toBe("in_progress");
});

test("the delivery is closed at the drop-off, and not before", async () => {
  /**
   * Out of range there is deliberately no button at all — the screen shows how
   * far is left instead, because "a greyed one invites tapping at it the whole
   * way there". So the negative case asserts an absence, not a refusal.
   *
   * The screen reads the device's own position for this, while the server
   * checks the last reported fix, so both have to be moved.
   */
  await courierContext.setGeolocation({
    latitude: AT_PICKUP.lat,
    longitude: AT_PICKUP.lng,
  });
  await reportPosition(courierApi, AT_PICKUP, tripId);
  await courierPage.reload();

  await expect(
    courierPage.getByRole("button", { name: /confirm delivery/i }),
  ).toHaveCount(0);
  await expect(
    courierPage.getByText(/you can confirm this within/i),
  ).toBeVisible({ timeout: 20_000 });
  expect(await tripStatus(tripId)).toBe("in_progress");

  // At the door, the control appears and the trip closes.
  await courierContext.setGeolocation({
    latitude: AT_DROPOFF.lat,
    longitude: AT_DROPOFF.lng,
  });
  await reportPosition(courierApi, AT_DROPOFF, tripId);
  await courierPage.reload();

  const confirmDelivery = courierPage.getByRole("button", {
    name: /confirm delivery/i,
  });
  await expect(confirmDelivery).toBeVisible({ timeout: 20_000 });
  await confirmDelivery.click();

  await expect
    .poll(() => tripStatus(tripId), { timeout: 20_000 })
    .toBe("completed");
  await expect(courierPage).toHaveURL(/\/complete/, { timeout: 20_000 });
});

test("both sides rate each other", async () => {
  // The submit stays disabled until a star is picked, so the star is the click
  // that matters. Each one is a button named "N stars".
  await courierPage.getByRole("button", { name: /^5 stars$/i }).click();
  await courierPage.getByRole("button", { name: /rate business/i }).click();
  await expect
    .poll(async () => (await ratingsForTrip(tripId)).length, {
      timeout: 20_000,
    })
    .toBeGreaterThanOrEqual(1);

  await businessPage.goto(`/tracking?trip=${tripId}`);
  await businessPage.getByRole("button", { name: /^4 stars$/i }).click();
  await businessPage.getByRole("button", { name: /rate rider/i }).click();

  await expect
    .poll(async () => (await ratingsForTrip(tripId)).length, {
      timeout: 20_000,
    })
    .toBe(2);

  // One each way, and neither party rated themselves.
  const ratings = await ratingsForTrip(tripId);
  for (const rating of ratings) {
    expect(rating.rater_id).not.toBe(rating.rated_id);
  }
  expect(new Set(ratings.map((r) => r.rater_id)).size).toBe(2);
});

test("the delivery is on the business's history", async () => {
  await businessPage.goto("/history");

  // The order name appears twice — once in the card list rendered below `lg`
  // and once in the table above it, with the other hidden by CSS. Matching on
  // the visible one keeps this working whichever layout is in force.
  const row = businessPage.getByText(ORDER_NAME).filter({ visible: true });
  await expect(row).toHaveCount(1, { timeout: 20_000 });
  await expect(row).toBeVisible();

  // And it is filed as delivered, not left looking active.
  await expect(
    businessPage
      .getByText(/delivered/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
});
