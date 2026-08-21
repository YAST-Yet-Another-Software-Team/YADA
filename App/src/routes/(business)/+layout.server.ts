import { redirect } from "@sveltejs/kit";

import { accountCompletion } from "$lib/server/data/account";

/**
 * Gate for the whole business workspace — dashboard, request, tracking,
 * history. Signed-out visitors go to the sign-in page; signed-in couriers are
 * sent to their own home rather than shown an error.
 */
export async function load({ locals }) {
  const user = locals.user;

  if (!user) {
    redirect(303, "/auth");
  }

  if (user.role !== "business") {
    redirect(303, "/home");
  }

  // A Google sign-up never captured a phone number, and someone who closed the
  // tab on /welcome is in the same state. Sending them back is cheaper than
  // every screen downstream having to cope with a half-built account.
  const { complete } = await accountCompletion(user);
  if (!complete) {
    redirect(303, "/welcome");
  }

  return { user };
}
