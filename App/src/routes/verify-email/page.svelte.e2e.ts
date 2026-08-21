import { expect, test } from "@playwright/test";

/**
 * What is testable here without an inbox.
 *
 * A real confirmation click needs a token from a sent email, and the only
 * transport available in CI is the console one — whose output goes to the
 * preview server's stdout, not to anywhere a browser test can read. So these
 * assert the *shapes* the flows land in: the states a bad, missing or expired
 * token produces, and the one guarantee that needs no mail at all — that
 * asking for a reset never reveals whether an account exists.
 *
 * Capturing the console transport's output from the preview server would make
 * a true end-to-end pass possible. Worth doing, not worth blocking on.
 */

test("an expired confirmation link explains itself and offers another", async ({
  page,
}) => {
  await page.goto("/verify-email?verified=1&error=TOKEN_EXPIRED");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /doesn't work/i,
  );
  await expect(page.getByText(/expired/i)).toBeVisible();
});

test("a confirmed email says so", async ({ page }) => {
  await page.goto("/verify-email?verified=1");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /confirmed/i,
  );
});

test("reset-password without a token is a dead end, not a form", async ({
  page,
}) => {
  await page.goto("/reset-password");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /doesn't work/i,
  );
  await expect(page.locator('input[name="password"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /request a new link/i }),
  ).toBeVisible();
});

test("a junk reset token is rejected rather than redirecting to sign-in", async ({
  page,
}) => {
  await page.goto("/reset-password?token=not-a-real-token");

  await page.locator('input[name="password"]').fill("a-long-enough-password");
  await page.locator('input[name="confirm"]').fill("a-long-enough-password");
  await page.getByRole("button", { name: /save new password/i }).click();

  // Still here, with a complaint — a redirect to /auth?reset=done would mean
  // the token was accepted.
  await expect(page).toHaveURL(/\/reset-password/);
  await expect(page.getByRole("alert")).toBeVisible();
});

test("mismatched passwords are caught before the token is spent", async ({
  page,
}) => {
  await page.goto("/reset-password?token=not-a-real-token");

  await page.locator('input[name="password"]').fill("a-long-enough-password");
  await page.locator('input[name="confirm"]').fill("a-different-password");
  await page.getByRole("button", { name: /save new password/i }).click();

  await expect(page.getByRole("alert")).toContainText(/don't match/i);
});

test("a reset request answers the same for an address with no account", async ({
  page,
}) => {
  await page.goto("/auth?mode=reset");

  const nobody = `nobody-${Date.now()}@example.com`;
  await page.locator('input[name="email"]').fill(nobody);
  await page.getByRole("button", { name: /send reset link/i }).click();

  // The neutral answer, verbatim: anything that distinguished "sent" from "no
  // such account" would turn this form into an account-enumeration oracle.
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    /check your email/i,
  );
  await expect(
    page.getByText(new RegExp(`if an account exists for ${nobody}`, "i")),
  ).toBeVisible();
});
