/**
 * Re-capture the screenshot set in `Design/screenshots/new`.
 *
 * Not a test — a script. It drives one real delivery from both sides and
 * photographs every stage on the way past, which is the only way to get shots
 * that agree with each other: a trip is one-way, so `biz-searching-tracking`
 * and `biz-completed-tracking` cannot both be staged after the fact.
 *
 * Four browser contexts share the two accounts — business and courier, each at
 * a desktop and a mobile viewport — so a single lifecycle yields all four views
 * of every stage.
 *
 * Run against the dev server, not the preview build:
 *
 *   npm run dev                                    # must be :5173
 *   E2E_ALLOW_DESTRUCTIVE=1 node e2e/capture.ts
 *
 * `BETTER_AUTH_URL` is `http://localhost:5173`, so sessions only stick on that
 * origin, and it is the origin the Maps key's referrer restriction allows.
 *
 * It creates accounts and a trip, and deletes them again at the end.
 */

import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

import {
  chromium,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

import {
  assertDestructiveAllowed,
  AT_DROPOFF,
  AT_PICKUP,
  deleteE2EAccounts,
  DROPOFF,
  E2E_EMAIL_PREFIX,
  markEmailVerified,
  NEAR_PICKUP,
  PICKUP,
} from "./fixtures.ts";

const ORIGIN = process.env.CAPTURE_ORIGIN ?? "http://localhost:5173";
const OUT = path.resolve("../Design/screenshots/new");

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

/** Shots the old set took at full height rather than at the viewport. */
const FULL_PAGE = new Set(["public-root", "public-auth", "biz-profile"]);

/** Mobile-only screens — the courier settings subpages and the collected state. */
const MOBILE_ONLY = new Set([
  "rider-pickedup-pickup",
  "rider-settings-notifications",
  "rider-settings-theme",
]);

/**
 * Presentation names. The e2e suite randomises these; a screenshot wants a
 * plausible shop and rider instead. The address still carries the `yada-e2e-`
 * prefix so teardown can find it.
 */
/**
 * Fixed rather than randomised: these strings are *in* the screenshots, and a
 * `yada-e2e-shot-rider-mtqk3ud4@example.test` overflows the settings row and
 * collides with its own label. Still carries the `yada-e2e-` prefix, which is
 * what teardown matches on — and `main()` clears any leftovers before it starts,
 * so a fixed address cannot collide with a previous run's.
 */
const BUSINESS = {
  email: `${E2E_EMAIL_PREFIX}kitchen@example.com`,
  password: "capture-password-1234",
  name: "Favorie Kitchen",
  phone: "0241234567",
};
const COURIER = {
  email: `${E2E_EMAIL_PREFIX}rider@example.com`,
  password: "capture-password-1234",
  name: "Kwabena Mensah",
  phone: "0242219007",
  plate: "GT 4521-20",
  /** A 256px avatar, the same grade the app's own downscale produces. */
  image:
    "data:image/jpeg;base64,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",
};

const FORM = { origin: ORIGIN };

type Shot = { biz?: Page; rider?: Page };

let shots = 0;

/**
 * Screens settle in stages: the route's data, then the map tiles, then the
 * `rise` entrance animations. Waiting on all three is what stops a capture
 * catching a half-drawn panel.
 */
async function settle(page: Page, mapHeavy = false) {
  // Bounded on purpose. A screen with live map tiles and a 5 s board poll never
  // reaches `networkidle`, and the default 30 s timeout on that wait is long
  // enough to outlast the 60 s dispatch window — the offer expires before the
  // courier's board is ever opened.
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(mapHeavy ? 2000 : 700);
}

async function shoot(name: string, pages: Record<string, Page>) {
  for (const [variant, page] of Object.entries(pages)) {
    if (variant === "desktop" && MOBILE_ONLY.has(name)) continue;

    const file = path.join(OUT, variant, `${name}.png`);
    await page.screenshot({ path: file, fullPage: FULL_PAGE.has(name) });
    shots += 1;
  }
  console.log(`  ✓ ${name}`);
}

/** Both viewports of one role, for the common "shoot this screen" case. */
function pair(desktop: Page, mobile: Page) {
  return { desktop, mobile };
}

/**
 * SvelteKit navigates on the client, so no `load` event fires and Playwright's
 * URL wait can sit until it times out. Poll the address bar instead.
 */
/**
 * Wait for the offer, and rescue the run if the search lapsed first.
 *
 * `POST /api/trips/retry` is refused while riders are still being alerted
 * ("give it a moment"), so a re-ring has to wait out the remainder of the
 * window before it will take.
 */
async function ensureOffer(
  pages: Page[],
  request: APIRequestContext,
  tripId: string,
) {
  const offer = (p: Page) =>
    p.getByText(/new request/i).waitFor({ timeout: 20_000 });

  try {
    await Promise.all(pages.map(offer));
    return;
  } catch {
    console.log("  (search lapsed — re-ringing)");
    await pages[0].waitForTimeout(62_000);
    const again = await request.post(`${ORIGIN}/api/trips/retry`, {
      data: { tripId },
    });
    if (!again.ok()) throw new Error(await again.text());
    await Promise.all(pages.map((p) => p.reload()));
    await Promise.all(pages.map(offer));
  }
}

async function waitForPath(page: Page, fragment: string, timeout = 25_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (page.url().includes(fragment)) return;
    await page.waitForTimeout(250);
  }
  throw new Error(`${page.url()} never reached ${fragment}`);
}

