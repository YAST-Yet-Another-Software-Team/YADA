import { test as teardown } from "@playwright/test";

import { deleteE2EAccounts } from "./fixtures";

/**
 * Remove every account this suite created, and with it — by cascade — the
 * trips, events, declines and ratings hanging off them.
 *
 * Matches on the `yada-e2e-` email prefix, so nothing without that prefix can
 * be caught by it.
 */
teardown("remove the accounts this run created", async () => {
  const removed = await deleteE2EAccounts();
  console.log(`[e2e teardown] removed ${removed} test account(s)`);
});
