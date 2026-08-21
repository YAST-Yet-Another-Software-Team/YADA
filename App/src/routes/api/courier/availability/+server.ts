import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { z } from "zod";

import {
  apiError,
  apiRoute,
  emailUnverified,
  readJsonBody,
} from "$lib/server/api-guard";
import { setCourierAvailability } from "$lib/server/data/courier-profile";

const bodySchema = z.object({ online: z.boolean() });

/**
 * The courier's availability toggle, told to the server (SRS 2.2.2.3).
 *
 * The toggle used to live in localStorage alone, which meant the server had no
 * idea who was on shift — dispatch by distance needs to know. Going offline
 * must bite immediately: a location fix stays "fresh" for minutes, so without
 * this flag a courier who just clocked off would keep ringing until it aged
 * out.
 */
export const POST: RequestHandler = apiRoute(
  { role: "courier" },
  async ({ request }, user) => {
    const parsed = bodySchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return apiError(400, "invalid_request", "Send { online: boolean }.");
    }

    // Only going *on*. Refusing to take a courier offline would strand an
    // unverified account as available to dispatch with no way to stop it —
    // the opposite of what this gate is for.
    if (parsed.data.online && !user.emailVerified) {
      return emailUnverified("going online");
    }

    await setCourierAvailability(user.id, parsed.data.online);

    return json({ ok: true, online: parsed.data.online });
  },
);
