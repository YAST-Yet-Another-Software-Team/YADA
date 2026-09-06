import { expect, test as setup } from "@playwright/test";

import {
  assertDestructiveAllowed,
  BUSINESS,
  FORM_HEADERS,
  COURIER,
  ensureAuthDir,
  markEmailVerified,
  PICKUP,
  STORAGE,
} from "./fixtures";

/**
 * Provisioning for the journey: one business, one courier, both signed in and
 * both past the email gate.
 *
 * Accounts are created through the real `?/signup` action rather than by
 * inserting rows, so the journey is standing on the same validation, password
 * hashing and role clamping that a real sign-up goes through. The two things
 * done directly to the database are the two the app has no interface for:
 * marking an address verified without an inbox, and cleaning up afterwards.
 */

setup.beforeAll(() => {
  assertDestructiveAllowed();
  ensureAuthDir();
});

setup("provision the business", async ({ browser }) => {
  const context = await browser.newContext();

  const response = await context.request.post("/auth?/signup", {
    headers: FORM_HEADERS,
    form: {
      role: BUSINESS.role,
      name: BUSINESS.name,
      email: BUSINESS.email,
      phone: BUSINESS.phone,
      password: BUSINESS.password,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();

  // Sending a delivery is one of the two actions behind the soft email gate.
  await markEmailVerified(BUSINESS.email);

  // The dispatch address every request will leave from. Sign-up captures this
  // normally; the endpoint exists for exactly the case of setting it after.
  const profile = await context.request.put("/api/business/profile", {
    data: {
      address: "E2E Test Kitchen, Ayeduase",
      lat: PICKUP.lat,
      lng: PICKUP.lng,
    },
  });
  expect(profile.ok(), await profile.text()).toBeTruthy();

  await context.storageState({ path: STORAGE.business });
  await context.close();
});

setup("provision the courier", async ({ browser }) => {
  const context = await browser.newContext();

  const response = await context.request.post("/auth?/signup", {
    headers: FORM_HEADERS,
    form: {
      role: COURIER.role,
      name: COURIER.name,
      email: COURIER.email,
      phone: COURIER.phone,
      password: COURIER.password,
      plate: COURIER.plate,
      image: COURIER.image,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();

  // Going online is the other action behind the gate.
  await markEmailVerified(COURIER.email);

  await context.storageState({ path: STORAGE.courier });
  await context.close();
});