async function goto(pages: Page[], url: string, mapHeavy = false) {
  await Promise.all(pages.map((p) => p.goto(`${ORIGIN}${url}`)));
  await Promise.all(pages.map((p) => settle(p, mapHeavy)));
}

/**
 * Wait for something to actually be on screen before photographing it.
 *
 * The courier board polls on a 5 s interval, so a fixed sleep after `goto`
 * catches an empty home about as often as it catches the offer.
 */
async function awaitAll(pages: Page[], selector: (p: Page) => Promise<void>) {
  await Promise.all(pages.map(selector));
}

async function signUp(context: BrowserContext, form: Record<string, string>) {
  const response = await context.request.post(`${ORIGIN}/auth?/signup`, {
    headers: FORM,
    form,
  });
  if (!response.ok()) throw new Error(await response.text());
}

async function newContext(
  browser: Browser,
  viewport: { width: number; height: number },
  storageState: string,
  geo?: { lat: number; lng: number },
) {
  return browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    storageState,
    ...(geo
      ? {
          permissions: ["geolocation"],
          geolocation: { latitude: geo.lat, longitude: geo.lng },
        }
      : {}),
  });
}

async function main() {
  assertDestructiveAllowed();

  // A previous run that died before teardown would otherwise collide with the
  // fixed email and phone.
  const stale = await deleteE2EAccounts();
  if (stale) console.log(`cleared ${stale} leftover account(s)`);

  for (const variant of ["desktop", "mobile"]) {
    rmSync(path.join(OUT, variant), { recursive: true, force: true });
    mkdirSync(path.join(OUT, variant), { recursive: true });
  }

  const browser = await chromium.launch();
  const authDir = path.resolve("e2e/.auth");
  mkdirSync(authDir, { recursive: true });
  const bizState = path.join(authDir, "capture-business.json");
  const riderState = path.join(authDir, "capture-courier.json");

  /* ------------------------------------------------- public, signed out */

  console.log("public");
  const anonDesktop = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 2,
  });
  const anonMobile = await browser.newContext({
    viewport: MOBILE,
    deviceScaleFactor: 2,
  });
  const anon = pair(await anonDesktop.newPage(), await anonMobile.newPage());
  const anonPages = [anon.desktop, anon.mobile];

  await goto(anonPages, "/");
  await shoot("public-root", anon);

  await goto(anonPages, "/auth");
  await shoot("public-auth", anon);

  await goto(anonPages, "/reset-password");
  await shoot("public-reset-password", anon);

  /* ------------------------------------------------------- provisioning */

  console.log("accounts");
  const bizSetup = await browser.newContext();
  await signUp(bizSetup, { role: "business", ...toForm(BUSINESS) });
  await markEmailVerified(BUSINESS.email);
  const profile = await bizSetup.request.put(`${ORIGIN}/api/business/profile`, {
    data: {
      address: "Ayeduase Gate, near KNUST, Kumasi",
      lat: PICKUP.lat,
      lng: PICKUP.lng,
    },
  });
  if (!profile.ok()) throw new Error(await profile.text());
  await bizSetup.storageState({ path: bizState });
  await bizSetup.close();

  const riderSetup = await browser.newContext();
  await signUp(riderSetup, {
    role: "courier",
    ...toForm(COURIER),
    plate: COURIER.plate,
    image: COURIER.image,
  });
  await markEmailVerified(COURIER.email);
  await riderSetup.storageState({ path: riderState });
  await riderSetup.close();

  /* ------------------------------------------------- signed-in contexts */

  const bizD = await newContext(browser, DESKTOP, bizState);
  const bizM = await newContext(browser, MOBILE, bizState);
  const riderD = await newContext(browser, DESKTOP, riderState, NEAR_PICKUP);
  const riderM = await newContext(browser, MOBILE, riderState, NEAR_PICKUP);

  const biz = pair(await bizD.newPage(), await bizM.newPage());
  const rider = pair(await riderD.newPage(), await riderM.newPage());
  const bizPages = [biz.desktop, biz.mobile];
  const riderPages = [rider.desktop, rider.mobile];

  const riderApi = riderD.request;
  const move = async (point: { lat: number; lng: number }, tripId?: string) => {
    const r = await riderApi.post(`${ORIGIN}/api/location`, {
      data: { lat: point.lat, lng: point.lng, ...(tripId ? { tripId } : {}) },
    });
    if (!r.ok()) throw new Error(await r.text());
    for (const ctx of [riderD, riderM]) {
      await ctx.setGeolocation({ latitude: point.lat, longitude: point.lng });
    }
  };

  /* ------------------------------------------------------- quiet states */

  console.log("empty states");
  await goto(bizPages, "/dashboard");
  await shoot("biz-dashboard", biz);

  await goto(bizPages, "/history");
  await shoot("biz-history", biz);

  await goto(bizPages, "/profile");
  await shoot("biz-profile", biz);

  await goto(riderPages, "/home", true);
  await shoot("rider-offline-home", rider);

  await goto(riderPages, "/orders");
  await shoot("rider-orders", rider);

  await goto(riderPages, "/trips");
  await shoot("rider-trips", rider);

  await goto(riderPages, "/settings");
  await shoot("rider-settings", rider);

  await goto(riderPages, "/settings/profile");
  await shoot("rider-settings-profile", rider);

  await goto(riderPages, "/settings/notifications");
  await shoot("rider-settings-notifications", rider);

  await goto(riderPages, "/settings/theme");
  await shoot("rider-settings-theme", rider);

  /* ----------------------------------------------------------- the trip */

  console.log("going online");
  await goto(riderPages, "/home", true);
  for (const page of riderPages) {
    await page.getByRole("button", { name: /go online/i }).click();
    await page
      .getByRole("button", { name: /go offline/i })
      .waitFor({ timeout: 15_000 });
  }
  await move(NEAR_PICKUP);

  console.log("the request");
  await goto(bizPages, "/request", true);
  for (const page of bizPages) {
    await page.getByLabel(/order name/i).fill("Pancakes × 4");
    await page.getByLabel(/price/i).fill("55.00");
  }
  await Promise.all(bizPages.map((p) => settle(p, true)));
  await shoot("biz-request", biz);

  const created = await bizD.request.post(`${ORIGIN}/api/trips`, {
    data: {
      dropoffAddress: "KNUST Commercial Area, Kumasi",
      dropoffLat: DROPOFF.lat,
      dropoffLng: DROPOFF.lng,
      orderName: "Pancakes × 4",
      orderPrice: 55,
      notes: "Call on arrival, Room 12",
    },
  });
  if (!created.ok()) throw new Error(await created.text());
  const tripId: string = (await created.json()).trip.id;

  console.log("searching");
  /**
   * Navigate both sides at once. The dispatch window is 60 s from the request,
   * and a 2880x1800 PNG of a live map is not instant — done serially, the
   * screenshots can outlast the window and the offer card vanishes before
   * anything can click Accept. Overlapping the two navigations keeps the whole
   * sequence comfortably inside it.
   */
  await Promise.all([
    goto(bizPages, `/tracking?trip=${tripId}`, true),
    goto(riderPages, "/home", true),
  ]);
  await ensureOffer(riderPages, bizD.request, tripId);

  await shoot("biz-searching-tracking", biz);
  await shoot("rider-offer-home", rider);

  /**
   * Both courier contexts are the *same rider*, so only one of them can take
   * the job — the other's offer vanishes the moment it is claimed. Act on
   * desktop and walk mobile to the screen that results.
   */
  console.log("accepted");
  await rider.desktop.getByRole("button", { name: /^accept$/i }).click();
  await waitForPath(rider.desktop, "/pickup");
  await rider.mobile.goto(`${ORIGIN}/pickup?tripId=${tripId}`);
  await Promise.all(riderPages.map((p) => settle(p, true)));
  await shoot("rider-accepted-pickup", rider);

  await goto(bizPages, `/tracking?trip=${tripId}`, true);
  await shoot("biz-enroute-tracking", biz);

  await goto(bizPages, "/dashboard");
  await shoot("biz-active-dashboard", biz);

  console.log("at the counter");
  await move(AT_PICKUP, tripId);
  await goto(bizPages, `/tracking?trip=${tripId}`, true);
  await shoot("biz-arriving-tracking", biz);

  console.log("handover");
  const confirmPickup = biz.desktop.getByRole("button", {
    name: /confirm pickup/i,
  });
  await confirmPickup.waitFor({ timeout: 30_000 });
  await confirmPickup.click();
  await biz.desktop.waitForTimeout(2500);

  await goto(riderPages, `/pickup?tripId=${tripId}`, true);
  await shoot("rider-pickedup-pickup", rider);

  console.log("delivering");
  await rider.desktop.getByRole("button", { name: /start delivery/i }).click();
  await waitForPath(rider.desktop, "/deliver");
  await rider.mobile.goto(`${ORIGIN}/deliver?tripId=${tripId}`);
  await Promise.all(riderPages.map((p) => settle(p, true)));
  await shoot("rider-delivering-deliver", rider);

  await goto(bizPages, `/tracking?trip=${tripId}`, true);
  await shoot("biz-delivering-tracking", biz);

  console.log("delivered");
  await move(AT_DROPOFF, tripId);
  for (const page of riderPages) {
    await page.reload();
    await settle(page, true);
  }
  await rider.desktop
    .getByRole("button", { name: /confirm delivery/i })
    .click();
  await waitForPath(rider.desktop, "/complete");
  await settle(rider.desktop, true);
  await rider.mobile.goto(`${ORIGIN}/complete?tripId=${tripId}`);
  await settle(rider.mobile, true);
  await shoot("rider-complete-complete", rider);

  await goto(bizPages, `/tracking?trip=${tripId}`, true);
  await shoot("biz-completed-tracking", biz);

  await goto(bizPages, "/dashboard");
  await shoot("biz-completed-dashboard", biz);

  await goto(bizPages, "/history");
  await shoot("biz-completed-history", biz);

  console.log("cleanup");
  await browser.close();
  rmSync(bizState, { force: true });
  rmSync(riderState, { force: true });
  const removed = await deleteE2EAccounts();
  console.log(`removed ${removed} capture account(s)`);
  console.log(`\n${shots} screenshots written to ${OUT}`);
}

function toForm(who: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  return {
    name: who.name,
    email: who.email,
    phone: who.phone,
    password: who.password,
  };
}

main().catch(async (error) => {
  console.error("\ncapture failed:", error.message);
  await deleteE2EAccounts().catch(() => {});
  process.exit(1);
});
